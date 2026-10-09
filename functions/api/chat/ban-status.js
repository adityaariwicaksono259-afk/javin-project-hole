import { json, ensureSchema, getMe } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);

  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);

  if (me.banned) {
    return json({ ok: true, banned: true, reason: me.reason || 'Melanggar aturan', until: me.until });
  }

  return json({ ok: true, banned: false });
}
