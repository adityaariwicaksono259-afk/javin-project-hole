// POST /api/user/complete-onboarding
// Body: { name (wajib), bio (opsional) }
// Avatar diupload terpisah via /api/user/avatar-upload
import { json, getMe } from '../chat/_lib.js';

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);
  if (me.banned) return json({ ok: false, message: 'Akun diblokir', banned: true }, 403);

  let body;
  try { body = await request.json(); } catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const name = String(body.name || '').trim().slice(0, 40);
  const bio = String(body.bio || '').trim().slice(0, 200);

  if (!name || name.length < 2) {
    return json({ ok: false, message: 'Nama minimal 2 karakter' }, 400);
  }

  try {
    await db.prepare(
      'UPDATE auth_users SET name = ?, bio = ?, onboarded = 1 WHERE user_code = ?'
    ).bind(name, bio, me.code).run();

    return json({
      ok: true,
      user: { code: me.code, name: name, bio: bio }
    });
  } catch(e) {
    console.error('[ONBOARD]', e.message);
    console.error('[API-ERROR]', e.message); return json({ ok: false, message: 'Gagal simpan: (silakan hubungi admin)' }, 500);
  }
}
