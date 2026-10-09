import { json, ensureSchema, getMe } from './_lib.js';

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);
  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);

  let body;
  try { body = await request.json(); } catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }
  const target = String(body.target || '').trim();
  const action = String(body.action || 'block');
  if (!target || target === me.code) return json({ ok: false, message: 'Target tidak valid' }, 400);

  if (action === 'status') {
    const b = await db.prepare(
      'SELECT 1 FROM user_blocks WHERE blocker_code = ? AND blocked_code = ?'
    ).bind(me.code, target).first();
    return json({ ok: true, blocked: !!b });
  }

  if (action === 'block') {
    await db.prepare(
      'INSERT OR IGNORE INTO user_blocks (blocker_code, blocked_code, created_at) VALUES (?, ?, ?)'
    ).bind(me.code, target, Date.now()).run();
    return json({ ok: true, action: 'blocked' });
  }

  if (action === 'unblock') {
    await db.prepare(
      'DELETE FROM user_blocks WHERE blocker_code = ? AND blocked_code = ?'
    ).bind(me.code, target).run();
    return json({ ok: true, action: 'unblocked' });
  }

  return json({ ok: false, message: 'Action tidak dikenal' }, 400);
}
