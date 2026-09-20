// POST /api/admin/verify-2fa
// Body: { code }
// Auto-ban kalau kode salah 5x

import { audit, getClientIP } from '../../_lib/audit.js';
import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';

const MAX_CODE_ATTEMPTS = 5;
const BAN_DURATION_MS = 60 * 60 * 1000; // 1 jam
const ATTEMPT_WINDOW_MS = 30 * 60 * 1000; // 30 menit

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

async function getCodeAttempts(db, ip) {
  if (!db) return { count: 0, oldest: 0 };
  try {
    const row = await db.prepare(
      'SELECT COUNT(*) as c, MIN(created_at) as oldest FROM login_attempts WHERE ip = ? AND created_at >= ?'
    ).bind(ip + ':code', Date.now() - ATTEMPT_WINDOW_MS).first();
    return { count: (row && row.c) || 0, oldest: (row && row.oldest) || 0 };
  } catch (e) {
    return { count: 0, oldest: 0 };
  }
}

async function recordCodeAttempt(db, ip) {
  if (!db) return;
  try {
    await db.prepare('INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)')
      .bind(ip + ':code', Date.now()).run();
  } catch (e) {}
}

async function clearCodeAttempts(db, ip) {
  if (!db) return;
  try {
    await db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip + ':code').run();
  } catch (e) {}
}

async function autoBan(db, ip, reason, durationMs) {
  if (!db) return;
  const now = Date.now();
  try {
    await db.prepare(
      'INSERT INTO blocked_ips (ip, reason, until, created_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(ip) DO UPDATE SET reason = excluded.reason, until = excluded.until'
    ).bind(ip, reason, now + durationMs, now).run();

    await db.prepare(
      'INSERT INTO audit_log (action, actor, target, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind('login_auto_ban', 'system', ip, reason, ip, now).run();
  } catch (e) {
    console.error('[VERIFY-2FA] Auto-ban error:', e.message);
  }
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

  // ==== Cek attempts sebelum verify ====
  const attempts = await getCodeAttempts(db, ip);

  if (attempts.count >= MAX_CODE_ATTEMPTS) {
    await autoBan(db, ip, '2FA code attempts exceeded', BAN_DURATION_MS);
    try {
      await sendTelegram(env,
        '🚫 <b>ADMIN LOGIN AUTO-BAN</b>\n\n' +
        'IP: <code>' + escapeHtml(ip) + '</code>\n' +
        'Alasan: 5x kode 2FA salah\n' +
        'Durasi: 1 jam\n' +
        'Time: ' + new Date().toISOString()
      , { type: 'login-autoban', throttleMs: 30000 });
    } catch (e) {}

    return json({
      ok: false,
      message: 'Terlalu banyak percobaan. IP diblok 1 jam.',
      banned: true
    }, 403);
  }

  // ==== Cari kode ====
  let row;
  try {
    row = await db.prepare(
      'SELECT * FROM admin_2fa_codes WHERE code = ? AND ip = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
    ).bind(code, ip).first();
  } catch (e) {
    return json({ ok: false, message: 'Server error.' }, 500);
  }

  if (!row) {
    await recordCodeAttempt(db, ip);
    const remaining = MAX_CODE_ATTEMPTS - attempts.count - 1;

    if (remaining <= 0) {
      await autoBan(db, ip, '2FA code attempts exceeded', BAN_DURATION_MS);
      try {
        await sendTelegram(env,
          '🚫 <b>ADMIN LOGIN AUTO-BAN</b>\n\n' +
          'IP: <code>' + escapeHtml(ip) + '</code>\n' +
          'Alasan: 5x kode 2FA salah\n' +
          'Durasi: 1 jam'
        , { type: 'login-autoban', throttleMs: 30000 });
      } catch (e) {}

      return json({
        ok: false,
        message: 'Terlalu banyak percobaan. IP diblok 1 jam.',
        banned: true
      }, 403);
    }

    await audit(db, {
      action: 'login_2fa_wrong_code',
      actor: 'unknown',
      target: '',
      detail: 'Code not found',
      ip: ip
    });

    return json({
      ok: false,
      message: 'Kode salah. Sisa percobaan: ' + remaining,
      remaining_attempts: remaining
    }, 401);
  }

  // ==== Cek expired ====
  if (row.expires < Date.now()) {
    await db.prepare('UPDATE admin_2fa_codes SET used = 1 WHERE id = ?').bind(row.id).run();
    return json({ ok: false, message: 'Kode kadaluarsa. Minta kode baru.' }, 401);
  }

  // ==== Sukses ====
  try {
    await db.prepare('UPDATE admin_2fa_codes SET used = 1 WHERE id = ?').bind(row.id).run();
  } catch (e) {}

  await clearCodeAttempts(db, ip);

  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
  const ipHash = await hmac(env.ADMIN_SESSION_SECRET, 'ip:' + ip);
  const payload = row.username + '.' + expires + '.' + ipHash;
  const signature = await hmac(env.ADMIN_SESSION_SECRET, payload);
  const token = payload + '.' + signature;

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
    'Set-Cookie': 'javin_admin=' + token + '; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Lax'
  });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST.' }, 405);
}
