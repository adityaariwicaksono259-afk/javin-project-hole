// GET /api/admin/logs - list 200 log terbaru
import { verifyAdmin } from './auth.js';

export async function onRequestGet({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  try {
    const reqUrl = new URL(request.url);
    const limit = Math.min(parseInt(reqUrl.searchParams.get('limit')) || 200, 500);
    const uid = String(reqUrl.searchParams.get('uid') || '').trim();

    let q, r;
    if (uid) {
      q = 'SELECT * FROM logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?';
      r = await db.prepare(q).bind(uid, limit).all();
    } else {
      q = 'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?';
      r = await db.prepare(q).bind(limit).all();
    }

    return json({ ok: true, logs: r.results || [] });
  } catch (e) {
    console.error('[DB ERROR]', e.message);
    return json({ ok: false, message: 'Terjadi kesalahan internal.' }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  try {
    const reqUrl = new URL(request.url);
    const before = parseInt(reqUrl.searchParams.get('before'));
    if (!isFinite(before)) {
      // Hapus semua
      await db.prepare('DELETE FROM logs').run();
      return json({ ok: true, message: 'Semua log dihapus.' });
    }
    await db.prepare('DELETE FROM logs WHERE created_at < ?').bind(before).run();
    return json({ ok: true, message: 'Log lama dihapus.' });
  } catch (e) {
    console.error('[ERROR]', e.message);
    return json({ ok: false, message: 'Terjadi kesalahan internal.' }, 500);
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
