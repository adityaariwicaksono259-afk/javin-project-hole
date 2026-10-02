with open('functions/api/proxy.js', 'r') as f:
    code = f.read()

# ===== 1. Di getUserStatus: cari by id atau user_code =====
old1 = """  if (effectiveUserId) {
    try {
      const authUser = await db.prepare(
        'SELECT tier, tier_expires_at FROM auth_users WHERE id = ?'
      ).bind(effectiveUserId).first();

      if (authUser && authUser.tier) {"""

new1 = """  if (effectiveUserId) {
    try {
      // Cari by id dulu, fallback ke user_code
      let authUser = await db.prepare(
        'SELECT tier, tier_expires_at FROM auth_users WHERE id = ?'
      ).bind(effectiveUserId).first();

      if (!authUser) {
        authUser = await db.prepare(
          'SELECT tier, tier_expires_at FROM auth_users WHERE user_code = ?'
        ).bind(effectiveUserId).first();
      }

      if (authUser && authUser.tier) {"""

if old1 not in code:
    print("ERROR: blok 1 tidak ditemukan")
    exit(1)
code = code.replace(old1, new1, 1)
print("OK: lookup auth_users by id/user_code")

# ===== 2. Sama untuk userRow (tabel users) =====
old2 = """  const todayStart = getWibDayStartMs();
  const userRow = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  const countRow = await db.prepare(
    'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND created_at >= ? AND status >= 200 AND status < 300'
  ).bind(userId, todayStart).first();
  const used = (countRow && countRow.c) || 0;"""

new2 = """  const todayStart = getWibDayStartMs();
  let userRow = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  const countRow = await db.prepare(
    'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND created_at >= ? AND status >= 200 AND status < 300'
  ).bind(userId, todayStart).first();
  const used = (countRow && countRow.c) || 0;"""

if old2 not in code:
    print("WARNING: blok 2 tidak ditemukan")
else:
    code = code.replace(old2, new2, 1)
    print("OK: userRow jadi let")

with open('functions/api/proxy.js', 'w') as f:
    f.write(code)

print("SELESAI")
