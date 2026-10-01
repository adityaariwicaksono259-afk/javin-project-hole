// GET /api/user/me?uid=JH-XXXXXX
// Prioritas: cookie session (javin_demo/javin_session) > uid param
const TIER_LIMITS = { free: 20, demo: 3, basic: 70, pro: 150, unlimited: 500 };
const DEFAULT_LIMIT = 20;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function getWibDayStartMs() {
  const nowWib = Date.now() + WIB_OFFSET_MS;
  const dayWib = Math.floor(nowWib / 86400000) * 86400000;
  return dayWib - WIB_OFFSET_MS;
}

function msUntilWibReset() {
  const nextDay = getWibDayStartMs() + 86400000;
  return Math.max(0, nextDay - Date.now());
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

async function getSessionUserId(db, request) {
  if (!db || !request) return null;
  try {
    const cookie = request.headers.get('Cookie') || '';

    // 1. Cek javin_demo dulu (prioritas demo mode)
    let match = cookie.match(/(?:^|;\s*)javin_demo=([^;]+)/);
    let isDemo = false;
    if (match) isDemo = true;
    if (!match) {
      match = cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);
    }
    if (!match) return null;

    const token = decodeURIComponent(match[1]);
    const sess = await db.prepare(
      'SELECT user_id FROM auth_sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Date.now()).first();
    if (!sess) return null;
    return { userId: sess.user_id, isDemo: isDemo };
  } catch(e) { return null; }
}

export async function onRequestGet({ request, env }) {
  const reqUrl = new URL(request.url);
  const uidParam = String(reqUrl.searchParams.get('uid') || '').trim().slice(0, 40);

  const db = env.JAVIN_DB;

  // Prioritas: cookie session
  let effectiveUserId = null;
  let viaSession = false;
  let isDemo = false;

  if (db) {
    const sess = await getSessionUserId(db, request);
    if (sess) {
      effectiveUserId = sess.userId;
      viaSession = true;
      isDemo = sess.isDemo;
    }
  }

  // Fallback ke uid param
  if (!effectiveUserId && uidParam) {
    effectiveUserId = uidParam;
  }

  if (!effectiveUserId) {
    return json({ ok: false, message: 'UID tidak valid.' }, 400);
  }

  if (!db) {
    return json({
      ok: true, uid: effectiveUserId, tier: 'free',
      limit: DEFAULT_LIMIT, used: 0, remaining: DEFAULT_LIMIT,
      reset_in_ms: msUntilWibReset()
    });
  }

  try {
    const todayStart = getWibDayStartMs();

    // Cari user di tabel users (limit tracking)
    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').bind(effectiveUserId).first();

    // Cari tier dari auth_users (by id atau user_code)
    let authUser = null;
    try {
      authUser = await db.prepare(
        'SELECT tier, tier_expires_at FROM auth_users WHERE id = ?'
      ).bind(effectiveUserId).first();
      if (!authUser && uidParam) {
        authUser = await db.prepare(
          'SELECT tier, tier_expires_at FROM auth_users WHERE user_code = ?'
        ).bind(uidParam).first();
      }
    } catch(e) {}

    const countRow = await db.prepare(
      'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND created_at >= ? AND status >= 200 AND status < 300'
    ).bind(effectiveUserId, todayStart).first();

    const used = (countRow && countRow.c) || 0;

    // Tentukan limit
    let limit = DEFAULT_LIMIT;
    let tier = 'free';

    if (authUser && authUser.tier) {
      const notExpired = !authUser.tier_expires_at || authUser.tier_expires_at > Date.now();
      if (notExpired && TIER_LIMITS[authUser.tier]) {
        limit = TIER_LIMITS[authUser.tier];
        tier = authUser.tier;
      }
    }

    // Override extra_limit (kalau lebih kecil dari tier, pakai extra_limit)
    if (userRow && typeof userRow.extra_limit === 'number' && userRow.extra_limit !== 0) {
      limit = userRow.extra_limit;
    }

    return json({
      ok: true,
      uid: effectiveUserId,
      tier: tier,
      is_demo: isDemo,
      via_session: viaSession,
      limit: limit,
      used: used,
      remaining: Math.max(0, limit - used),
      reset_in_ms: msUntilWibReset()
    });
  } catch (e) {
    console.error('[USER-ME]', e.message);
    return json({
      ok: true, uid: effectiveUserId, tier: 'free',
      limit: DEFAULT_LIMIT, used: 0, remaining: DEFAULT_LIMIT,
      reset_in_ms: msUntilWibReset()
    });
  }
}
