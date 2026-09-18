import { verifyAdmin } from './admin/auth.js';

export async function onRequestGet({ request, env }) {
  try {
    const auth = await verifyAdmin(request, env);
    if (!auth.ok) return auth.response;

    const db = env.JAVIN_DB;
    const rows = await db.prepare('SELECT * FROM premium_keys ORDER BY created_at DESC LIMIT 10').all();

    return new Response(JSON.stringify({ ok: true, rows: rows.results || [] }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message, stack: e.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
