// POST /api/admin/step-auth
// Body: { step: "username" | "password", username, password? }
// Cooldown: username 5x salah → 20 menit, password 3x salah → 20 menit

import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';
import { audit, getClientIP } from '../../_lib/audit.js';

const COOLDOWN_MS = 20 * 60 * 1000; // 20 menit
const MAX_USERNAME_ATTEMPTS = 5;
const MAX_PASSWORD_ATTEMPTS = 3;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function genCode() {
  const n = Math.floor(Math.random() * 1000000);
  return String(n).padStart(6, '0');
}

async function getAttemptsInWindow(db, key, windowMs) {
  if (!db) return { count: 0, oldest: 0 };
  try {
    const row = await db.prepare(
      'SELECT COUNT(*) as c, MIN(created_at) as oldest FROM login_attempts WHERE ip = ? AND created_at >= ?'
    ).bind(key, Date.now() - windowMs).first();
    return { count: (row && row.c) || 0, oldest: (row && row.oldest) || 0 };
  } catch (e) {
    return { count: 0, oldest: 0 };
  }
}

async function recordAttempt(db, key) {
  if (!db) return;
  try {
    await db.prepare('INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)')
      .bind(key, Date.now()).run();
  } catch (e) {}
}

async function clearAttempts(db, key) {
  if (!db) return;
  try {
    await db.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(key).run();
  } catch (e) {}
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return json({ ok: false, message: 'Admin auth belum dikonfigurasi.' }, 503);
  }

  const db = env.JAVIN_DB;
  const ip = getClientIP(request);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid.' }, 400); }

  const step = String(body.step || '').toLowerCase();
  const username = String(body.username || '');
  const password = String(body.password || '');

  if (username.length > 100 || password.length > 200) {
    return json({ ok: false, message: 'Input terlalu panjang.' }, 400);
  }

  // ========================================
  // STEP 1: Verify USERNAME only
  // ========================================
  if (step === 'username') {
    const key = ip + ':username';
    const attempts = await getAttemptsInWindow(db, key, COOLDOWN_MS);

    if (attempts.count >= MAX_USERNAME_ATTEMPTS) {
      const waitMs = (attempts.oldest + COOLDOWN_MS) - Date.now();
      const waitMin = Math.max(1, Math.ceil(waitMs / 60000));
      return json({
        ok: false,
        message: 'Terlalu banyak percobaan username. Tunggu ' + waitMin + ' menit.',
        cooldown: true,
        remaining_attempts: 0
      }, 429);
    }

    if (!username) {
      return json({ ok: false, message: 'Username wajib.' }, 400);
    }

    const userOk = safeCompare(username, env.ADMIN_USERNAME);

    if (!userOk) {
      await recordAttempt(db, key);
      await new Promise(r => setTimeout(r, 500));
      const remaining = MAX_USERNAME_ATTEMPTS - attempts.count - 1;
      return json({
        ok: false,
        message: 'Username salah. Sisa percobaan: ' + remaining,
        remaining_attempts: remaining
      }, 401);
    }

    return json({ ok: true, message: 'Username OK.' });
  }

  // ========================================
  // STEP 2: Verify PASSWORD
  // ========================================
  if (step === 'password') {
    const key = ip + ':password';
    const attempts = await getAttemptsInWindow(db, key, COOLDOWN_MS);

    if (attempts.count >= MAX_PASSWORD_ATTEMPTS) {
      const waitMs = (attempts.oldest + COOLDOWN_MS) - Date.now();
      const waitMin = Math.max(1, Math.ceil(waitMs / 60000));
      return json({
        ok: false,
        message: 'Terlalu banyak percobaan password. Tunggu ' + waitMin + ' menit.',
        cooldown: true,
        remaining_attempts: 0
      }, 429);
    }

    if (!username || !password) {
      return json({ ok: false, message: 'Username dan password wajib.' }, 400);
    }

    // Verify username dulu
    const userOk = safeCompare(username, env.ADMIN_USERNAME);
    if (!userOk) {
      return json({ ok: false, message: 'Username tidak valid.', back_to_username: true }, 401);
    }

    const passOk = safeCompare(password, env.ADMIN_PASSWORD);

    if (!passOk) {
      await recordAttempt(db, key);
      await new Promise(r => setTimeout(r, 800));
      const remaining = MAX_PASSWORD_ATTEMPTS - attempts.count - 1;

      if (remaining <= 0) {
        await audit(db, {
          action: 'login_cooldown_password',
          actor: username.slice(0, 40),
          target: '',
          detail: 'Password attempts exceeded',
          ip: ip
        });
        return json({
          ok: false,
          message: 'Terlalu banyak percobaan password. Tunggu 20 menit.',
          cooldown: true,
          remaining_attempts: 0
        }, 429);
      }

      return json({
        ok: false,
        message: 'Password salah. Sisa percobaan: ' + remaining,
        remaining_attempts: remaining,
        back_to_username: true
      }, 401);
    }

    // ==== Password bener ====
    await clearAttempts(db, key);
    await clearAttempts(db, ip + ':username');

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return json({ ok: false, message: 'Telegram 2FA belum dikonfigurasi.' }, 503);
    }
    if (!db) {
      return json({ ok: false, message: 'DB belum siap.' }, 503);
    }

    const code = genCode();
    const now = Date.now();
    const expires = now + 5 * 60 * 1000;

    try {
      await db.prepare('DELETE FROM admin_2fa_codes WHERE created_at < ?').bind(now - 10 * 60 * 1000).run();

      const recent = await db.prepare(
        'SELECT COUNT(*) as c FROM admin_2fa_codes WHERE ip = ? AND created_at >= ?'
      ).bind(ip, now - 5 * 60 * 1000).first();
      if (recent && recent.c >= 5) {
        return json({ ok: false, message: 'Terlalu banyak permintaan kode. Tunggu 5 menit.' }, 429);
      }

      await db.prepare(
        'INSERT INTO admin_2fa_codes (code, username, ip, expires, used, attempts, created_at) VALUES (?, ?, ?, ?, 0, 0, ?)'
      ).bind(code, username, ip, expires, now).run();

      // Reset code attempts karena bikin kode baru
      await clearAttempts(db, ip + ':code');
    } catch (e) {
      console.error('[STEP-AUTH] DB error:', e.message);
      return json({ ok: false, message: 'Server error.' }, 500);
    }

    const tgRes = await sendTelegram(env,
      '🔐 <b>ADMIN LOGIN — 2FA CODE</b>\n\n' +
      'Kode: <code>' + code + '</code>\n' +
      'Username: <b>' + escapeHtml(username) + '</b>\n' +
      'IP: <code>' + escapeHtml(ip) + '</code>\n\n' +
      '⏱️ Berlaku 5 menit\n' +
      '⚠️ Jangan share kode ini!'
    , { type: '2fa-code', throttleMs: 500 });

    if (!tgRes.ok) {
      console.error('[STEP-AUTH] Telegram failed:', tgRes.reason);
      return json({ ok: false, message: 'Gagal kirim kode ke Telegram.' }, 500);
    }

    return json({
      ok: true,
      message: 'Kode dikirim ke Telegram.',
      expires_in: 300
    });
  }

  return json({ ok: false, message: 'Step tidak valid.' }, 400);
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST.' }, 405);
}
