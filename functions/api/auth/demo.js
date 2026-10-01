// POST /api/auth/demo — mulai demo session
// GET  /api/auth/demo — cek status demo
import { json } from '../../_lib/oauth.js';

const DEMO_TTL_MS = 60 * 60 * 1000; // 1 jam
const DEMO_LIMIT = 1;

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  // Cek IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Cek apakah IP udah pernah demo
  try {
    const existing = await db.prepare(
      'SELECT demo_user_id, created_at FROM demo_usage WHERE ip = ? LIMIT 1'
    ).bind(ip).first();

    if (existing) {
      return json({
        ok: false,
        message: 'Kamu sudah pernah mencoba mode demo. Silakan login untuk melanjutkan.',
        already_used: true
      }, 403);
    }
  } catch(e) {
    console.error('[DEMO] check error:', e.message);
  }

  // Bikin demo user
  const random = Math.random().toString(36).slice(2, 10);
  const demoUserId = 'demo-' + random;
  const userCode = 'DEMO-' + random.toUpperCase();
  const sessionToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const now = Date.now();
  const expiresAt = now + DEMO_TTL_MS;

  try {
    // Insert ke auth_users (biar konsisten sama sistem)
    await db.prepare(
      'INSERT INTO auth_users (id, user_code, email, name, avatar, provider, provider_id, extra_limit, tier, tier_expires_at, created_at, last_login) ' +
      'VALUES (?, ?, NULL, "Demo User", NULL, "demo", ?, ?, "demo", ?, ?, ?)'
    ).bind(demoUserId, userCode, demoUserId, DEMO_LIMIT, expiresAt, now, now).run();

    // Insert session
    await db.prepare(
      'INSERT INTO auth_sessions (token, user_id, created_at, expires_at, last_used) ' +
      'VALUES (?, ?, ?, ?, ?)'
    ).bind(sessionToken, demoUserId, now, expiresAt, now).run();

    // Insert ke users (biar limit tracking jalan)
    await db.prepare(
      'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) ' +
      'VALUES (?, ?, ?, ?, 0)'
    ).bind(demoUserId, DEMO_LIMIT, now, now).run();

    // Catat IP
    await db.prepare(
      'INSERT INTO demo_usage (ip, demo_user_id, created_at) VALUES (?, ?, ?)'
    ).bind(ip, demoUserId, now).run();
  } catch(e) {
    console.error('[DEMO] insert error:', e.message);
    return json({ ok: false, message: 'Gagal bikin demo session: ' + e.message }, 500);
  }

  // Set cookie
  const cookieVal = 'javin_session=' + sessionToken + '; Path=/; Max-Age=' + (DEMO_TTL_MS / 1000) + '; HttpOnly; Secure; SameSite=Lax';

  return json({
    ok: true,
    demo: true,
    user_id: demoUserId,
    user_code: userCode,
    limit: DEMO_LIMIT,
    expires_at: expiresAt,
    message: 'Demo aktif 1 jam. Limit 1 request.'
  }, 200, { 'Set-Cookie': cookieVal });
}

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const existing = await db.prepare(
      'SELECT demo_user_id, created_at FROM demo_usage WHERE ip = ? LIMIT 1'
    ).bind(ip).first();

    return json({
      ok: true,
      used_before: !!existing,
      demo_user_id: existing ? existing.demo_user_id : null
    });
  } catch(e) {
    return json({ ok: false, message: 'DB error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
