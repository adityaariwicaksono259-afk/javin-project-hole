with open('functions/api/auth/demo.js', 'r') as f:
    code = f.read()

# ===== 1. Ganti TTL jadi 10 tahun (praktis unlimited) =====
old_ttl = "const DEMO_TTL_MS = 60 * 60 * 1000; // 1 jam"
new_ttl = "const DEMO_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 tahun (praktis unlimited)"

if old_ttl not in code:
    print("ERROR: TTL tidak ditemukan")
    exit(1)
code = code.replace(old_ttl, new_ttl, 1)
print("OK: TTL ganti ke 10 tahun")

# ===== 2. Ganti cookie jadi javin_demo =====
old_cookie = "  const cookieVal = 'javin_session=' + sessionToken + '; Path=/; Max-Age=' + (DEMO_TTL_MS / 1000) + '; HttpOnly; Secure; SameSite=Lax';"
new_cookie = "  const cookieVal = 'javin_demo=' + sessionToken + '; Path=/; Max-Age=' + (DEMO_TTL_MS / 1000) + '; HttpOnly; Secure; SameSite=Lax';"

if old_cookie not in code:
    print("ERROR: cookie tidak ditemukan")
    exit(1)
code = code.replace(old_cookie, new_cookie, 1)
print("OK: cookie javin_demo")

# ===== 3. Tambah logic restore: kalau fingerprint udah ada, restore session-nya =====
old_check = """  // Cek device fingerprint
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
  }"""

new_check = """  // Cek device fingerprint
  try {
    const existing = await db.prepare(
      'SELECT guest_user_id, created_at FROM guest_devices WHERE fingerprint = ? LIMIT 1'
    ).bind(fingerprint).first();

    if (existing) {
      // Cek apakah demo user masih ada & belum habis limit
      const demoUser = await db.prepare(
        'SELECT id, user_code, tier FROM auth_users WHERE id = ? LIMIT 1'
      ).bind(existing.guest_user_id).first();

      if (demoUser) {
        // Hitung jumlah request demo user
        const countRow = await db.prepare(
          'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND status >= 200 AND status < 300'
        ).bind(existing.guest_user_id).first();
        const used = (countRow && countRow.c) || 0;

        if (used < DEMO_LIMIT) {
          // Masih bisa dipakai → restore session
          const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
          const now = Date.now();
          const expiresAt = now + DEMO_TTL_MS;

          await db.prepare(
            'INSERT INTO auth_sessions (token, user_id, created_at, expires_at, last_used) VALUES (?, ?, ?, ?, ?)'
          ).bind(newToken, demoUser.id, now, expiresAt, now).run();

          const cookieVal = 'javin_demo=' + newToken + '; Path=/; Max-Age=' + (DEMO_TTL_MS / 1000) + '; HttpOnly; Secure; SameSite=Lax';

          return json({
            ok: true,
            restored: true,
            demo: true,
            user_id: demoUser.id,
            user_code: demoUser.user_code,
            limit: DEMO_LIMIT,
            used: used,
            message: 'Demo session dipulihkan.'
          }, 200, { 'Set-Cookie': cookieVal });
        } else {
          // Limit udah habis
          return json({
            ok: false,
            message: 'Limit demo sudah habis. Login Google untuk melanjutkan.',
            limit_reached: true
          }, 403);
        }
      }
    }
  } catch(e) {
    console.error('[DEMO] check fp error:', e.message);
  }"""

if old_check not in code:
    print("ERROR: blok check fingerprint tidak ditemukan")
    exit(1)
code = code.replace(old_check, new_check, 1)
print("OK: logic restore ditambahkan")

with open('functions/api/auth/demo.js', 'w') as f:
    f.write(code)
print("SELESAI")
