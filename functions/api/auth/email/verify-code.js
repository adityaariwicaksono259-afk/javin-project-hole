// POST /api/auth/email/verify-code
// Body: { email, code }
// code bisa OTP 6 digit ATAU magic token (dari URL link)
// Auto-detect → verify → set cookie → return user

import { generateSessionToken } from '../../../_lib/oauth.js';

function json(data, status, extraHeaders){
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extraHeaders || {})
  });
}

function genUserCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[bytes[i] % chars.length];
  return 'JH-' + s;
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim();

  if (!email) return json({ ok: false, message: 'Email wajib' }, 400);
  if (!code) return json({ ok: false, message: 'Kode wajib' }, 400);

  const now = Date.now();
  let userCode = null;
  let userId = null;
  let mode = '';

  // ===== Detect: OTP atau Magic Token? =====
  // OTP = 6 digit angka
  // Magic token = 64 hex char (kadang user paste full URL)
  const isOTP = /^\d{6}$/.test(code);

  try {
    if (isOTP) {
      // ===== MODE OTP =====
      mode = 'otp';

      const otpRow = await db.prepare(
        'SELECT otp, expires_at, used, attempts FROM email_otp_tokens WHERE email = ? AND otp = ? LIMIT 1'
      ).bind(email, code).first();

      if (!otpRow) {
        // Increment attempt untuk email ini (biar brute-force susah)
        try {
          await db.prepare(
            'UPDATE email_otp_tokens SET attempts = attempts + 1 WHERE email = ?'
          ).bind(email).run();
        } catch(e){}
        return json({ ok: false, message: 'Kode salah atau tidak ditemukan.' }, 401);
      }

      if (otpRow.used) return json({ ok: false, message: 'Kode sudah dipakai. Minta kode baru.' }, 401);
      if (otpRow.expires_at < now) return json({ ok: false, message: 'Kode expired. Minta kode baru.' }, 401);
      if (otpRow.attempts >= 5) return json({ ok: false, message: 'Terlalu banyak percobaan. Minta kode baru.' }, 429);

      // Mark used
      await db.prepare(
        'UPDATE email_otp_tokens SET used = 1 WHERE email = ? AND otp = ?'
      ).bind(email, code).run();

      // Cari user existing
      const user = await db.prepare(
        'SELECT * FROM auth_users WHERE email = ? LIMIT 1'
      ).bind(email).first();

      if (!user) {
        return json({ ok: false, message: 'Email tidak terdaftar. Gunakan magic link untuk daftar.' }, 401);
      }

      userId = user.id;
      userCode = user.user_code;

      await db.prepare(
        'UPDATE auth_users SET last_login = ? WHERE id = ?'
      ).bind(now, userId).run();

    } else {
      // ===== MODE MAGIC LINK =====
      mode = 'magic_link';

      // Code bisa berupa token (64 hex) atau full URL. Extract token kalau URL.
      let token = code;
      if (code.indexOf('token=') !== -1) {
        try {
          const u = new URL(code.indexOf('http') === 0 ? code : 'https://x?' + code);
          token = u.searchParams.get('token') || code;
        } catch(e){}
      }

      // Validasi format token
      if (!/^[a-f0-9]{64}$/.test(token)) {
        return json({ ok: false, message: 'Format kode tidak valid. Copy paste ulang dari email.' }, 400);
      }

      const magicRow = await db.prepare(
        'SELECT * FROM email_magic_tokens WHERE token = ? LIMIT 1'
      ).bind(token).first();

      if (!magicRow) return json({ ok: false, message: 'Link tidak ditemukan.' }, 401);
      if (magicRow.used) return json({ ok: false, message: 'Link sudah dipakai. Minta link baru.' }, 401);
      if (magicRow.expires_at < now) return json({ ok: false, message: 'Link expired. Minta link baru.' }, 401);

      // Pastiin email match
      if (magicRow.email !== email) {
        return json({ ok: false, message: 'Email tidak sesuai dengan link.' }, 401);
      }

      await db.prepare(
        'UPDATE email_magic_tokens SET used = 1 WHERE token = ?'
      ).bind(token).run();

      // Cek user (mungkin udah ada karena race condition / double register)
      const existing = await db.prepare(
        'SELECT * FROM auth_users WHERE email = ? LIMIT 1'
      ).bind(email).first();

      if (existing) {
        userId = existing.id;
        userCode = existing.user_code;
        await db.prepare(
          'UPDATE auth_users SET last_login = ? WHERE id = ?'
        ).bind(now, userId).run();
      } else {
        // Register user baru
        userCode = genUserCode();
        for (let i = 0; i < 5; i++) {
          const dup = await db.prepare(
            'SELECT id FROM auth_users WHERE user_code = ? LIMIT 1'
          ).bind(userCode).first();
          if (!dup) break;
          userCode = genUserCode();
        }

        const nameFromEmail = email.split('@')[0];
        const r = await db.prepare(
          'INSERT INTO auth_users (user_code, email, name, avatar, provider, provider_id, extra_limit, created_at, last_login) VALUES (?, ?, ?, ?, "email", ?, 30, ?, ?)'
        ).bind(userCode, email, nameFromEmail, '', email, now, now).run();

        userId = r.meta.last_row_id;
      }
    }

    // ===== Bikin session =====
    const sessionToken = generateSessionToken();
    const expiresAt = now + 365 * 24 * 60 * 60 * 1000; // 1 tahun

    await db.prepare(
      'INSERT INTO auth_sessions (token, user_id, created_at, expires_at, last_used) VALUES (?, ?, ?, ?, ?)'
    ).bind(sessionToken, userId, now, expiresAt, now).run();

    const user = await db.prepare('SELECT * FROM auth_users WHERE id = ?').bind(userId).first();

    const cookieVal = 'javin_session=' + sessionToken + '; Path=/; Max-Age=' + (365*24*60*60) + '; HttpOnly; Secure; SameSite=Lax';

    return json({
      ok: true,
      mode: mode,
      user: {
        id: user.id,
        user_code: user.user_code,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        extra_limit: user.extra_limit
      },
      session_token: sessionToken
    }, 200, { 'Set-Cookie': cookieVal });

  } catch(e) {
    console.error('[VERIFY-CODE]', e.message);
    return json({ ok: false, message: 'Error: ' + e.message }, 500);
  }
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST.' }, 405);
}
