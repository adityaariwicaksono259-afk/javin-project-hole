// POST /api/auth/logout-demo — hapus cookie javin_demo aja
// Session Google (javin_session) TETAP aktif
import { json } from '../../_lib/oauth.js';

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)javin_demo=([^;]+)/);

  if (match && db) {
    try {
      const token = decodeURIComponent(match[1]);
      // Update last_used, JANGAN hapus session (biar bisa restore)
      await db.prepare(
        'UPDATE auth_sessions SET last_used = ? WHERE token = ?'
      ).bind(Date.now(), token).run();
    } catch(e) {
      console.error('[LOGOUT-DEMO]', e.message);
    }
  }

  return json({ ok: true, message: 'Logout demo berhasil' }, 200, {
    'Set-Cookie': 'javin_demo=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
  });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST' }, 405);
}
