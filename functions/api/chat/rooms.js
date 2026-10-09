import { json, ensureSchema, getMe } from './_lib.js';

// GET  /api/chat/rooms   — list room user
// POST /api/chat/rooms   — buat/buka room dgn user tertentu
export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);
  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);

  const rooms = await db.prepare(
    `SELECT r.id, r.user_a, r.user_b, r.last_message_at,
       CASE WHEN r.user_a = ? THEN r.user_b ELSE r.user_a END AS other_code
     FROM chat_rooms r
     WHERE r.user_a = ? OR r.user_b = ?
     ORDER BY r.last_message_at DESC LIMIT 100`
  ).bind(me.code, me.code, me.code).all();

  const out = [];
  for (const r of (rooms.results || [])) {
    const other = await db.prepare(
      'SELECT user_code, name, avatar FROM auth_users WHERE user_code = ?'
    ).bind(r.other_code).first();
    const last = await db.prepare(
      'SELECT text, sender_code, created_at FROM chat_messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(r.id).first();
    const unread = await db.prepare(
      'SELECT COUNT(*) as c FROM chat_messages WHERE room_id = ? AND sender_code != ? AND read_at = 0'
    ).bind(r.id, me.code).first();
    out.push({
      id: r.id,
      other: {
        code: r.other_code,
        name: other ? (other.name || 'User') : 'User',
        avatar: other ? (other.avatar || '') : ''
      },
      lastMessage: last ? { text: last.text, fromMe: last.sender_code === me.code, time: last.created_at } : null,
      unread: (unread && unread.c) || 0
    });
  }
  return json({ ok: true, rooms: out });
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);
  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);

  let body;
  try { body = await request.json(); } catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }
  const target = String(body.target || '').trim();
  if (!target || target === me.code) return json({ ok: false, message: 'Target tidak valid' }, 400);

  const targetUser = await db.prepare(
    'SELECT user_code, name, avatar FROM auth_users WHERE user_code = ?'
  ).bind(target).first();
  if (!targetUser) return json({ ok: false, message: 'User tidak ditemukan' }, 404);

  const blocked = await db.prepare(
    'SELECT 1 FROM user_blocks WHERE (blocker_code = ? AND blocked_code = ?) OR (blocker_code = ? AND blocked_code = ?)'
  ).bind(me.code, target, target, me.code).first();
  if (blocked) return json({ ok: false, message: 'Tidak bisa memulai chat' }, 403);

  const a = me.code < target ? me.code : target;
  const b = me.code < target ? target : me.code;

  let room = await db.prepare(
    'SELECT id FROM chat_rooms WHERE user_a = ? AND user_b = ?'
  ).bind(a, b).first();

  if (!room) {
    const ins = await db.prepare(
      'INSERT INTO chat_rooms (user_a, user_b, created_at, last_message_at) VALUES (?, ?, ?, ?)'
    ).bind(a, b, Date.now(), 0).run();
    room = { id: ins.meta.last_row_id };
  }

  return json({
    ok: true,
    room: {
      id: room.id,
      other: { code: targetUser.user_code, name: targetUser.name || 'User', avatar: targetUser.avatar || '' }
    }
  });
}
