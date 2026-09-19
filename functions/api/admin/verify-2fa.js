// POST /api/admin/verify-2fa
// Body: { code }
// Verify kode, hapus kode, set cookie session

import { audit, getClientIP } from '../../_lib/audit.js';

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extraHeaders || {})
  });
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_SESSION_SECRET) {
    return json({ ok: false, message: 'Server belum siap.' }, 503);
  }

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum siap.' }, 503);

  const ip = getClientIP(request);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid.' }, 400); }

  const code = String(body.code || '').trim();

  if (!/^\d{6}$/.test(code)) {
    return json({ ok: false, message: 'Kode harus 6 digit angka.' }, 400);
  }

  // Cari kode yang cocok untuk IP ini
  let row;
  try {
    row = await db.prepare(
      'SELECT * FROM admin_2fa_codes WHERE code = ? AND ip = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
    ).bind(code, ip).first();
  } catch (e) {
    console.error('[2FA-VERIFY] DB error:', e.message);
    return json({ ok: false, message: 'Server error.' }, 500);
  }

  if (!row) {
    await audit(db, {
      action: 'login_2fa_wrong_code',
      actor: 'unknown',
      target: '',
      detail: 'Code not found',
      ip: ip
    });
    return json({ ok: false, message: 'Kode salah atau sudah dipakai.' }, 401);
  }

  // Cek expired
  if (row.expires < Date.now()) {
    await db.prepare('UPDATE admin_2fa_codes SET used = 1 WHERE id = ?').bind(row.id).run();
    return json({ ok: false, message: 'Kode kadaluarsa. Minta kode baru.' }, 401);
  }

  // Cek attempts (max 3x salah)
  if (row.attempts >= 3) {
    await db.prepare('UPDATE admin_2fa_codes SET used = 1 WHERE id = ?').bind(row.id).run();
    return json({ ok: false, message: 'Terlalu banyak percobaan. Login ulang dari awal.' }, 401);
  }

  // Sukses → tandai used
  try {
    await db.prepare('UPDATE admin_2fa_codes SET used = 1 WHERE id = ?').bind(row.id).run();
  } catch (e) {}

  // ==== Bikin session token ====
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8; // 8 jam
  const ipHash = await hmac(env.ADMIN_SESSION_SECRET, 'ip:' + ip);
  const payload = row.username + '.' + expires + '.' + ipHash;
  const signature = await hmac(env.ADMIN_SESSION_SECRET, payload);
  const token = payload + '.' + signature;

  // Audit log
  await audit(db, {
    action: 'login_success_2fa',
    actor: row.username,
    target: '',
    detail: 'Login via Telegram 2FA',
    ip: ip
  });

  return json({
    ok: true,
    message: 'Login berhasil.'
  }, 200, {
    'Set-Cookie': 'javin_admin=' + token + '; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict'
  });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST.' }, 405);
}
