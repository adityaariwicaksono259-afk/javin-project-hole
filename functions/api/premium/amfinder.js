// POST /api/premium/amfinder
// Body: { uid, key, tiktokUrl }
// Verify key → cek quota → proxy ke amfinder.web.id → increment quota

const AMFINDER_BASE = 'https://amfinder.web.id/api/find';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function verifyKey(db, uid, key) {
  if (!db) return { ok: false, code: 503, message: 'DB belum di-bind.' };
  if (!uid) return { ok: false, code: 401, message: 'UID wajib.' };
  if (!key) return { ok: false, code: 401, message: 'Key wajib.' };

  const row = await db.prepare(
    'SELECT * FROM premium_keys WHERE owner_id = ? LIMIT 1'
  ).bind(uid).first();

  if (!row) return { ok: false, code: 403, message: 'Kamu belum punya key. Minta admin dulu.' };
  if (row.key !== key) return { ok: false, code: 403, message: 'Key tidak cocok dengan user ini.' };
  if (row.status === 'revoked') return { ok: false, code: 403, message: 'Key sudah di-revoke admin.' };
  if (row.status === 'exhausted' || row.used_count >= row.max_uses) {
    return { ok: false, code: 403, message: 'Key sudah habis (' + row.used_count + '/' + row.max_uses + ').' };
  }

  return { ok: true, row };
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
        const jsonStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
        return JSON.parse(jsonStr);
      } catch (e) { console.error('[PARSE]', e.message); }
    }
  }
  return null;
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;

  let body;
  try { body = await request.json(); } catch (e) {
    return json({ success: false, message: 'Body invalid.' }, 400);
  }

  const uid = String(body.uid || '').trim().slice(0, 40);
  const key = String(body.key || '').trim().toUpperCase();
  const tiktokUrl = String(body.tiktokUrl || '').trim();

  if (!tiktokUrl) {
    return json({ success: false, message: 'URL TikTok wajib.' }, 400);
  }
  if (!/tiktok\.com/i.test(tiktokUrl)) {
    return json({ success: false, message: 'URL harus dari TikTok.' }, 400);
  }

  // ==== Verify key ====
  const v = await verifyKey(db, uid, key);
  if (!v.ok) return json({ success: false, message: v.message }, v.code);

  // ==== Proxy ke amfinder ====
  const started = Date.now();
  let result;
  try {
    const res = await fetch(`${AMFINDER_BASE}?url=${encodeURIComponent(tiktokUrl)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
        'Accept': 'text/event-stream',
        'Referer': 'https://amfinder.web.id/',
      },
    });

    if (!res.ok) {
      return json({ success: false, message: `Amfinder HTTP ${res.status}` }, 502);
    }

    const text = await res.text();
    result = parseSSE(text);
  } catch (err) {
    return json({ success: false, message: 'Gagal hubungi amfinder: ' + err.message }, 502);
  }

  const elapsed = Date.now() - started;

  if (!result || !result.ok) {
    // NGGAK increment kuota kalau gagal
    return json({
      success: false,
      message: 'Preset nggak ketemu atau amfinder error.',
      elapsed_ms: elapsed,
      found: false
    });
  }

  // ==== Increment counter HANYA kalau sukses ====
  let counterInfo = null;
  try {
    const newCount = (v.row.used_count || 0) + 1;
    const newStatus = newCount >= v.row.max_uses ? 'exhausted' : 'active';

    await db.prepare(
      'UPDATE premium_keys SET used_count = ?, status = ?, last_used = ? WHERE key = ?'
    ).bind(newCount, newStatus, Date.now(), key).run();

    counterInfo = {
      used: newCount,
      max: v.row.max_uses,
      remaining: Math.max(0, v.row.max_uses - newCount),
      status: newStatus
    };
  } catch (e) {
    counterInfo = { error: e.message };
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
