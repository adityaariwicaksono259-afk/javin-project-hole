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
  if (me.banned) return json({ ok: false, banned: true }, 403);

  const url = new URL(request.url);
  const roomId = parseInt(url.searchParams.get('room_id') || '0', 10);
  if (!roomId) return json({ ok: false, message: 'room_id wajib' }, 400);

  const room = await roomGuard(db, roomId, me.code);
  if (!room) return json({ ok: false, message: 'Room tidak ditemukan' }, 404);

  const now = Date.now();

  // 1. Tandai delivered: pesan dari lawan yang belum delivered
  await db.prepare(
    'UPDATE chat_messages SET delivered_at = ? WHERE room_id = ? AND sender_code != ? AND delivered_at = 0'
  ).bind(now, roomId, me.code).run();

  // 2. Tandai read: pesan dari lawan yang belum read
  await db.prepare(
    'UPDATE chat_messages SET read_at = ? WHERE room_id = ? AND sender_code != ? AND read_at = 0'
  ).bind(now, roomId, me.code).run();

  const msgs = await db.prepare(
    'SELECT id, sender_code, text, created_at, read_at, delivered_at FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC LIMIT 500'
  ).bind(roomId).all();

  const list = (msgs.results || []).map(m => ({
    id: m.id,
    fromMe: m.sender_code === me.code,
    text: m.text,
    time: m.created_at,
    delivered: (m.delivered_at || 0) > 0,
    read: (m.read_at || 0) > 0
  }));

  // 3. Ambil last_seen lawan
  const otherCode = room.user_a === me.code ? room.user_b : room.user_a;
  const otherUser = await db.prepare(
    'SELECT last_seen FROM auth_users WHERE user_code = ?'
  ).bind(otherCode).first();
  const lastSeen = (otherUser && otherUser.last_seen) || 0;
  const online = lastSeen > 0 && (now - lastSeen) < 30000;

  // Typing status (kalau diminta)
  var typing = false;
  if (url.searchParams.get('with_typing') === '1') {
    try {
      await db.prepare('DELETE FROM chat_typing WHERE until < ?').bind(now).run();
      const t = await db.prepare(
        'SELECT 1 FROM chat_typing WHERE room_id = ? AND user_code != ? AND until > ? LIMIT 1'
      ).bind(roomId, me.code, now).first();
      typing = !!t;
    } catch(e) {}
  }

  return json({
    ok: true,
    messages: list,
    other: { online: online, last_seen: lastSeen },
    typing: typing
  });
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
    'INSERT INTO chat_messages (room_id, sender_code, text, created_at, read_at, delivered_at) VALUES (?, ?, ?, ?, 0, 0)'
  ).bind(roomId, me.code, text, now).run();

  await db.prepare(
    'UPDATE chat_rooms SET last_message_at = ? WHERE id = ?'
  ).bind(now, roomId).run();

  // Hapus status typing (udah kirim pesan)
  try {
    await db.prepare(
      'DELETE FROM chat_typing WHERE room_id = ? AND user_code = ?'
    ).bind(roomId, me.code).run();
  } catch(e) {}

  return json({
    ok: true,
    message: {
      id: ins.meta.last_row_id,
      fromMe: true,
      text: text,
      time: now,
      delivered: false,
      read: false
    }
  });
}
