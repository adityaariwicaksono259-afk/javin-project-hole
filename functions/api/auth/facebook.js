// POST /api/auth/facebook — Body: { access_token }
import { verifyFacebookToken, generateUserCode, generateSessionToken, json } from '../../_lib/oauth.js';

export async function onRequestPost({ request, env }) {
  var db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  var body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  var accessToken = String(body.access_token || '').trim();
  if (!accessToken) return json({ ok: false, message: 'Token wajib' }, 400);

  var v = await verifyFacebookToken(accessToken);
  if (!v.ok) return json({ ok: false, message: 'Facebook token tidak valid: ' + v.reason }, 401);

  var fb = v.user;
  var now = Date.now();

  var user = await db.prepare(
    'SELECT * FROM auth_users WHERE provider = ? AND provider_id = ?'
  ).bind('facebook', fb.id).first();

  var userId, userCode;

  if (user) {
    userId = user.id;
    userCode = user.user_code;
    await db.prepare(
      'UPDATE auth_users SET email = ?, name = ?, avatar = ?, last_login = ? WHERE id = ?'
    ).bind(fb.email, fb.name, fb.avatar, now, userId).run();
  } else {
    userCode = generateUserCode();
    for (var i = 0; i < 5; i++) {
      var dup = await db.prepare('SELECT id FROM auth_users WHERE user_code = ?').bind(userCode).first();
      if (!dup) break;
      userCode = generateUserCode();
    }
    var r = await db.prepare(
      'INSERT INTO auth_users (user_code, email, name, avatar, provider, provider_id, extra_limit, created_at, last_login) VALUES (?, ?, ?, ?, "facebook", ?, 30, ?, ?)'
    ).bind(userCode, fb.email, fb.name, fb.avatar, fb.id, now, now).run();
    userId = r.meta.last_row_id;
  }

  var token = generateSessionToken();
  var expiresAt = now + 30 * 24 * 60 * 60 * 1000;
  await db.prepare(
    'INSERT INTO auth_sessions (token, user_id, created_at, expires_at, last_used) VALUES (?, ?, ?, ?, ?)'
  ).bind(token, userId, now, expiresAt, now).run();

  return json({
    ok: true,
    user: {
      id: userId,
      user_code: userCode,
      name: fb.name,
      email: fb.email,
      avatar: fb.avatar,
      provider: 'facebook',
      extra_limit: 30
    }
  }, 200, {
    'Set-Cookie': 'javin_session=' + token + '; Path=/; Max-Age=' + (30*24*60*60) + '; HttpOnly; Secure; SameSite=Lax'
  });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST' }, 405);
}
