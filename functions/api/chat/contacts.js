import { json, ensureSchema, getMe } from './_lib.js';

// GET /api/chat/contacts — list user lain
export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  await ensureSchema(db);
  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);

  // Ambil yang diblokir (kedua arah)
  const blocked = await db.prepare(
    'SELECT blocked_code FROM user_blocks WHERE blocker_code = ?'
  ).bind(me.code).all();
  const blockedBy = await db.prepare(
    'SELECT blocker_code FROM user_blocks WHERE blocked_code = ?'
  ).bind(me.code).all();

  const exclude = new Set();
  (blocked.results || []).forEach(r => exclude.add(r.blocked_code));
  (blockedBy.results || []).forEach(r => exclude.add(r.blocker_code));
  exclude.add(me.code);

  const users = await db.prepare(
    'SELECT user_code, name, avatar, last_login FROM auth_users WHERE user_code != ? ORDER BY last_login DESC LIMIT 100'
  ).bind(me.code).all();

  const list = (users.results || [])
    .filter(u => !exclude.has(u.user_code))
    .map(u => ({
      code: u.user_code,
      name: u.name || 'User',
      avatar: u.avatar || '',
      lastSeen: u.last_login || 0
    }));

  return json({ ok: true, me: me, contacts: list });
}
