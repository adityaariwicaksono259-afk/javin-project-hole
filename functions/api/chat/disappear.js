// POST /api/chat/disappear — { room_id, enabled: true/false } : toggle pesan sementara 24 jam
import { json, ensureSchema, getMe } from './_lib.js';

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
  const enabled = body.enabled === true;
  if (!roomId) return json({ ok: false, message: 'room_id wajib' }, 400);

  const room = await db.prepare(
    'SELECT id, user_a, user_b FROM chat_rooms WHERE id = ?'
  ).bind(roomId).first();
  if (!room) return json({ ok: false, message: 'Room tidak ditemukan' }, 404);
  if (room.user_a !== me.code && room.user_b !== me.code) {
    return json({ ok: false, message: 'Akses ditolak' }, 403);
  }

  try {
    await db.prepare(
      'UPDATE chat_rooms SET disappear = ? WHERE id = ?'
    ).bind(enabled ? 1 : 0, roomId).run();

    return json({ ok: true, enabled: enabled });
  } catch(e) {
    console.error('[DISAPPEAR]', e.message);
    console.error('[API-ERROR]', e.message); return json({ ok: false, message: 'Internal error' }, 500);
  }
}
