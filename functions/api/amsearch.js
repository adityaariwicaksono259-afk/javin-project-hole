// /api/amsearch?q=keyword — cari video preset Alight Motion via keyword
// Wajib login. Parse SSE, ambil cuma final result.
import { getMe } from './chat/_lib.js';

const AMSEARCH_BASE = 'https://amfinder.web.id/api/search';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ ok: false, message: 'Method tidak diizinkan' }, 405);
  }

  const url = new URL(request.url);
  let q = (url.searchParams.get('q') || '').trim();
  if (!q && request.method === 'POST') {
    try { const body = await request.json(); q = String(body.q || '').trim(); } catch {}
  }

  if (!q) return json({ ok: false, message: 'Parameter "q" wajib.' }, 400);
  if (q.length > 100) return json({ ok: false, message: 'Query terlalu panjang (max 100).' }, 400);

  const db = env && env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap.' }, 503);

  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Login dulu untuk pakai fitur ini.' }, 401);
  if (me.banned) return json({ ok: false, message: 'Akun kamu sedang dibatasi.' }, 403);

  const started = Date.now();

  try {
    const res = await fetch(`${AMSEARCH_BASE}?q=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
        'Accept': 'text/event-stream',
        'Referer': 'https://amfinder.web.id/'
      }
    });

    if (!res.ok) {
      return json({ ok: false, message: `Amfinder HTTP ${res.status}`, elapsed_ms: Date.now() - started }, 502);
    }

    const text = await res.text();
    const result = parseSSEForFinal(text);
    if (!result) return json({ ok: false, message: 'Amfinder nggak kasih hasil.', elapsed_ms: Date.now() - started }, 502);

    return json({
      ok: true,
      query: result.query || q,
      candidates: result.candidates || 0,
      foundCount: result.foundCount || 0,
      videos: (result.videos || []).map(v => ({
        url: v.url,
        handle: v.handle,
        snippet: v.snippet,
        thumb: v.thumb,
        found: !!v.found,
        presetLinks: v.presetLinks || [],
        message: v.message || '',
        checked: v.checked || null
      })),
      elapsed_ms: Date.now() - started
    });
  } catch (err) {
    console.error('[AMSEARCH]', err.message);
    return json({ ok: false, message: 'Gagal menghubungi server.', elapsed_ms: Date.now() - started }, 500);
  }
}

function parseSSEForFinal(text) {
  const lines = text.split('\n');
  let currentEvent = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('event:')) currentEvent = line.slice(6).trim();
    else if (line.startsWith('data:') && currentEvent === 'result') {
      try {
        const raw = line.slice(5).trim();
        const jsonStr = (raw.startsWith('"') && raw.endsWith('"')) ? JSON.parse(raw) : raw;
        return JSON.parse(jsonStr);
      } catch(e) { console.error('[AMSEARCH-PARSE]', e.message); }
    }
  }
  return null;
}
