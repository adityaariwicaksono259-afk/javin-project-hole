// POST /api/premium/amprem
// Body: { uid, key, action, ... }
// Counter increment HANYA kalau action=apply-premium sukses.

const UPSTREAM = 'https://anita-studio.netlify.app/.netlify/functions/amprem';

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
  const remaining = Math.max(0, (row.max_uses || 0) - (row.used_count || 0));

  if (row.status === 'exhausted' || remaining < 10) {
    return { ok: false, code: 403, message: 'API Key tidak cukup' };
  }

  return { ok: true, row: row, remaining: remaining };
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;

  let body;
  try { body = await request.json(); } catch (e) { return json({ success: false, message: 'Body invalid.' }, 400); }

  const uid = String(body.uid || '').trim().slice(0, 40);
  const key = String(body.key || '').trim().toUpperCase();
  const action = String(body.action || '').trim();
  const allowed = ['send-magiclink', 'verify-account', 'apply-premium'];

  if (!allowed.includes(action)) {
    return json({ success: false, message: 'Action tidak dikenal.' }, 400);
  }

  // ==== Verify key ====
  const v = await verifyKey(db, uid, key);
  if (!v.ok) return json({ success: false, message: v.message }, v.code);

  // ==== Validasi body ====
  const email = String(body.email || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ success: false, message: 'Email tidak valid.' }, 400);
  }
  if (action === 'verify-account') {
    const rawLink = String(body.rawLink || '').trim();
    if (!rawLink || rawLink.length < 10) return json({ success: false, message: 'Magic link tidak valid.' }, 400);
    if (rawLink.length > 5000) return json({ success: false, message: 'Magic link terlalu panjang.' }, 400);
  }
  if (action === 'apply-premium') {
    const idToken = String(body.idToken || '').trim();
    if (!idToken || idToken.length < 10) return json({ success: false, message: 'idToken tidak valid.' }, 400);
  }

  // ==== Forward ke upstream ====
  try {
    const payload = { action, email };
    if (body.rawLink) payload.rawLink = String(body.rawLink).trim();
    if (body.idToken) payload.idToken = String(body.idToken).trim();

    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        'Referer': 'https://anita-studio.netlify.app/',
        'Origin': 'https://anita-studio.netlify.app'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { data = { success: false, message: 'Upstream response bukan JSON', raw: text.slice(0, 500) }; }

    // ==== Potong 10 API Key untuk setiap request yang SUKSES ====
    if (data && data.success === true) {
      try {
        const cost = 10;
        const oldCount = v.row.used_count || 0;
        const newCount = oldCount + cost;

        const updated = await db.prepare(
          'UPDATE premium_keys SET used_count = ?, status = ?, last_used = ? WHERE key = ? AND owner_id = ? AND used_count = ? AND used_count + ? <= max_uses'
        ).bind(
          newCount,
          newCount >= v.row.max_uses ? 'exhausted' : 'active',
          Date.now(),
          key,
          uid,
          oldCount,
          cost
        ).run();

        if (!updated.meta || updated.meta.changes !== 1) {
          return json({ success: false, message: 'API Key tidak cukup' }, 403);
        }

        data._counter = {
          cost: cost,
          used: newCount,
          max: v.row.max_uses,
          remaining: Math.max(0, v.row.max_uses - newCount),
          status: newCount >= v.row.max_uses ? 'exhausted' : 'active'
        };
      } catch (e) {
        return json({ success: false, message: 'Gagal memproses API Key.' }, 500);
      }
    }

    return json(data, upstream.status);
  } catch (err) {
    return json({ success: false, message: 'Gagal menghubungi server: ' + err.message }, 502);
  }
}
