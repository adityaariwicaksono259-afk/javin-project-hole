// /api/proxy-ext — proxy endpoint bot ke upstream
// Baca entry dari endpoints.json, forward dengan headers browser asli.
import { getMe } from './chat/_lib.js';
import { browserHeaders, jsonHeaders, allUAs } from '../_lib/ua-pool.js';

const ENDPOINTS_URL = 'https://raw.githubusercontent.com/adityaariwicaksono259-afk/javin-project-hole/main/public/endpoints.json';

// Cache endpoints 5 menit di memory
let EP_CACHE = { data: null, ts: 0 };
const EP_TTL = 5 * 60 * 1000;

async function loadEndpoints() {
  const now = Date.now();
  if (EP_CACHE.data && (now - EP_CACHE.ts) < EP_TTL) return EP_CACHE.data;

  // Coba fetch dari raw github (biar selalu fresh)
  try {
    const r = await fetch(ENDPOINTS_URL, { cf: { cacheTtl: 60 } });
    if (r.ok) {
      const data = await r.json();
      EP_CACHE.data = data;
      EP_CACHE.ts = now;
      return data;
    }
  } catch (e) {}

  // Fallback: baca dari file lokal (kalau ada)
  try {
    const r = await fetch(new URL('/endpoints.json', 'https://jvin.pages.dev'));
    if (r.ok) {
      const data = await r.json();
      EP_CACHE.data = data;
      EP_CACHE.ts = now;
      return data;
    }
  } catch (e) {}

  return EP_CACHE.data || [];
}

function findEp(data, id) {
  for (const ep of data) {
    if (ep && typeof ep === 'object') {
      if ((ep.catalogId || '').toLowerCase() === String(id).toLowerCase()) return ep;
    }
  }
  return null;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, corsHeaders())
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return onRequestOptions();

  const url = new URL(request.url);

  // Ambil catalogId — bisa dari path (/api/proxy-ext/bot-xxx) atau query (?id=bot-xxx)
  let epId = url.searchParams.get('id') || '';
  if (!epId) {
    const parts = url.pathname.split('/').filter(Boolean);
    epId = parts[parts.length - 1];
    if (epId === 'proxy-ext') epId = '';
  }
  if (!epId) return jsonResp({ ok: false, message: 'Parameter "id" wajib.' }, 400);

  // Wajib login
  const db = env && env.JAVIN_DB;
  if (!db) return jsonResp({ ok: false, message: 'DB nggak siap.' }, 503);
  const me = await getMe(request, db);
  if (!me) return jsonResp({ ok: false, message: 'Login dulu.' }, 401);
  if (me.banned) return jsonResp({ ok: false, message: 'Akun diblokir.' }, 403);

  // Load endpoints
  const list = await loadEndpoints();
  if (!Array.isArray(list) || !list.length) {
    return jsonResp({ ok: false, message: 'Gagal load endpoints.' }, 500);
  }

  const ep = findEp(list, epId);
  if (!ep) return jsonResp({ ok: false, message: 'Endpoint tidak ditemukan: ' + epId }, 404);
  if (ep.hidden) return jsonResp({ ok: false, message: 'Endpoint sedang dinonaktifkan.' }, 403);

  const upstream = ep.upstream;
  if (!upstream || !/^https?:\/\//i.test(upstream)) {
    return jsonResp({ ok: false, message: 'Upstream URL invalid.' }, 500);
  }

  // Ambil params dari query (GET) atau body (POST)
  let params = {};
  const skipKeys = ['id'];
  for (const [k, v] of url.searchParams) {
    if (!skipKeys.includes(k)) params[k] = v;
  }

  if (request.method === 'POST') {
    const ct = request.headers.get('Content-Type') || '';
    try {
      if (ct.includes('application/json')) {
        const body = await request.json();
        params = Object.assign({}, params, body);
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const fd = await request.formData();
        for (const [k, v] of fd) params[k] = v;
      }
    } catch (e) {}
  }

  // Build upstream URL
  let targetUrl = upstream;
  const method = (ep.m || 'GET').toUpperCase();

  if (method === 'GET') {
    // Cuma append param yang di-declare di ep.params (biar nggak asal)
    const declaredParams = (ep.params || []).map(p => p.n);
    const useParams = declaredParams.length > 0
      ? Object.keys(params).filter(k => declaredParams.includes(k))
      : Object.keys(params);

    if (useParams.length > 0) {
      const u = new URL(upstream);
      useParams.forEach(k => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          u.searchParams.set(k, String(params[k]));
        }
      });
      targetUrl = u.toString();
    }
  }

  const started = Date.now();

  // Build headers
  const headers = browserHeaders(upstream);

  // Forward cookies user (kadang upstream butuh)
  const cookie = request.headers.get('Cookie') || '';
  if (cookie) headers['Cookie'] = cookie;

  // Kalau POST, kirim body sebagai JSON
  let fetchInit = {
    method,
    headers,
    redirect: 'follow'
  };

  if (method === 'POST') {
    const declaredParams = (ep.params || []).map(p => p.n);
    const sendParams = {};
    Object.keys(params).forEach(k => {
      if (!declaredParams.length || declaredParams.includes(k)) {
        sendParams[k] = params[k];
      }
    });
    fetchInit.body = JSON.stringify(sendParams);
    fetchInit.headers['Content-Type'] = 'application/json';
  }

  // Retry 3x dengan UA beda kalau kena block
  const uas = allUAs();
  const maxAttempts = 3;
  let lastErr = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      fetchInit.headers['User-Agent'] = uas[attempt % uas.length];

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000); // 30s timeout
      fetchInit.signal = controller.signal;

      const res = await fetch(targetUrl, fetchInit);
      clearTimeout(timer);

      const ct = res.headers.get('Content-Type') || '';
      const elapsed = Date.now() - started;

      // Kalau 4xx (400-499) → coba lagi kalau masih ada attempt
      if (res.status >= 400 && res.status < 500 && attempt < maxAttempts - 1) {
        lastErr = 'HTTP ' + res.status;
        // Khusus 429 (rate limit) → break aja, nggak guna retry cepet
        if (res.status === 429) break;
        continue;
      }

      // ==== Success atau error final ====

      // Kalau response binary (image/video/audio) → forward langsung
      if (ct.startsWith('image/') || ct.startsWith('video/') || ct.startsWith('audio/') || ct.includes('octet-stream')) {
        const buf = await res.arrayBuffer();
        return new Response(buf, {
          status: res.status,
          headers: {
            'Content-Type': ct,
            'Cache-Control': 'public, max-age=300',
            'X-Upstream-Status': String(res.status),
            'X-Elapsed-Ms': String(elapsed)
          }
        });
      }

      // Kalau JSON → parse & return sebagai JSON
      if (ct.includes('application/json') || ct.includes('text/json')) {
        try {
          const j = await res.json();
          return jsonResp({
            ok: res.status >= 200 && res.status < 300,
            status: res.status,
            elapsed_ms: elapsed,
            upstream_url: targetUrl,
            data: j
          }, res.status >= 400 ? 200 : 200); // Tetap 200 biar frontend bisa handle
        } catch (e) {
          lastErr = 'JSON parse error';
          continue;
        }
      }

      // Kalau text/HTML → return sebagai text
      const text = await res.text();
      return jsonResp({
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        elapsed_ms: elapsed,
        upstream_url: targetUrl,
        content_type: ct,
        text: text.slice(0, 100000) // max 100KB
      }, 200);

    } catch (e) {
      lastErr = e.message || 'unknown';
      // Kalau timeout/network, coba attempt berikutnya
      if (attempt < maxAttempts - 1) continue;
    }
  }

  // Semua attempt gagal
  return jsonResp({
    ok: false,
    message: 'Gagal akses upstream setelah 3 percobaan.',
    last_error: lastErr,
    upstream_url: targetUrl,
    elapsed_ms: Date.now() - started
  }, 502);
}
