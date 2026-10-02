// POST /api/auth/logout — hapus kedua cookie (javin_session + javin_demo)
import { json } from '../../_lib/oauth.js';

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  const cookie = request.headers.get('Cookie') || '';

  const sessMatch = cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);
  const demoMatch = cookie.match(/(?:^|;\s*)javin_demo=([^;]+)/);

  if (db) {
    try {
      if (sessMatch) {
        const token = decodeURIComponent(sessMatch[1]);
        await db.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run();
      }
      if (demoMatch) {
        const token = decodeURIComponent(demoMatch[1]);
        await db.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run();
      }
    } catch(e) {
      console.error('[LOGOUT]', e.message);
    }
  }

  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  headers.append('Set-Cookie', 'javin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  headers.append('Set-Cookie', 'javin_demo=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');

  return new Response(JSON.stringify({ ok: true, message: 'Logout berhasil' }), {
    status: 200,
    headers: headers
  });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST' }, 405);
}
