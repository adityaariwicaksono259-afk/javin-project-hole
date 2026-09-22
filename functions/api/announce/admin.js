// Admin endpoints untuk manage announcement
import { verifyAdmin } from '../admin/auth.js';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

// GET /api/announce/admin — list semua (termasuk nonaktif)
export async function onRequestGet({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  try {
    const rows = await db.prepare(
      'SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50'
    ).all();
    return json({ ok: true, announcements: rows.results || [] });
  } catch (e) {
    return json({ ok: false, message: 'DB error' }, 500);
  }
}

// POST /api/announce/admin — bikin announcement baru
export async function onRequestPost({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const title = String(body.title || '').trim().slice(0, 100);
  const message = String(body.message || '').trim().slice(0, 2000);
  const type = String(body.type || 'info').toLowerCase();
  const expiresIn = parseInt(body.expires_in || 0); // durasi dalam jam, 0 = tanpa expired

  if (!title || !message) {
    return json({ ok: false, message: 'Judul dan pesan wajib' }, 400);
  }

  if (!['info', 'warning', 'success', 'danger', 'maintenance'].includes(type)) {
    return json({ ok: false, message: 'Tipe tidak valid' }, 400);
  }

  const now = Date.now();
  const expiresAt = expiresIn > 0 ? (now + expiresIn * 60 * 60 * 1000) : null;

  try {
    const r = await db.prepare(
      'INSERT INTO announcements (title, message, type, active, created_at, expires_at) VALUES (?, ?, ?, 1, ?, ?)'
    ).bind(title, message, type, now, expiresAt).run();

    return json({ ok: true, id: r.meta.last_row_id, message: 'Announcement dibuat' });
  } catch (e) {
    return json({ ok: false, message: 'DB error: ' + e.message }, 500);
  }
}

// DELETE /api/announce/admin?id=N — hapus announcement
export async function onRequestDelete({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id'));

  if (!id) return json({ ok: false, message: 'ID wajib' }, 400);

  try {
    await db.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run();
    return json({ ok: true, message: 'Dihapus' });
  } catch (e) {
    return json({ ok: false, message: 'DB error' }, 500);
  }
}
