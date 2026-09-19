// POST /api/admin/rotate — rotate session token (perpanjang + ganti)
import { verifyAdmin } from './auth.js';

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extraHeaders || {})
  });
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequestPost({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const ip = request.headers.get('CF-Connecting-IP') ||
             (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
             'unknown';

  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
  const ipHash = await hmac(env.ADMIN_SESSION_SECRET, 'ip:' + ip);
  const payload = auth.username + '.' + expires + '.' + ipHash;
  const signature = await hmac(env.ADMIN_SESSION_SECRET, payload);
  const token = payload + '.' + signature;

  return json({ ok: true, expires: expires }, 200, {
    'Set-Cookie': 'javin_admin=' + token + '; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict'
  });
}
