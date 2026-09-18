// Cloudflare Pages Function: /api/proxy
import endpointsData from '../data/endpoints.json';

const ALLOWED_HOSTS = new Set([
  'api.nexadev.my.id',
  'apii.nexadev.my.id',
  'api.nexaadev.my.id',
  'clooud.my.id'
]);

const MAX_BODY = 6 * 1024 * 1024;
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

const buckets = new Map();

function clientKey(request) {
  const ip = request.headers.get('CF-Connecting-IP')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown';
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash + ip.charCodeAt(i)) | 0;
  }
  return 'k_' + (hash >>> 0).toString(16);
}

function isLimited(key) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now - b.start >= WINDOW_MS) {
    b = { start: now, count: 0 };
  }
  b.count += 1;
  buckets.set(key, b);
  return b.count > MAX_REQUESTS_PER_WINDOW;
}

function jsonRes(status, data) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
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

function sanitizeResponse(text) {
  return text
    .replace(/NexaDev/g, 'Javin')
    .replace(/"author"\s*:\s*"Nexa"/gi, '"author":"Javin"')
    .replace(/https?:\/\/(api\.|apii\.)?nexadev\.my\.id/gi, 'https://javin.api')
    .replace(/https?:\/\/api\.nexaadev\.my\.id/gi, 'https://javin.api')
    .replace(/https?:\/\/clooud\.my\.id/gi, 'https://javin.cdn')
    .replace(/(api\.|apii\.)?nexadev\.my\.id/gi, 'javin.api')
    .replace(/api\.nexaadev\.my\.id/gi, 'javin.api')
    .replace(/clooud\.my\.id/gi, 'javin.cdn');
}

export async function onRequest(context) {
  const request = context.request;

  if (request.method !== 'GET') {
    return jsonRes(405, { ok: false, message: 'Method not allowed' });
  }

  if (isLimited(clientKey(request))) {
    return jsonRes(429, { ok: false, message: 'Terlalu banyak request. Coba lagi sebentar.' });
  }

  const reqUrl = new URL(request.url);
  const id = String(reqUrl.searchParams.get('id') || '');

  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) {
    return jsonRes(400, { ok: false, message: 'Endpoint tidak valid.' });
  }

  const ep = endpointsData.find(function (x) { return x.catalogId === id; });
  if (!ep) {
    return jsonRes(404, { ok: false, message: 'Endpoint tidak ditemukan.' });
  }

  let host = null;
  if (ep.ex) {
    const exClean = ep.ex.indexOf('http') === 0 ? ep.ex : 'https://' + ep.ex;
    host = extractHost(exClean);
  }
  if (!host) host = 'api.nexadev.my.id';

  if (!ALLOWED_HOSTS.has(host)) {
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
      return jsonRes(502, { ok: false, message: 'Response terlalu besar.' });
    }

    const ct = upstream.headers.get('content-type') || 'application/octet-stream';

    if (ct.indexOf('application/json') !== -1) {
      try {
        const txt = new TextDecoder().decode(buf);
        const clean = sanitizeResponse(txt);
        return new Response(clean, {
          status: upstream.status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      } catch (e) {
        // fallthrough
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
    return jsonRes(502, { ok: false, message: 'Gagal mengambil data. Coba lagi.' });
  }
}
