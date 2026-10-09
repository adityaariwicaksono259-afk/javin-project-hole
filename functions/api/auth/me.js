// GET /api/auth/me — cek user login
import { json } from '../../_lib/oauth.js';
import { generateUniqueApiKey, DEFAULT_CREDITS } from '../../_lib/gen-api-key.js';

export async function onRequestGet({ request, env }) {
  var db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  var cookie = request.headers.get('Cookie') || '';
  var now = Date.now();

  // Prioritas: cek javin_demo dulu (mode demo)
  var demoMatch = cookie.match(/(?:^|;\s*)javin_demo=([^;]+)/);
  var match = demoMatch || cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);
  if (!match) return json({ ok: false, logged_in: false });

  var token = decodeURIComponent(match[1]);
  var isDemo = !!demoMatch;

  var session = await db.prepare(
    'SELECT * FROM auth_sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();

  if (!session) return json({ ok: false, logged_in: false });

  var user = await db.prepare('SELECT * FROM auth_users WHERE id = ?').bind(session.user_id).first();
  if (!user) return json({ ok: false, logged_in: false });

  // ==== Auto-generate api_key + credits kalau NULL (user lama & demo) ====
  let needsUpdate = false;
  let newApiKey = user.api_key;
  let newCredits = user.credits;

  if (!newApiKey) {
    newApiKey = await generateUniqueApiKey(db);
    needsUpdate = true;
  }
  if (newCredits === null || newCredits === undefined) {
    newCredits = DEFAULT_CREDITS;
    needsUpdate = true;
  }

  if (needsUpdate) {
    try {
      await db.prepare(
        'UPDATE auth_users SET api_key = ?, credits = ? WHERE id = ?'
      ).bind(newApiKey, newCredits, user.id).run();
      user.api_key = newApiKey;
      user.credits = newCredits;
      console.log('[ME] Auto-gen api_key for user ' + user.id + ' → ' + newApiKey);
    } catch (e) {
      console.error('[ME] Auto-gen error:', e.message);
    }
  }

  // Update last_used
  try {
    await db.prepare('UPDATE auth_sessions SET last_used = ? WHERE token = ?').bind(now, token).run();
  } catch(e) {}

  return json({
    ok: true,
    logged_in: true,
    is_demo: isDemo,
    user: {
      id: user.id,
      user_code: user.user_code,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      extra_limit: user.extra_limit,
      api_key: user.api_key || null,
      credits: user.credits || 0,
      tier: user.tier || 'free',
      tier_expires_at: user.tier_expires_at || 0,
      created_at: user.created_at || null,
      bio: user.bio || '',
      onboarded: user.onboarded || 0
    }
  });
}
