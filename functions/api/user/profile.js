// GET /api/user/profile?code=USER_CODE
// Lihat profil publik user lain (name, avatar, bio)
import { json, getMe } from '../chat/_lib.js';

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);
  if (me.banned) return json({ ok: false, message: 'Akun diblokir', banned: true }, 403);

  const url = new URL(request.url);
  const code = String(url.searchParams.get('code') || '').trim();
  if (!code) return json({ ok: false, message: 'Parameter code wajib' }, 400);

  const user = await db.prepare(
    'SELECT user_code, name, avatar, bio, created_at, last_login FROM auth_users WHERE user_code = ?'
  ).bind(code).first();

  if (!user) return json({ ok: false, message: 'User tidak ditemukan' }, 404);

  // Cek apakah user ini di-ban
  let isBanned = false;
  try {
    const ban = await db.prepare(
      'SELECT 1 FROM user_bans WHERE user_code = ? AND until > ?'
    ).bind(code, Date.now()).first();
    isBanned = !!ban;
  } catch(e) {}

  // Cek apakah aku blokir dia atau dia blokir aku
  let blockedByMe = false;
  let blockedByThem = false;
  try {
    const b1 = await db.prepare(
      'SELECT 1 FROM user_blocks WHERE blocker_code = ? AND blocked_code = ?'
    ).bind(me.code, code).first();
    blockedByMe = !!b1;

    const b2 = await db.prepare(
      'SELECT 1 FROM user_blocks WHERE blocker_code = ? AND blocked_code = ?'
    ).bind(code, me.code).first();
    blockedByThem = !!b2;
  } catch(e) {}

  return json({
    ok: true,
    profile: {
      code: user.user_code,
      name: user.name || 'User',
      avatar: user.avatar || '',
      bio: user.bio || '',
      joinedAt: user.created_at || 0,
      lastSeen: user.last_login || 0,
      isBanned: isBanned,
      isMe: user.user_code === me.code,
      blockedByMe: blockedByMe,
      blockedByThem: blockedByThem
    }
  });
}
