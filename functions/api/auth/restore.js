// POST /api/auth/restore — restore login pakai session token dari localStorage
import { json } from '../../_lib/oauth.js';

export async function onRequestPost({ request, env }) {
  var db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  var body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  var token = String(body.session_token || '').trim();
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return json({ ok: false, message: 'Token invalid' }, 400);
  }

  var now = Date.now();
  var session = await db.prepare(
    'SELECT * FROM auth_sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();

  if (!session) return json({ ok: false, message: 'Session expired' }, 401);

  var user = await db.prepare('SELECT * FROM auth_users WHERE id = ?').bind(session.user_id).first();
  if (!user) return json({ ok: false, message: 'User tidak ditemukan' }, 401);

  // Update last_used
  try {
    await db.prepare('UPDATE auth_sessions SET last_used = ? WHERE token = ?').bind(now, token).run();
  } catch(e){}

  // Set cookie baru
  var cookieVal = 'javin_session=' + token + '; Path=/; Max-Age=' + (365*24*60*60) + '; HttpOnly; Secure; SameSite=Lax';

  return json({
    ok: true,
    user: {
      id: user.id,
      user_code: user.user_code,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      extra_limit: user.extra_limit
    }
  }, 200, { 'Set-Cookie': cookieVal });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST' }, 405);
}
