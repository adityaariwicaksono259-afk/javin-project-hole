// GET /api/bot/test-github — cek koneksi GitHub (butuh isAdmin)
import { testConnection } from '../../_lib/github.js';

export async function onRequestGet({ request, env }) {
  const ip = request.headers.get('CF-Connecting-IP') ||
             (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
             'unknown';
  const admins = String(env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);

  if (!admins.includes(ip)) {
    return new Response(JSON.stringify({ ok: false, message: 'Akses ditolak. IP: ' + ip }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await testConnection(env);
  return new Response(JSON.stringify(result, null, 2), {
    status: result.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
