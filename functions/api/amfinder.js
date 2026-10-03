// functions/api/amfinder.js — Simple proxy ke amfinder.web.id
// Nggak ada cache, langsung forward + parse SSE

const AMFINDER_BASE = 'https://amfinder.web.id/api/find';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }});
}

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }});
  }

  const url = new URL(request.url);
  let tiktokUrl = url.searchParams.get('url');

  if (!tiktokUrl && request.method === 'POST') {
    try { const body = await request.json(); tiktokUrl = body.url; } catch {}
  }

  if (!tiktokUrl) {
    return json({ status: 'error', code: 'MISSING_URL', message: 'Parameter "url" wajib.' }, 400);
  }

  if (!/tiktok\.com/i.test(tiktokUrl)) {
    return json({ status: 'error', code: 'INVALID_URL', message: 'URL harus dari TikTok.' }, 400);
  }

  const started = Date.now();

  try {
    const res = await fetch(`${AMFINDER_BASE}?url=${encodeURIComponent(tiktokUrl)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
        'Accept': 'text/event-stream',
        'Referer': 'https://amfinder.web.id/',
      },
    });

    if (!res.ok) {
      return json({
        status: 'error',
        code: 'UPSTREAM_ERROR',
        message: `Amfinder HTTP ${res.status}`,
      }, 502);
    }

    const text = await res.text();
    const result = parseSSE(text);
    const elapsed = Date.now() - started;

    if (!result) {
      return json({
        status: 'error',
        code: 'NO_RESULT',
        message: 'Amfinder nggak kasih hasil.',
        elapsed_ms: elapsed,
        raw_preview: text.slice(0, 300),
      }, 502);
    }

    return json({ status: 'ok', ...result, elapsed_ms: elapsed });

  } catch (err) {
    return json({
      status: 'error',
      code: 'FETCH_FAILED',
      message: err.message,
      elapsed_ms: Date.now() - started,
    }, 500);
  }
}

function parseSSE(text) {
  const lines = text.split('\n');
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith('data:') && currentEvent === 'result') {
      try {
        const raw = line.slice(5).trim();
        const jsonStr = raw.startsWith('"') && raw.endsWith('"')
          ? JSON.parse(raw)
          : raw;
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error('[PARSE]', e.message);
      }
    }
  }
  return null;
}
