// GET /api/user/me?uid=JH-XXXXXX
// Return: { ok, uid, limit, used, remaining, reset_in_ms }

const DEFAULT_LIMIT = 15;
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

export async function onRequestGet({ request, env }) {
  const reqUrl = new URL(request.url);
  const uid = String(reqUrl.searchParams.get('uid') || '').trim().slice(0, 40);

  if (!uid || !/^[A-Za-z0-9_-]{1,40}$/.test(uid)) {
    return json({ ok: false, message: 'UID tidak valid.' }, 400);
  }

  const db = env.JAVIN_DB;
  if (!db) {
    return json({
      ok: true,
      uid: uid,
      limit: DEFAULT_LIMIT,
      used: 0,
      remaining: DEFAULT_LIMIT,
      reset_in_ms: msUntilWibReset()
    });
  }

  try {
    const todayStart = getWibDayStartMs();

    const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first();
    const countRow = await db.prepare(
      'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND created_at >= ? AND status >= 200 AND status < 300'
    ).bind(uid, todayStart).first();

    const used = (countRow && countRow.c) || 0;

    let limit = DEFAULT_LIMIT;
    if (userRow && typeof userRow.extra_limit === 'number' && userRow.extra_limit > 0) {
      limit = userRow.extra_limit;
    }

    return json({
      ok: true,
      uid: uid,
      limit: limit,
      used: used,
      remaining: Math.max(0, limit - used),
      reset_in_ms: msUntilWibReset()
    });
  } catch (e) {
    return json({
      ok: true,
      uid: uid,
      limit: DEFAULT_LIMIT,
      used: 0,
      remaining: DEFAULT_LIMIT,
      reset_in_ms: msUntilWibReset()
    });
  }
}
