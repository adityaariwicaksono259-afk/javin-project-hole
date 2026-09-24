// GET /api/admin/users - list semua user + stats
// POST /api/admin/users - update user (set extra_limit)
import { verifyAdmin } from './auth.js';

export async function onRequestGet({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  try {
    const users = await db.prepare(
      'SELECT id, extra_limit, total_request, created_at, last_seen FROM users ORDER BY last_seen DESC LIMIT 200'
    ).all();

    const rows = (users.results || []).map(function (u) {
      return {
        id: u.id,
        extra_limit: u.extra_limit || 0,
        total_request: u.total_request || 0,
        created_at: u.created_at,
        last_seen: u.last_seen
      };
    });

    // Hitung hari ini per user (batch query)
    const todayCounts = {};
    try {
      const q = await db.prepare(
        'SELECT user_id, COUNT(*) as c FROM logs WHERE created_at >= ? GROUP BY user_id'
      ).bind(todayStart.getTime()).all();
      (q.results || []).forEach(function (r) { todayCounts[r.user_id] = r.c; });
    } catch (e) {}

    return json({
      ok: true,
      users: rows.map(function (u) {
        return Object.assign({}, u, { today: todayCounts[u.id] || 0 });
      })
    });
  } catch (e) {
    console.error('[DB ERROR]', e.message);
    return json({ ok: false, message: 'Terjadi kesalahan internal.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const extra = parseInt(body.extra_limit);

    if (!id || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
      return json({ ok: false, message: 'User ID tidak valid.' }, 400);
    }
    if (!isFinite(extra) || extra < 0 || extra > 100000) {
      return json({ ok: false, message: 'Limit harus antara 0-100000.' }, 400);
    }

    const existing = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();

    if (existing) {
      await db.prepare('UPDATE users SET extra_limit = ? WHERE id = ?').bind(extra, id).run();
    } else {
      const now = Date.now();
      await db.prepare(
        'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, ?, ?, ?, 0)'
      ).bind(id, extra, now, now).run();
    }

    return json({ ok: true, message: 'User diupdate.' });
  } catch (e) {
    console.error('[ERROR]', e.message);
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
    const id = String(reqUrl.searchParams.get('id') || '').trim();
    if (!id) return json({ ok: false, message: 'ID wajib.' }, 400);

    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    await db.prepare('DELETE FROM logs WHERE user_id = ?').bind(id).run();

    return json({ ok: true, message: 'User dihapus.' });
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
