// POST /api/user/identify
// Body: { fp: "hash-hex" }
// Return: { ok, uid, is_new }
//
// Logika:
//   1. Cek fingerprint di DB → kalau ada, balikin user_id lama
//   2. Kalau nggak ada, generate user_id baru (JH-XXXXXX), simpan mapping

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function genUserId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) {
    s += chars[bytes[i] % chars.length];
  }
  return 'JH-' + s;
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) {
    return json({ ok: false, message: 'DB belum di-bind.' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, message: 'Body tidak valid.' }, 400);
  }

  const fp = String(body.fp || '').trim().toLowerCase();

  if (!fp || !/^[a-f0-9]{16,128}$/.test(fp)) {
    return json({ ok: false, message: 'Fingerprint tidak valid.' }, 400);
  }

  const now = Date.now();

  try {
    // Cari fingerprint
    const existing = await db.prepare(
      'SELECT user_id FROM fingerprints WHERE fp_hash = ?'
    ).bind(fp).first();

    if (existing && existing.user_id) {
      // Update last_seen
      await db.prepare(
        'UPDATE fingerprints SET last_seen = ? WHERE fp_hash = ?'
      ).bind(now, fp).run();

      // Pastikan user row juga ada
      const userRow = await db.prepare(
        'SELECT id FROM users WHERE id = ?'
      ).bind(existing.user_id).first();

      if (!userRow) {
        await db.prepare(
          'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, 0, ?, ?, 0)'
        ).bind(existing.user_id, now, now).run();
      } else {
        await db.prepare(
          'UPDATE users SET last_seen = ? WHERE id = ?'
        ).bind(now, existing.user_id).run();
      }

      return json({
        ok: true,
        uid: existing.user_id,
        is_new: false
      });
    }

    // Bikin user_id baru
    let uid = genUserId();
    let attempts = 0;
    while (attempts < 5) {
      const dup = await db.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first();
      if (!dup) break;
      uid = genUserId();
      attempts++;
    }

    // Insert fingerprint
    await db.prepare(
      'INSERT INTO fingerprints (fp_hash, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)'
    ).bind(fp, uid, now, now).run();

    // Insert user
    await db.prepare(
      'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, 0, ?, ?, 0)'
    ).bind(uid, now, now).run();

    return json({
      ok: true,
      uid: uid,
      is_new: true
    });

  } catch (e) {
    return json({ ok: false, message: 'DB error: ' + e.message }, 500);
  }
}
