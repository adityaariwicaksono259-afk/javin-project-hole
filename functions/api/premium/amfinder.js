// POST /api/premium/amfinder
// Body: { key, tiktokUrl }
// Verify API key → cek quota → proxy ke amfinder.web.id → increment quota.

const AMFINDER_BASE = 'https://amfinder.web.id/api/find';

const ALLOWED_ORIGINS = [
  'https://jvin.pages.dev',
  'https://javin-cf.pages.dev',
];

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

async function verifyKey(db, key) {
  if (!db) {
    return {
      ok: false,
      code: 503,
      message: 'DB belum di-bind.'
    };
  }

  if (!key) {
    return {
      ok: false,
      code: 401,
      message: 'API Key wajib.'
    };
  }

  const row = await db.prepare(
    'SELECT * FROM premium_keys WHERE key = ? LIMIT 1'
  ).bind(key).first();

  if (!row) {
    return {
      ok: false,
      code: 403,
      message: 'API Key tidak ditemukan.'
    };
  }

  if (row.status === 'revoked') {
    return {
      ok: false,
      code: 403,
      message: 'API Key sudah di-revoke admin.'
    };
  }

  const remaining = Math.max(
    0,
    (row.max_uses || 0) - (row.used_count || 0)
  );

  if (row.status === 'exhausted' || remaining < 1) {
    return {
      ok: false,
      code: 403,
      message: 'API Key tidak cukup'
    };
  }

  return {
    ok: true,
    row,
    remaining
  };
}

function checkOrigin(request) {
  const origin = request.headers.get('Origin') ||
    request.headers.get('Referer') ||
    '';

  if (!origin) return { ok: true };

  const allowed = ALLOWED_ORIGINS.some(function(a) {
    return origin.startsWith(a);
  });

  if (
    allowed ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  ) {
    return { ok: true };
  }

  return {
    ok: false,
    message: 'Origin nggak diizinkan.'
  };
}

function parseSSE(text) {
  const lines = text.split('\n');
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
    } else if (
      line.startsWith('data:') &&
      currentEvent === 'result'
    ) {
      try {
        const raw = line.slice(5).trim();
        const jsonStr =
          raw.startsWith('"') && raw.endsWith('"')
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

export async function onRequestGet() {
  return json({
    success: false,
    message: 'Method not allowed. Gunakan POST.'
  }, 405);
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;

  let body;

  try {
    body = await request.json();
  } catch (e) {
    return json({
      success: false,
      message: 'Body invalid.'
    }, 400);
  }

  const key = String(body.key || '')
    .trim()
    .toUpperCase();

  const tiktokUrl = String(body.tiktokUrl || '').trim();

  if (!key) {
    return json({
      success: false,
      message: 'API Key wajib.'
    }, 401);
  }

  if (!tiktokUrl) {
    return json({
      success: false,
      message: 'URL TikTok wajib.'
    }, 400);
  }

  if (!/tiktok\.com/i.test(tiktokUrl)) {
    return json({
      success: false,
      message: 'URL harus dari TikTok.'
    }, 400);
  }

  const originCheck = checkOrigin(request);

  if (!originCheck.ok) {
    return json({
      success: false,
      message: originCheck.message
    }, 403);
  }

  const v = await verifyKey(db, key);

  if (!v.ok) {
    return json({
      success: false,
      message: v.message
    }, v.code);
  }

  const started = Date.now();
  let result;

  try {
    const res = await fetch(
      `${AMFINDER_BASE}?url=${encodeURIComponent(tiktokUrl)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
          'Accept': 'text/event-stream',
          'Referer': 'https://amfinder.web.id/',
        },
      }
    );

    if (!res.ok) {
      return json({
        success: false,
        message: `Amfinder HTTP ${res.status}`
      }, 502);
    }

    const text = await res.text();
    result = parseSSE(text);
  } catch (err) {
    return json({
      success: false,
      message: 'Gagal hubungi amfinder: ' + err.message
    }, 502);
  }

  const elapsed = Date.now() - started;

  if (!result || !result.ok) {
    return json({
      success: false,
      message: 'Preset nggak ketemu atau amfinder error.',
      elapsed_ms: elapsed,
      found: false
    });
  }

  // Potong 1 API Key hanya kalau sukses.
  let counterInfo = null;

  try {
    const cost = 1;
    const oldCount = v.row.used_count || 0;
    const newCount = oldCount + cost;

    const updated = await db.prepare(
      'UPDATE premium_keys SET used_count = ?, status = ?, last_used = ? WHERE key = ? AND used_count = ? AND used_count + ? <= max_uses'
    ).bind(
      newCount,
      newCount >= v.row.max_uses ? 'exhausted' : 'active',
      Date.now(),
      key,
      oldCount,
      cost
    ).run();

    if (!updated.meta || updated.meta.changes !== 1) {
      return json({
        success: false,
        message: 'API Key tidak cukup'
      }, 403);
    }

    counterInfo = {
      cost,
      used: newCount,
      max: v.row.max_uses,
      remaining: Math.max(0, v.row.max_uses - newCount),
      status: newCount >= v.row.max_uses
        ? 'exhausted'
        : 'active'
    };
  } catch (e) {
    return json({
      success: false,
      message: 'Gagal memproses API Key.'
    }, 500);
  }

  return json({
    success: true,
    found: result.found,
    presetLinks: result.presetLinks || [],
    author: result.author,
    video: result.video ? {
      id: result.video.id,
      url: result.video.url,
      description: result.video.description,
      stats: result.video.stats,
      cover: result.video.cover
    } : null,
    authorDetail: result.authorDetail ? {
      uniqueId: result.authorDetail.uniqueId,
      nickname: result.authorDetail.nickname,
      avatar: result.authorDetail.avatar
    } : null,
    scanned: result.scanned,
    elapsed_ms: elapsed,
    _counter: counterInfo
  });
}
