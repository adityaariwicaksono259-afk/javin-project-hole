// Cloudflare Pages Function: /api/proxy
import endpointsData from '../data/endpoints.json';

const ALLOWED_HOSTS = new Set([
  'api.nexadev.my.id',
  'apii.nexadev.my.id',
  'api.nexaadev.my.id',
  'clooud.my.id'
]);

const MAX_BODY = 6 * 1024 * 1024;
const DEFAULT_LIMIT = 15;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function jsonRes(status, data) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function getWibDayStartMs() {
  const nowWib = Date.now() + WIB_OFFSET_MS;
  const dayWib = Math.floor(nowWib / 86400000) * 86400000;
  return dayWib - WIB_OFFSET_MS;
}

function msUntilWibReset() {
  const nextDay = getWibDayStartMs() + 86400000;
  return Math.max(0, nextDay - Date.now());
}

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return h + ' jam ' + m + ' menit';
  return m + ' menit';
}

function extractHost(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname;
  } catch (e) {
    return null;
  }
}

function sanitizeText(t) {
  if (typeof t !== 'string') return t;
  return t
    .replace(/NexaDev/g, 'Javin')
    .replace(/\bNEXA\b/g, 'JAVIN')
    .replace(/\bNexa\b/g, 'Javin')
    .replace(/\bnexa\b/g, 'javin');
}

function sanitizeJson(obj, depth) {
  if (depth > 12) return obj;
  if (typeof obj === 'string') return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(function (x) { return sanitizeJson(x, depth + 1); });
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k in obj) {
      out[k] = sanitizeJson(obj[k], depth + 1);
    }
    return out;
  }
  return obj;
}

async function logRequest(db, data) {
  if (!db) return;
  try {
    await db.prepare(
      'INSERT INTO logs (user_id, endpoint_id, status, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(data.user_id, data.endpoint_id, data.status, '', Date.now()).run();
  } catch (e) {}
}

async function getUserStatus(db, userId) {
  const todayStart = getWibDayStartMs();
  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  const countRow = await db.prepare(
    'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND created_at >= ? AND status >= 200 AND status < 300'
  ).bind(userId, todayStart).first();
  const used = (countRow && countRow.c) || 0;
  let limit = DEFAULT_LIMIT;
  if (userRow && typeof userRow.extra_limit === 'number' && userRow.extra_limit > 0) {
    limit = userRow.extra_limit;
  }
  return { used: used, limit: limit, remaining: Math.max(0, limit - used) };
}

export async function onRequest(context) {
  const request = context.request;
  const env = context.env;

  if (request.method !== 'GET') {
    return jsonRes(405, { ok: false, message: 'Method not allowed' });
  }

  const reqUrl = new URL(request.url);
  const userId = String(reqUrl.searchParams.get('uid') || '').trim().slice(0, 40);
  const id = String(reqUrl.searchParams.get('id') || '');

  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) {
    return jsonRes(400, { ok: false, message: 'Endpoint tidak valid.' });
  }

  const db = env.JAVIN_DB;

  // ==== Cek limit user ====
  if (userId && db) {
    try {
      const status = await getUserStatus(db, userId);

      if (status.used >= status.limit) {
        const remaining = msUntilWibReset();
        await logRequest(db, { user_id: userId, endpoint_id: id, status: 429 });
        return jsonRes(429, {
          ok: false,
          message: 'Limit harian habis (' + status.used + '/' + status.limit + '). Reset dalam ' + formatDuration(remaining) + ' (00:00 WIB).',
          limit: status.limit,
          used: status.used,
          reset_in_ms: remaining
        });
      }

      const now = Date.now();
      const userRow = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
      if (!userRow) {
        await db.prepare(
          'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, 0, ?, ?, 0)'
        ).bind(userId, now, now).run();
      } else {
        await db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(now, userId).run();
      }
    } catch (e) {
      // fail-open
    }
  }

  // ==== Cari endpoint ====
  const ep = endpointsData.find(function (x) { return x.catalogId === id; });
  if (!ep) {
    await logRequest(db, { user_id: userId, endpoint_id: id, status: 404 });
    return jsonRes(404, { ok: false, message: 'Endpoint tidak ditemukan.' });
  }

  let host = null;
  if (ep.ex) {
    const exClean = ep.ex.indexOf('http') === 0 ? ep.ex : 'https://' + ep.ex;
    host = extractHost(exClean);
  }
  if (!host) host = 'api.nexadev.my.id';

  if (!ALLOWED_HOSTS.has(host)) {
    await logRequest(db, { user_id: userId, endpoint_id: id, status: 403 });
    return jsonRes(403, { ok: false, message: 'Endpoint tidak tersedia.' });
  }

  const target = new URL(ep.path || '/', 'https://' + host);
  const params = ep.params || [];
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    const name = String(p.n || '').trim();
    if (!name || name === 'key') continue;
    const value = reqUrl.searchParams.get(name);
    if (value === null || value === '') {
      if (p.r) return jsonRes(400, { ok: false, message: 'Parameter ' + name + ' wajib diisi.' });
      continue;
    }
    if (String(value).length > 2000) {
      return jsonRes(413, { ok: false, message: 'Parameter ' + name + ' terlalu panjang.' });
    }
    target.searchParams.set(name, String(value));
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
      }
    });

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BODY) {
      await logRequest(db, { user_id: userId, endpoint_id: id, status: 502 });
      return jsonRes(502, { ok: false, message: 'Response terlalu besar.' });
    }

    // Log dengan status upstream — hanya 2xx yang dihitung ke limit
    await logRequest(db, { user_id: userId, endpoint_id: id, status: upstream.status });

    const ct = upstream.headers.get('content-type') || 'application/octet-stream';

    // Sanitize JSON response (replace Nexa → Javin di string value)
    if (ct.indexOf('application/json') !== -1) {
      try {
        const txt = new TextDecoder().decode(buf);
        const parsed = JSON.parse(txt);
        const clean = sanitizeJson(parsed, 0);
        return new Response(JSON.stringify(clean), {
          status: upstream.status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      } catch (e) {
        // bukan JSON valid, biarin raw
      }
    }

    return new Response(buf, {
      status: upstream.status,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err) {
    await logRequest(db, { user_id: userId, endpoint_id: id, status: 502 });
    return jsonRes(502, { ok: false, message: 'Gagal mengambil data. Coba lagi.' });
  }
}
