// POST /api/auth/client-init
// Bikin client_id + client_secret per device
// Simpan di D1 biar bisa verify nanti

function json(data, status, extra) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extra || {})
  });
}

function genToken(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const fingerprint = String(body.fingerprint || '').slice(0, 128);
  if (!fingerprint || fingerprint.length < 8) {
    return json({ ok: false, message: 'Fingerprint wajib (min 8 char)' }, 400);
  }

  const now = Date.now();

  try {
    // Cek fingerprint udah pernah daftar
    const existing = await db.prepare(
      'SELECT client_id, client_secret, created_at FROM clients WHERE fingerprint = ? LIMIT 1'
    ).bind(fingerprint).first();

    if (existing) {
      // Kalau udah ada, return yang sama
      return json({
        ok: true,
        reused: true,
        client_id: existing.client_id,
        client_secret: existing.client_secret,
        created_at: existing.created_at
      });
    }

    // Bikin baru
    const clientId = 'c_' + genToken(8);
    const clientSecret = genToken(32);

    await db.prepare(
      'INSERT INTO clients (client_id, client_secret, fingerprint, created_at, last_used, blocked) VALUES (?, ?, ?, ?, ?, 0)'
    ).bind(clientId, clientSecret, fingerprint, now, now).run();

    return json({
      ok: true,
      reused: false,
      client_id: clientId,
      client_secret: clientSecret,
      created_at: now
    });
  } catch(e) {
    console.error('[CLIENT-INIT]', e.message);
    return json({ ok: false, message: 'Error: ' + e.message }, 500);
  }
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST.' }, 405);
}
