// POST /api/auth/demo — mulai demo session (device-bound)
// GET  /api/auth/demo?fingerprint=xxx — cek apakah device udah demo
import { json } from '../../_lib/oauth.js';

const DEMO_TTL_MS = 60 * 60 * 1000; // 1 jam
const DEMO_LIMIT = 3;

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const fingerprint = String(body.fingerprint || '').trim().slice(0, 128);

  if (!fingerprint || fingerprint.length < 16) {
    return json({ ok: false, message: 'Fingerprint gak valid.' }, 400);
  }

  // Cek device fingerprint
  try {
    const existing = await db.prepare(
      'SELECT guest_user_id, created_at FROM guest_devices WHERE fingerprint = ? LIMIT 1'
    ).bind(fingerprint).first();

    if (existing) {
      return json({
        ok: false,
        message: 'Device ini sudah pernah mencoba demo. Silakan login Google untuk melanjutkan.',
        already_used: true
      }, 403);
    }
  } catch(e) {
    console.error('[DEMO] check fp error:', e.message);
  }

  // Bikin demo user baru
  const random = Math.random().toString(36).slice(2, 10);
  const demoUserId = 'demo-' + random;
  const userCode = 'DEMO-' + random.toUpperCase();
  const sessionToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const now = Date.now();
  const expiresAt = now + DEMO_TTL_MS;

  try {
    // Insert ke auth_users (tier: demo)
    await db.prepare(
      'INSERT INTO auth_users (id, user_code, email, name, avatar, provider, provider_id, extra_limit, tier, tier_expires_at, created_at, last_login) ' +
      'VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      demoUserId,
      userCode,
      'Demo User',
      'demo',
      fingerprint,
      DEMO_LIMIT,
      'demo',
      expiresAt,
      now,
      now
    ).run();

    // Insert session
    await db.prepare(
      'INSERT INTO auth_sessions (token, user_id, created_at, expires_at, last_used) ' +
      'VALUES (?, ?, ?, ?, ?)'
    ).bind(sessionToken, demoUserId, now, expiresAt, now).run();

    // Insert ke tabel users (buat limit tracking)
    await db.prepare(
      'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) ' +
      'VALUES (?, ?, ?, ?, 0)'
    ).bind(demoUserId, DEMO_LIMIT, now, now).run();

    // Catat fingerprint device
    await db.prepare(
      'INSERT INTO guest_devices (fingerprint, guest_user_id, created_at) VALUES (?, ?, ?)'
    ).bind(fingerprint, demoUserId, now).run();
  } catch(e) {
    console.error('[DEMO] insert error:', e.message);
    return json({ ok: false, message: 'Gagal bikin demo: ' + e.message }, 500);
  }

  const cookieVal = 'javin_session=' + sessionToken + '; Path=/; Max-Age=' + (DEMO_TTL_MS / 1000) + '; HttpOnly; Secure; SameSite=Lax';

  return json({
    ok: true,
    demo: true,
    user_id: demoUserId,
    user_code: userCode,
    limit: DEMO_LIMIT,
    expires_at: expiresAt,
    message: 'Demo aktif 1 jam. Limit 3 request.'
  }, 200, { 'Set-Cookie': cookieVal });
}

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const url = new URL(request.url);
  const fingerprint = url.searchParams.get('fingerprint') || '';

  if (!fingerprint) return json({ ok: true, used_before: false });

  try {
    const existing = await db.prepare(
      'SELECT guest_user_id FROM guest_devices WHERE fingerprint = ? LIMIT 1'
    ).bind(fingerprint).first();

    return json({
      ok: true,
      used_before: !!existing,
      guest_user_id: existing ? existing.guest_user_id : null
    });
  } catch(e) {
    console.error('[DEMO] get error:', e.message);
    return json({ ok: false, message: 'DB error' }, 500);
  }
}
