import { json } from '../../../_lib/oauth.js';

function generateMagicToken() {
  var bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(function(b){ return b.toString(16).padStart(2, '0'); }).join('');
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

export async function onRequestPost({ request, env }) {
  var db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  var body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  var email = String(body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) return json({ ok: false, message: 'Email tidak valid' }, 400);

  var brevoKey = env.BREVO_API_KEY;
  var fromEmail = env.BREVO_FROM_EMAIL;
  if (!brevoKey || !fromEmail) {
    return json({ ok: false, message: 'Email service belum disetup' }, 503);
  }

  var now = Date.now();

  var recent = await db.prepare(
    'SELECT COUNT(*) as c FROM email_magic_tokens WHERE email = ? AND created_at > ?'
  ).bind(email, now - 10 * 60 * 1000).first();
  if (recent && recent.c >= 3) {
    return json({ ok: false, message: 'Terlalu banyak permintaan. Tunggu 10 menit.' }, 429);
  }

  var existing = await db.prepare(
    'SELECT user_code FROM auth_users WHERE email = ? LIMIT 1'
  ).bind(email).first();

  var token = generateMagicToken();
  var expiresAt = now + 15 * 60 * 1000;
  var ip = request.headers.get('CF-Connecting-IP') || '';
  var ua = (request.headers.get('User-Agent') || '').slice(0, 200);

  await db.prepare(
    'INSERT INTO email_magic_tokens (token, email, user_code, expires_at, used, created_at, ip, user_agent) VALUES (?, ?, ?, ?, 0, ?, ?, ?)'
  ).bind(token, email, existing ? existing.user_code : null, expiresAt, now, ip, ua).run();

  var origin = new URL(request.url).origin;
  var link = origin + '/api/auth/email/verify?token=' + encodeURIComponent(token);

  var htmlContent = '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0a1929;color:#e0f2fe;border-radius:12px">'
    + '<h2 style="color:#22d3ee;margin:0 0 16px">Login ke Javin Tools</h2>'
    + '<p style="color:#94a3b8;line-height:1.6;margin:0 0 24px">Klik tombol di bawah untuk masuk. Link berlaku 15 menit.</p>'
    + '<a href="' + link + '" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);color:#06111f;text-decoration:none;border-radius:8px;font-weight:700">Masuk ke Javin Tools</a>'
    + '<p style="color:#64748b;font-size:12px;margin:24px 0 0;line-height:1.5">Kalau tombol gak works, copy link ini:<br><span style="color:#22d3ee;word-break:break-all">' + link + '</span></p>'
    + '</div>';

  try {
    var r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Javin Tools', email: fromEmail },
        to: [{ email: email }],
        subject: 'Login ke Javin Tools',
        htmlContent: htmlContent
      })
    });

    if (!r.ok) {
      var err = await r.text();
      console.error('[BREVO] Error:', r.status, err.slice(0, 200));
      return json({ ok: false, message: 'Gagal kirim email. Coba lagi.' }, 502);
    }

    return json({ ok: true, message: 'Link login dikirim ke ' + email });
  } catch (e) {
    console.error('[BREVO] Fetch error:', e.message);
    return json({ ok: false, message: 'Koneksi ke email service gagal.' }, 502);
  }
}
