// GET /api/announce/list — user cek announcement aktif
export async function onRequestGet({ env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  try {
    const now = Date.now();
    const rows = await db.prepare(
      'SELECT id, title, message, type, created_at FROM announcements WHERE active = 1 AND (expires_at IS NULL OR expires_at > ?) ORDER BY created_at DESC LIMIT 5'
    ).bind(now).all();

    return json({ ok: true, announcements: rows.results || [] });
  } catch (e) {
    console.error('[ANNOUNCE]', e.message);
    return json({ ok: false, message: 'Error' }, 500);
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
