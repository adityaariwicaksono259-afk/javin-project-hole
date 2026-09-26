// POST /api/auth/email/send — kirim OTP (existing) atau magic link (new)
import { json } from '../../../_lib/oauth.js';

function genOTP(){
  // 6 digit angka
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(num % 1000000).padStart(6, '0');
}

function genMagicToken(){
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isValidEmail(e){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch(e){ return json({ ok: false, message: 'Body invalid' }, 400); }

  const email = String(body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) return json({ ok: false, message: 'Email tidak valid' }, 400);

  const brevoKey = env.BREVO_API_KEY;
  const fromEmail = env.BREVO_FROM_EMAIL;
  if (!brevoKey || !fromEmail) return json({ ok: false, message: 'Email service belum disetup' }, 503);

  const now = Date.now();

  // Rate limit per email: max 3 kirim / 10 menit
  try {
    const recent = await db.prepare(
      'SELECT COUNT(*) as c FROM email_otp_tokens WHERE email = ? AND created_at > ?'
    ).bind(email, now - 10 * 60 * 1000).first();
    if (recent && recent.c >= 3) {
      return json({ ok: false, message: 'Terlalu banyak permintaan. Tunggu 10 menit.' }, 429);
    }
  } catch(e){}

  // Cek email udah pernah login
  const existing = await db.prepare(
    'SELECT user_code FROM auth_users WHERE email = ? LIMIT 1'
  ).bind(email).first();

  const isExisting = !!existing;

  try {
    if (isExisting) {
      // ====== EXISTING USER → OTP ======
      const otp = genOTP();
      const expiresAt = now + 10 * 60 * 1000; // 10 menit

      // Invalidate OTP lama untuk email ini
      await db.prepare('DELETE FROM email_otp_tokens WHERE email = ?').bind(email).run();

      await db.prepare(
        'INSERT INTO email_otp_tokens (email, otp, expires_at, used, created_at, attempts) VALUES (?, ?, ?, 0, ?, 0)'
      ).bind(email, otp, expiresAt, now).run();

      const htmlContent =
        '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0a1929;color:#e0f2fe;border-radius:12px">' +
        '<h2 style="color:#22d3ee;margin:0 0 16px">Kode Login</h2>' +
        '<p style="color:#94a3b8;line-height:1.6;margin:0 0 20px">Masukkan kode ini di aplikasi JVaPii:</p>' +
        '<div style="background:#06111f;border:1px solid rgba(34,211,238,.3);border-radius:10px;padding:24px;text-align:center;margin:0 0 20px">' +
        '<div style="font-family:monospace;font-size:38px;font-weight:700;color:#22d3ee;letter-spacing:8px">' + otp + '</div>' +
        '</div>' +
        '<p style="color:#64748b;font-size:12px;margin:0;line-height:1.5">Kode berlaku <b>10 menit</b>. Kalau lu gak minta login, abaikan email ini.</p>' +
        '</div>';

      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'JVaPii', email: fromEmail },
          to: [{ email: email }],
          subject: '🔐 Kode Login JVaPii: ' + otp,
          htmlContent: htmlContent
        })
      });

      if (!r.ok) {
        const err = await r.text();
        console.error('[BREVO] OTP error:', r.status, err.slice(0, 200));
        return json({ ok: false, message: 'Gagal kirim OTP. Coba lagi.' }, 502);
      }

      return json({
        ok: true,
        mode: 'otp',
        message: 'Kode OTP terkirim ke ' + email,
        expires_in: 600
      });

    } else {
      // ====== NEW USER → MAGIC LINK ======
      const token = genMagicToken();
      const expiresAt = now + 15 * 60 * 1000; // 15 menit

      await db.prepare(
        'INSERT INTO email_magic_tokens (token, email, user_code, expires_at, used, created_at, ip, user_agent) VALUES (?, ?, NULL, ?, 0, ?, ?, ?)'
      ).bind(token, email, expiresAt, now, request.headers.get('CF-Connecting-IP') || '', (request.headers.get('User-Agent') || '').slice(0, 200)).run();

      const origin = new URL(request.url).origin;
      const link = origin + '/api/auth/email/verify?token=' + encodeURIComponent(token);

      const htmlContent =
        '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0a1929;color:#e0f2fe;border-radius:12px">' +
        '<h2 style="color:#22d3ee;margin:0 0 16px">Verifikasi Email</h2>' +
        '<p style="color:#94a3b8;line-height:1.6;margin:0 0 20px">Copy link di bawah, lalu paste di aplikasi JVaPii untuk daftar:</p>' +
        '<div style="background:#06111f;border:1px solid rgba(34,211,238,.3);border-radius:10px;padding:14px;word-break:break-all;font-family:monospace;font-size:12px;color:#7dd3fc;margin:0 0 20px">' + link + '</div>' +
        '<p style="color:#64748b;font-size:12px;margin:0;line-height:1.5">Link berlaku <b>15 menit</b>.</p>' +
        '</div>';

      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'JVaPii', email: fromEmail },
          to: [{ email: email }],
          subject: '🔗 Link Verifikasi JVaPii',
          htmlContent: htmlContent
        })
      });

      if (!r.ok) {
        const err = await r.text();
        console.error('[BREVO] Magic link error:', r.status, err.slice(0, 200));
        return json({ ok: false, message: 'Gagal kirim link. Coba lagi.' }, 502);
      }

      return json({
        ok: true,
        mode: 'magic_link',
        message: 'Link verifikasi terkirim ke ' + email,
        expires_in: 900
      });
    }
  } catch(e) {
    console.error('[SEND] Error:', e.message);
    return json({ ok: false, message: 'Error: ' + e.message }, 500);
  }
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST.' }, 405);
}
