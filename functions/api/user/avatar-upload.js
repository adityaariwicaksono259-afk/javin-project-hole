// POST /api/user/avatar-upload — upload foto profil ke imgbb
// Body: multipart form-data { file }
// Return: { ok, avatar_url }
import { json } from '../../_lib/oauth.js';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function getSessionUserId(db, request) {
  if (!db || !request) return null;
  try {
    const cookie = request.headers.get('Cookie') || '';
    let match = cookie.match(/(?:^|;\s*)javin_demo=([^;]+)/);
    if (!match) match = cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);
    if (!match) return null;
    const token = decodeURIComponent(match[1]);
    const sess = await db.prepare(
      'SELECT user_id FROM auth_sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Date.now()).first();
    return sess ? sess.user_id : null;
  } catch(e) { return null; }
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const userId = await getSessionUserId(db, request);
  if (!userId) return json({ ok: false, message: 'Harus login dulu.' }, 401);

  let formData;
  try { formData = await request.formData(); }
  catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return json({ ok: false, message: 'File wajib.' }, 400);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return json({ ok: false, message: 'Tipe file tidak didukung (JPG/PNG/WEBP/GIF).' }, 400);
  }
  if (file.size > MAX_SIZE) {
    return json({ ok: false, message: 'File max 2 MB.' }, 413);
  }

  // Upload ke imgbb
  let imageUrl = null;
  try {
    const buf = await file.arrayBuffer();
    const fd = new FormData();
    fd.append('source', new Blob([buf], { type: file.type }), file.name || 'avatar.jpg');
    fd.append('type', 'file');
    fd.append('action', 'upload');
    const r = await fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/120' },
      body: fd
    });
    const j = await r.json();
    if (j && j.image && j.image.url) imageUrl = j.image.url;
  } catch(e) {
    console.error('[AVATAR-UPLOAD]', e.message);
  }

  if (!imageUrl) {
    return json({ ok: false, message: 'Gagal upload foto.' }, 502);
  }

  // Simpan URL ke auth_users.avatar (by id atau user_code)
  try {
    let r = await db.prepare(
      'UPDATE auth_users SET avatar = ? WHERE id = ?'
    ).bind(imageUrl, userId).run();

    if (!r.meta || !r.meta.changes) {
      // Coba cari by user_code
      await db.prepare(
        'UPDATE auth_users SET avatar = ? WHERE user_code = ?'
      ).bind(imageUrl, userId).run();
    }
  } catch(e) {
    console.error('[AVATAR-UPDATE]', e.message);
    return json({ ok: false, message: 'Gagal simpan avatar.' }, 500);
  }

  return json({ ok: true, avatar_url: imageUrl });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST' }, 405);
}
