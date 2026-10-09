// POST /api/chat/typing   — { room_id } : tandai sedang mengetik (5 detik)
// GET  /api/chat/typing?room_id=X — cek siapa yang sedang mengetik
import { json, ensureSchema, getMe } from './_lib.js';

const TYPING_TTL = 5000;

async function roomGuard(db, roomId, meCode) {
  const r = await db.prepare(
    'SELECT id, user_a, user_b FROM chat_rooms WHERE id = ?'
  ).bind(roomId).first();
  if (!r) return null;
  if (r.user_a !== meCode && r.user_b !== meCode) return null;
  return r;
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);
  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);
  if (me.banned) return json({ ok: false, banned: true }, 403);

  let body;
  try { body = await request.json(); } catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }
  const roomId = parseInt(body.room_id || 0, 10);
  if (!roomId) return json({ ok: false, message: 'room_id wajib' }, 400);

  const room = await roomGuard(db, roomId, me.code);
  if (!room) return json({ ok: false, message: 'Room tidak ditemukan' }, 404);

  const until = Date.now() + TYPING_TTL;
  try {
    await db.prepare(
      'INSERT INTO chat_typing (room_id, user_code, until) VALUES (?, ?, ?) ON CONFLICT(room_id, user_code) DO UPDATE SET until = excluded.until'
    ).bind(roomId, me.code, until).run();
  } catch(e) {}

  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);
  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);
  if (me.banned) return json({ ok: false, banned: true }, 403);

  const url = new URL(request.url);
  const roomId = parseInt(url.searchParams.get('room_id') || '0', 10);
  if (!roomId) return json({ ok: false, message: 'room_id wajib' }, 400);

  const room = await roomGuard(db, roomId, me.code);
  if (!room) return json({ ok: false, message: 'Room tidak ditemukan' }, 404);

  const now = Date.now();
  // Cleanup expired
  try {
    await db.prepare('DELETE FROM chat_typing WHERE until < ?').bind(now).run();
  } catch(e) {}

  const rows = await db.prepare(
    'SELECT user_code FROM chat_typing WHERE room_id = ? AND user_code != ? AND until > ?'
  ).bind(roomId, me.code, now).all();

  const others = (rows.results || []).map(r => r.user_code);
  return json({ ok: true, typing: others.length > 0, typing_by: others });
}
