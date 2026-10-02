// POST /api/auth/logout-demo — hapus cookie aja, session tetap di DB
import { json } from '../../_lib/oauth.js';

export async function onRequestPost({ request }) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  headers.append('Set-Cookie', 'javin_demo=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  headers.append('Set-Cookie', 'javin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');

  return new Response(JSON.stringify({ ok: true, message: 'Logout berhasil' }), {
    status: 200,
    headers: headers
  });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST' }, 405);
}
