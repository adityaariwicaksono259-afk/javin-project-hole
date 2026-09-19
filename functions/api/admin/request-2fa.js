// POST /api/admin/request-2fa
// Body: { username, password }
// Server verify → generate 6 digit → kirim ke Telegram → return ok

import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function genCode() {
  // 6 digit random (000000-999999)
  const n = Math.floor(Math.random() * 1000000);
  return String(n).padStart(6, '0');
}

function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return json({ ok: false, message: 'Admin auth belum dikonfigurasi.' }, 503);
  }
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ ok: false, message: 'Telegram 2FA belum dikonfigurasi.' }, 503);
  }

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum siap.' }, 503);

  const ip = request.headers.get('CF-Connecting-IP') ||
             (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
             'unknown';

  // ==== Rate limit: max 3 request / 5 menit per IP ====
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;

  try {
    const recent = await db.prepare(
      'SELECT COUNT(*) as c FROM admin_2fa_codes WHERE ip = ? AND created_at >= ?'
    ).bind(ip, fiveMinAgo).first();

    if (recent && recent.c >= 3) {
      return json({
        ok: false,
        message: 'Terlalu banyak permintaan kode. Tunggu 5 menit lagi.'
      }, 429);
    }
  } catch (e) {
    console.error('[2FA] Rate limit check error:', e.message);
  }

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid.' }, 400); }

  const username = String(body.username || '');
  const password = String(body.password || '');

  if (username.length > 100 || password.length > 200) {
    return json({ ok: false, message: 'Username/password terlalu panjang.' }, 400);
  }

  // ==== Verify password + username ====
  const userOk = safeCompare(username, env.ADMIN_USERNAME);
  const passOk = safeCompare(password, env.ADMIN_PASSWORD);

  if (!userOk || !passOk) {
    // Delay biar brute force susah
    await new Promise(r => setTimeout(r, 800));
    return json({ ok: false, message: 'Username atau password salah.' }, 401);
  }

  // ==== Generate code + simpan DB ====
  const code = genCode();
  const expires = now + 5 * 60 * 1000; // 5 menit

  try {
    // Bersihin kode lama (> 10 menit)
    await db.prepare('DELETE FROM admin_2fa_codes WHERE created_at < ?').bind(now - 10 * 60 * 1000).run();

    await db.prepare(
      'INSERT INTO admin_2fa_codes (code, username, ip, expires, used, attempts, created_at) VALUES (?, ?, ?, ?, 0, 0, ?)'
    ).bind(code, username, ip, expires, now).run();
  } catch (e) {
    console.error('[2FA] DB insert error:', e.message);
    return json({ ok: false, message: 'Server error. Coba lagi.' }, 500);
  }

  // ==== Kirim ke Telegram ====
  const tgRes = await sendTelegram(env,
    '🔐 <b>ADMIN LOGIN — 2FA CODE</b>\n\n' +
    'Kode: <code>' + code + '</code>\n' +
    'Username: <b>' + escapeHtml(username) + '</b>\n' +
    'IP: <code>' + escapeHtml(ip) + '</code>\n\n' +
    '⏱️ Berlaku 5 menit\n' +
    '⚠️ Jangan share kode ini ke siapapun!'
  , { type: '2fa-code', throttleMs: 1000 });

  if (!tgRes.ok) {
    console.error('[2FA] Telegram send failed:', tgRes.reason);
    return json({ ok: false, message: 'Gagal kirim kode ke Telegram.' }, 500);
  }

  return json({
    ok: true,
    message: 'Kode dikirim ke Telegram. Berlaku 5 menit.',
    expires_in: 300
  });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST.' }, 405);
}
