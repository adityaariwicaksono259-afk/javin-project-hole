with open('functions/api/proxy.js', 'r') as f:
    code = f.read()

# ===== 1. Ganti DEFAULT_LIMIT dengan TIER_LIMITS =====
old_default = "const DEFAULT_LIMIT = 15;"
new_default = "const DEFAULT_LIMIT = 15;\nconst TIER_LIMITS = { free: 15, basic: 70, pro: 150, unlimited: 500 };"

if old_default in code and "TIER_LIMITS" not in code:
    code = code.replace(old_default, new_default, 1)
    print("OK: TIER_LIMITS ditambahkan")

# ===== 2. Ganti fungsi getUserStatus =====
old_fn = """async function getUserStatus(db, userId) {
  const todayStart = getWibDayStartMs();
  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  const countRow = await db.prepare(
    'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND created_at >= ? AND status >= 200 AND status < 300'
  ).bind(userId, todayStart).first();
  const used = (countRow && countRow.c) || 0;
  let limit = DEFAULT_LIMIT;
  if (userRow && typeof userRow.extra_limit === 'number' && userRow.extra_limit > 0) {
    limit = userRow.extra_limit;
  }
  return { used: used, limit: limit, remaining: Math.max(0, limit - used) };
}"""

new_fn = """async function getSessionUserId(db, request) {
  if (!db || !request) return null;
  try {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/(?:^|;\\s*)javin_session=([^;]+)/);
    if (!match) return null;
    const token = decodeURIComponent(match[1]);
    const sess = await db.prepare(
      'SELECT user_id FROM auth_sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Date.now()).first();
    return sess ? sess.user_id : null;
  } catch(e) {
    return null;
  }
}

async function getUserStatus(db, userId, request) {
  const todayStart = getWibDayStartMs();
  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  const countRow = await db.prepare(
    'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND created_at >= ? AND status >= 200 AND status < 300'
  ).bind(userId, todayStart).first();
  const used = (countRow && countRow.c) || 0;

  let limit = DEFAULT_LIMIT;
  let tier = 'free';

  // Anti-bypass: prioritaskan session cookie (server-side)
  let authUserId = null;
  if (request) {
    authUserId = await getSessionUserId(db, request);
  }
  const effectiveUserId = authUserId || userId;

  if (effectiveUserId) {
    try {
      const authUser = await db.prepare(
        'SELECT tier, tier_expires_at FROM auth_users WHERE id = ?'
      ).bind(effectiveUserId).first();

      if (authUser && authUser.tier) {
        const notExpired = !authUser.tier_expires_at || authUser.tier_expires_at > Date.now();
        if (notExpired && TIER_LIMITS[authUser.tier]) {
          limit = TIER_LIMITS[authUser.tier];
          tier = authUser.tier;
        }
      }
    } catch(e) {}
  }

  // Legacy: extra_limit (kalau lebih besar dari tier limit)
  if (userRow && typeof userRow.extra_limit === 'number' && userRow.extra_limit > limit) {
    limit = userRow.extra_limit;
    tier = 'custom';
  }

  return { used: used, limit: limit, remaining: Math.max(0, limit - used), tier: tier };
}"""

if old_fn not in code:
    print("ERROR: fungsi getUserStatus tidak ditemukan")
    exit(1)

code = code.replace(old_fn, new_fn, 1)
print("OK: getUserStatus di-update")

# ===== 3. Update caller biar pass request =====
old_call = "const status = await getUserStatus(db, userId);"
new_call = "const status = await getUserStatus(db, userId, request);"

if old_call in code:
    code = code.replace(old_call, new_call, 1)
    print("OK: caller di-update")
else:
    print("WARNING: caller tidak ditemukan")

with open('functions/api/proxy.js', 'w') as f:
    f.write(code)

print("SELESAI")
