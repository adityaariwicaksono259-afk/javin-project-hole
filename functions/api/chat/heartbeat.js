// POST /api/chat/heartbeat — update last_seen user
import { json, getMe } from './_lib.js';

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);
  if (me.banned) return json({ ok: false, banned: true }, 403);

  try {
    await db.prepare(
      'UPDATE auth_users SET last_seen = ? WHERE user_code = ?'
    ).bind(Date.now(), me.code).run();
    return json({ ok: true });
  } catch(e) {
    return json({ ok: false, message: e.message }, 500);
  }
}
