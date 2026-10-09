// POST /api/chat/appeal — { message } : kirim banding ban
// GET  /api/chat/appeal         : cek status banding user
import { json, getMe } from './_lib.js';

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);
  if (!me.banned) return json({ ok: false, message: 'Akun kamu nggak sedang dibanned' }, 400);

  let body;
  try { body = await request.json(); } catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }
  const message = String(body.message || '').trim().slice(0, 1000);
  if (!message || message.length < 20) {
    return json({ ok: false, message: 'Pesan banding minimal 20 karakter' }, 400);
  }

  // Cek apakah udah pernah appeal untuk ban ini
  try {
    const existing = await db.prepare(
      'SELECT id, status FROM ban_appeals WHERE ban_id = ? LIMIT 1'
    ).bind(me.ban_id).first();

    if (existing) {
      return json({
        ok: false,
        message: 'Kamu udah kirim banding untuk ban ini. Status: ' + existing.status,
        appeal_status: existing.status
      }, 409);
    }

    await db.prepare(
      'INSERT INTO ban_appeals (ban_id, user_code, message, status, created_at) VALUES (?, ?, ?, "pending", ?)'
    ).bind(me.ban_id, me.code, message, Date.now()).run();

    return json({
      ok: true,
      message: 'Banding terkirim. Admin akan review dalam 1-3 hari.'
    });
  } catch(e) {
    console.error('[APPEAL]', e.message);
    console.error('[API-ERROR]', e.message); return json({ ok: false, message: 'Gagal kirim banding: (silakan hubungi admin)' }, 500);
  }
}

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);
  if (!me.banned) return json({ ok: false, message: 'Akun kamu nggak sedang dibanned' }, 400);

  try {
    const appeal = await db.prepare(
      'SELECT status, message, admin_note, created_at, resolved_at FROM ban_appeals WHERE ban_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(me.ban_id).first();

    return json({
      ok: true,
      appeal: appeal || null
    });
  } catch(e) {
    console.error('[API-ERROR]', e.message); return json({ ok: false, message: 'Internal error' }, 500);
  }
}
