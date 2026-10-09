// GET /api/chat/ban-status — cek status ban user
import { json, ensureSchema, getMe } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);

  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);

  if (me.banned) {
    return json({
      ok: true,
      banned: true,
      ban_id: me.ban_id,
      level: me.level || 'ringan',
      reason: me.reason || 'Melanggar aturan',
      until: me.until || 0,
      appeal: me.appeal || null
    });
  }

  return json({ ok: true, banned: false });
}
