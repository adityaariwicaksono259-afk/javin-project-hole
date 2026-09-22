// GET /api/auth/me — cek user login
import { json } from '../../_lib/oauth.js';

export async function onRequestGet({ request, env }) {
  var db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  var cookie = request.headers.get('Cookie') || '';
  var match = cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);
  if (!match) return json({ ok: false, logged_in: false });

  var token = decodeURIComponent(match[1]);
  var now = Date.now();

  var session = await db.prepare(
    'SELECT * FROM auth_sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();

  if (!session) return json({ ok: false, logged_in: false });

  var user = await db.prepare('SELECT * FROM auth_users WHERE id = ?').bind(session.user_id).first();
  if (!user) return json({ ok: false, logged_in: false });

  // Update last_used
  try {
    await db.prepare('UPDATE auth_sessions SET last_used = ? WHERE token = ?').bind(now, token).run();
  } catch(e) {}

  return json({
    ok: true,
    logged_in: true,
    user: {
      id: user.id,
      user_code: user.user_code,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      extra_limit: user.extra_limit
    }
  });
}
