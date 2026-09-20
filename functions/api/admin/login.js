// Admin login dengan brute force protection (5 percobaan / 15 menit per IP)

import { audit, getClientIP } from '../../_lib/audit.js';
import { checkPasswordStrength } from '../../_lib/password.js';

const WINDOW_MS = 15 * 60 * 1000;  // 15 menit
const MAX_ATTEMPTS = 5;

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
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function isWhitelistedIP(ip, env) {
  if (!env.ADMIN_IPS) return false;
  const list = String(env.ADMIN_IPS).split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(ip);
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return json({ ok: false, message: 'Admin auth belum dikonfigurasi.' }, 503);
  }

  const db = env.JAVIN_DB;
  const ip = request.headers.get('CF-Connecting-IP') ||
             (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
             'unknown';

  // ==== Cek whitelist ====
  const isWhitelisted = isWhitelistedIP(ip, env);

  // ==== Layer 5: cek rate limit per IP (skip kalau whitelist) ====
  if (db && !isWhitelisted) {
    try {
      const now = Date.now();
      const windowStart = now - WINDOW_MS;

      // Bersihin yang expired (opsional, biar DB nggak numpuk)
      await db.prepare('DELETE FROM login_attempts WHERE created_at < ?').bind(windowStart).run();

      const row = await db.prepare(
        'SELECT COUNT(*) as c FROM login_attempts WHERE ip = ? AND created_at >= ?'
      ).bind(ip, windowStart).first();

      if (row && row.c >= MAX_ATTEMPTS) {
        const oldest = await db.prepare(
          'SELECT created_at FROM login_attempts WHERE ip = ? AND created_at >= ? ORDER BY created_at ASC LIMIT 1'
        ).bind(ip, windowStart).first();

        const waitSec = oldest ? Math.ceil((oldest.created_at + WINDOW_MS - now) / 1000) : 900;

        console.warn('[LOGIN-LOCKOUT] IP:', ip, 'attempts:', row.c);
        return json({
          ok: false,
          message: 'Terlalu banyak percobaan login. Coba lagi dalam ' + Math.ceil(waitSec/60) + ' menit.'
        }, 429);
      }
    } catch (e) {
      console.error('[LOGIN] DB check error:', e.message);
    }
  }

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Request tidak valid.' }, 400); }

  const username = String(body.username || '');
  const password = String(body.password || '');

  // Validasi format input
  if (username.length > 100 || password.length > 200) {
    return json({ ok: false, message: 'Username/password terlalu panjang.' }, 400);
  }

  // ==== Constant-time compare (Layer 8) ====
  const safeCompare = (a, b) => {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  };

  const userOk = safeCompare(username, env.ADMIN_USERNAME);
  const passOk = safeCompare(password, env.ADMIN_PASSWORD);

  if (!userOk || !passOk) {
    // ==== Log failed attempt (kecuali whitelist) ====
    if (db && !isWhitelisted) {
      try {
        await db.prepare(
          'INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)'
        ).bind(ip, Date.now()).run();
      } catch (e) {}
    }

    // Audit log
    await audit(db, {
      action: 'login_failed',
      actor: username.slice(0, 40),
      target: '',
      detail: 'Wrong password',
      ip: getClientIP(request)
    });

    return json({ ok: false, message: 'Username atau password salah.' }, 401);
  }

  // ==== Sukses: bikin token (bind ke IP) ====
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8;  // 8 jam
  const ipHash = await hmac(env.ADMIN_SESSION_SECRET, 'ip:' + ip);
  const payload = username + '.' + expires + '.' + ipHash;
  const signature = await hmac(env.ADMIN_SESSION_SECRET, payload);
  const token = payload + '.' + signature;

  // Audit log sukses
  await audit(db, {
    action: 'login_success',
    actor: username,
    target: '',
    detail: 'Admin login',
    ip: getClientIP(request)
  });

  // Cek kekuatan password (warning only)
  const pwCheck = checkPasswordStrength(env.ADMIN_PASSWORD);
  const warning = pwCheck.ok ? null : 'Password admin lemah: ' + pwCheck.reason;

  if (warning) {
    console.warn('[PASSWORD] Weak password detected:', pwCheck.reason);
  }

  return json({
    ok: true,
    message: 'Login berhasil.',
    warning: warning
  }, 200, {
    'Set-Cookie': 'javin_admin=' + token + '; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Lax'
  });
}
