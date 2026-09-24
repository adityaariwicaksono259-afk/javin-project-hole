import { generateSessionToken } from '../../../_lib/oauth.js';

function generateUserCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  var bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (var i = 0; i < 6; i++) s += chars[bytes[i] % chars.length];
  return 'JH-' + s;
}

export async function onRequestGet({ request, env }) {
  var db = env.JAVIN_DB;
  if (!db) return htmlError('DB nggak siap');

  var url = new URL(request.url);
  var token = String(url.searchParams.get('token') || '').trim();
  var wantJson = url.searchParams.get('format') === 'json';
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (wantJson) return new Response(JSON.stringify({ ok: false, message: 'Token tidak valid' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    return htmlError('Token tidak valid.');
  }

  var now = Date.now();
  var row = await db.prepare('SELECT * FROM email_magic_tokens WHERE token = ? LIMIT 1').bind(token).first();
  if (!row) return htmlError('Link tidak ditemukan atau sudah dipakai.');
  if (row.used) return htmlError('Link sudah dipakai. Minta link baru.');
  if (row.expires_at < now) return htmlError('Link expired. Minta link baru.');

  await db.prepare('UPDATE email_magic_tokens SET used = 1 WHERE token = ?').bind(token).run();

  var email = row.email;
  var userCode = row.user_code;
  var userId;

  var existing = await db.prepare('SELECT * FROM auth_users WHERE email = ? LIMIT 1').bind(email).first();
  if (existing) {
    userId = existing.id;
    userCode = existing.user_code;
    await db.prepare('UPDATE auth_users SET last_login = ? WHERE id = ?').bind(now, userId).run();
  } else {
    userCode = generateUserCode();
    for (var i = 0; i < 5; i++) {
      var dup = await db.prepare('SELECT id FROM auth_users WHERE user_code = ?').bind(userCode).first();
      if (!dup) break;
      userCode = generateUserCode();
    }
    var nameFromEmail = email.split('@')[0];
    var r = await db.prepare('INSERT INTO auth_users (user_code, email, name, avatar, provider, provider_id, extra_limit, created_at, last_login) VALUES (?, ?, ?, ?, "email", ?, 30, ?, ?)').bind(userCode, email, nameFromEmail, '', email, now, now).run();
    userId = r.meta.last_row_id;
  }

  var sessionToken = generateSessionToken();
  var expiresAt = now + 30 * 24 * 60 * 60 * 1000;
  await db.prepare('INSERT INTO auth_sessions (token, user_id, created_at, expires_at, last_used) VALUES (?, ?, ?, ?, ?)').bind(sessionToken, userId, now, expiresAt, now).run();

  var cookieVal = 'javin_session=' + sessionToken + '; Path=/; Max-Age=' + (30*24*60*60) + '; HttpOnly; Secure; SameSite=Lax';

  if (wantJson) {
    return new Response(JSON.stringify({
      ok: true,
      user_code: userCode,
      session_token: sessionToken,
      expires_at: expiresAt
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': cookieVal,
        'Cache-Control': 'no-store'
      }
    });
  }

  return new Response(htmlSuccess(userCode, sessionToken), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': cookieVal,
      'Cache-Control': 'no-store'
    }
  });
}

function htmlSuccess(code, token) {
  var s = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login berhasil</title>';
  s += '<style>body{margin:0;padding:0;background:#06111f;color:#e0f2fe;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}';
  s += '.box{max-width:400px;padding:40px 28px}.icon{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#0EA5E9,#22d3ee);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:36px;color:#06111f;font-weight:700}';
  s += 'h1{font-size:20px;margin:0 0 8px;color:#e0f2fe}p{color:#94a3b8;font-size:14px;line-height:1.5;margin:0}';
  s += '.code{font-family:monospace;color:#22d3ee;background:rgba(34,211,238,.1);padding:4px 10px;border-radius:6px;font-size:13px;display:inline-block;margin-top:12px}</style>';
  s += '<script>try{localStorage.setItem("javin_user_id","' + code + '");localStorage.setItem("javin_session_token","' + token + '");}catch(e){}setTimeout(function(){location.replace("/")},800);<\/script>';
  s += '</head><body><div class="box"><div class="icon">OK</div><h1>Login berhasil</h1><p>Mengarahkan...</p><div class="code">' + code + '</div></div></body></html>';
  return s;
}

function htmlError(msg) {
  var s = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login gagal</title>';
  s += '<style>body{margin:0;padding:0;background:#06111f;color:#e0f2fe;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}';
  s += '.box{max-width:400px;padding:40px 28px}.icon{width:72px;height:72px;border-radius:50%;background:rgba(239,68,68,.15);border:2px solid rgba(239,68,68,.4);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:36px;color:#f87171;font-weight:700}';
  s += 'h1{font-size:20px;margin:0 0 8px;color:#e0f2fe}p{color:#94a3b8;font-size:14px;line-height:1.5;margin:0 0 20px}';
  s += 'a{display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);color:#06111f;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px}</style>';
  s += '</head><body><div class="box"><div class="icon">X</div><h1>Login gagal</h1><p>' + msg + '</p><a href="/login.html">Kembali ke Login</a></div></body></html>';
  return new Response(s, {
    status: 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
