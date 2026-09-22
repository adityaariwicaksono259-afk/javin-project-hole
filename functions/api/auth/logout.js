import { json } from '../../_lib/oauth.js';

export async function onRequestPost({ request, env }) {
  var db = env.JAVIN_DB;
  var cookie = request.headers.get('Cookie') || '';
  var match = cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);

  if (match && db) {
    try {
      var token = decodeURIComponent(match[1]);
      await db.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run();
    } catch(e) {}
  }

  return json({ ok: true, message: 'Logout berhasil' }, 200, {
    'Set-Cookie': 'javin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
  });
}
