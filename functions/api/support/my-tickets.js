// GET /api/support/my-tickets?user_id=JH-XXXX
// Return daftar tiket user + balasan admin
export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const url = new URL(request.url);
  const userId = String(url.searchParams.get('user_id') || '').trim().slice(0, 40);

  if (!userId) return json({ ok: false, message: 'user_id wajib' }, 400);

  try {
    const rows = await db.prepare(
      'SELECT id, type, title, message, status, admin_reply, created_at, updated_at FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(userId).all();

    return json({ ok: true, tickets: rows.results || [] });
  } catch (e) {
    console.error('[MY-TICKETS]', e.message);
    return json({ ok: false, message: 'DB error' }, 500);
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
