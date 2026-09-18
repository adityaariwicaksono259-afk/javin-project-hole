// Cloudflare Pages Function: /api/proxy
import endpointsData from '../data/endpoints.json';

const ALLOWED_HOSTS = new Set([
  'api.nexadev.my.id',
  'apii.nexadev.my.id',
  'api.nexaadev.my.id',
  'clooud.my.id'
]);

const MAX_BODY = 6 * 1024 * 1024;
const DEFAULT_LIMIT = 10;

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

function extractHost(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname;
  } catch (e) {
    return null;
  }
}

async function sha256hex(text) {
  const buf = new TextEncoder().encode(text);
  const h = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0')}).join('');
}

async function logRequest(db, data) {
  if (!db) return;
  try {
    await db.prepare(
      'INSERT INTO logs (user_id, endpoint_id, status, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(data.user_id, data.endpoint_id, data.status, data.ip_hash, Date.now()).run();
  } catch (e) {}
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

  // ==== Cek limit user via D1 ====
  const db = env.JAVIN_DB;
  let userRow = null;

  if (userId && db) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    try {
      userRow = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

      // Hitung request hari ini
      const countRow = await db.prepare(
        'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND created_at >= ?'
      ).bind(userId, todayStart.getTime()).first();

      const usedToday = (countRow && countRow.c) || 0;
      const limit = DEFAULT_LIMIT + ((userRow && userRow.extra_limit) || 0);

      if (usedToday >= limit) {
        await logRequest(db, {
          user_id: userId,
          endpoint_id: id,
          status: 429,
          ip_hash: '',
        });
        return jsonRes(429, {
          ok: false,
          message: 'Limit harian tercapai (' + usedToday + '/' + limit + '). Coba lagi besok.'
        });
      }

      // Update user record
      const now = Date.now();
      if (!userRow) {
        await db.prepare(
          'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, 0, ?, ?, 1)'
        ).bind(userId, now, now).run();
      } else {
        await db.prepare(
          'UPDATE users SET last_seen = ?, total_request = total_request + 1 WHERE id = ?'
        ).bind(now, userId).run();
      }
    } catch (e) {
      // DB error → lanjut aja (fail-open)
    }
  }

  // ==== Cari endpoint ====
  const ep = endpointsData.find(function (x) { return x.catalogId === id; });
  if (!ep) {
    await logRequest(db, { user_id: userId, endpoint_id: id, status: 404, ip_hash: '' });
    return jsonRes(404, { ok: false, message: 'Endpoint tidak ditemukan.' });
  }

  let host = null;
  if (ep.ex) {
    const exClean = ep.ex.indexOf('http') === 0 ? ep.ex : 'https://' + ep.ex;
    host = extractHost(exClean);
  }
  if (!host) host = 'api.nexadev.my.id';

  if (!ALLOWED_HOSTS.has(host)) {
    await logRequest(db, { user_id: userId, endpoint_id: id, status: 403, ip_hash: '' });
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
      if (p.r) {
        return jsonRes(400, { ok: false, message: 'Parameter ' + name + ' wajib diisi.' });
      }
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
      await logRequest(db, { user_id: userId, endpoint_id: id, status: 502, ip_hash: '' });
      return jsonRes(502, { ok: false, message: 'Response terlalu besar.' });
    }

    await logRequest(db, {
      user_id: userId,
      endpoint_id: id,
      status: upstream.status,
      ip_hash: ''
    });

    const ct = upstream.headers.get('content-type') || 'application/octet-stream';
    return new Response(buf, {
      status: upstream.status,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err) {
    await logRequest(db, { user_id: userId, endpoint_id: id, status: 502, ip_hash: '' });
    return jsonRes(502, { ok: false, message: 'Gagal mengambil data. Coba lagi.' });
  }
}
