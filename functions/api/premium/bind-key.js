// POST /api/premium/bind-key  body: { uid, key }
// GET  /api/premium/bind-key?uid=JH-XXXX   → cek status

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  const url = new URL(request.url);
  const uid = String(url.searchParams.get('uid') || '').trim().slice(0, 40);
  if (!uid) return json({ ok: false, message: 'UID wajib.' }, 400);

  try {
    const row = await db.prepare(
      'SELECT key, label, max_uses, used_count, status FROM premium_keys WHERE owner_id = ? LIMIT 1'
    ).bind(uid).first();

    if (!row) return json({ ok: true, has_key: false });

    return json({
      ok: true,
      has_key: true,
      key: row.key,
      label: row.label,
      max_uses: row.max_uses,
      used_count: row.used_count,
      remaining: Math.max(0, row.max_uses - row.used_count),
      status: row.status
    });
  } catch (e) {
    return json({ ok: false, message: 'DB error: ' + e.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, message: 'Body invalid.' }, 400); }

  const uid = String(body.uid || '').trim().slice(0, 40);
  const key = String(body.key || '').trim().toUpperCase();

  if (!uid) return json({ ok: false, message: 'UID wajib.' }, 400);
  if (!/^JV-\d{4}$/.test(key)) return json({ ok: false, message: 'Format key tidak valid (contoh: JV-1918).' }, 400);

  try {
    // Cek user udah punya key atau belum
    const existing = await db.prepare(
      'SELECT key FROM premium_keys WHERE owner_id = ? LIMIT 1'
    ).bind(uid).first();

    if (existing) {
      return json({ ok: false, message: 'User ini sudah punya key: ' + existing.key }, 400);
    }

    // Cek key ada + status
    const keyRow = await db.prepare('SELECT * FROM premium_keys WHERE key = ?').bind(key).first();
    if (!keyRow) return json({ ok: false, message: 'Key tidak ditemukan.' }, 404);
    if (keyRow.status !== 'active') return json({ ok: false, message: 'Key tidak aktif (status: ' + keyRow.status + ').' }, 403);
    if (keyRow.owner_id && keyRow.owner_id !== uid) return json({ ok: false, message: 'Key sudah dipakai user lain.' }, 403);
    if (keyRow.used_count >= keyRow.max_uses) {
      await db.prepare('UPDATE premium_keys SET status = "exhausted" WHERE key = ?').bind(key).run();
      return json({ ok: false, message: 'Key sudah habis (' + keyRow.used_count + '/' + keyRow.max_uses + ').' }, 403);
    }

    // Bind
    await db.prepare('UPDATE premium_keys SET owner_id = ? WHERE key = ?').bind(uid, key).run();

    return json({
      ok: true,
      key: key,
      label: keyRow.label,
      max_uses: keyRow.max_uses,
      used_count: keyRow.used_count,
      remaining: Math.max(0, keyRow.max_uses - keyRow.used_count),
      message: 'Key berhasil diikat.'
    });
  } catch (e) {
    return json({ ok: false, message: 'DB error: ' + e.message }, 500);
  }
}
