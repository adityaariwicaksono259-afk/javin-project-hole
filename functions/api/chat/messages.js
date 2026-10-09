import { json, ensureSchema, getMe } from './_lib.js';

async function roomGuard(db, roomId, meCode) {
  const r = await db.prepare(
    'SELECT id, user_a, user_b FROM chat_rooms WHERE id = ?'
  ).bind(roomId).first();
  if (!r) return null;
  if (r.user_a !== meCode && r.user_b !== meCode) return null;
  return r;
}

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);
  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);

  const url = new URL(request.url);
  const roomId = parseInt(url.searchParams.get('room_id') || '0', 10);
  if (!roomId) return json({ ok: false, message: 'room_id wajib' }, 400);

  const room = await roomGuard(db, roomId, me.code);
  if (!room) return json({ ok: false, message: 'Room tidak ditemukan' }, 404);

  const msgs = await db.prepare(
    'SELECT id, sender_code, text, created_at, read_at FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC LIMIT 500'
  ).bind(roomId).all();

  await db.prepare(
    'UPDATE chat_messages SET read_at = ? WHERE room_id = ? AND sender_code != ? AND read_at = 0'
  ).bind(Date.now(), roomId, me.code).run();

  const list = (msgs.results || []).map(m => ({
    id: m.id,
    fromMe: m.sender_code === me.code,
    text: m.text,
    time: m.created_at
  }));

  return json({ ok: true, messages: list });
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);
  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);

  let body;
  try { body = await request.json(); } catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }
  const roomId = parseInt(body.room_id || 0, 10);
  const text = String(body.text || '').trim().slice(0, 2000);
  if (!roomId || !text) return json({ ok: false, message: 'room_id & text wajib' }, 400);

  const room = await roomGuard(db, roomId, me.code);
  if (!room) return json({ ok: false, message: 'Room tidak ditemukan' }, 404);

  const otherCode = room.user_a === me.code ? room.user_b : room.user_a;
  const blocked = await db.prepare(
    'SELECT 1 FROM user_blocks WHERE (blocker_code = ? AND blocked_code = ?) OR (blocker_code = ? AND blocked_code = ?)'
  ).bind(me.code, otherCode, otherCode, me.code).first();
  if (blocked) return json({ ok: false, message: 'Chat diblokir' }, 403);

  const now = Date.now();
  const ins = await db.prepare(
    'INSERT INTO chat_messages (room_id, sender_code, text, created_at, read_at) VALUES (?, ?, ?, ?, 0)'
  ).bind(roomId, me.code, text, now).run();

  await db.prepare(
    'UPDATE chat_rooms SET last_message_at = ? WHERE id = ?'
  ).bind(now, roomId).run();

  return json({
    ok: true,
    message: { id: ins.meta.last_row_id, fromMe: true, text: text, time: now }
  });
}
