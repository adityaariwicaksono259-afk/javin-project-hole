with open('functions/api/proxy.js', 'r') as f:
    code = f.read()

# ===== Ganti blok if (userId && db) =====
old = """  // ==== Cek limit user ====
  if (userId && db) {
    try {
      const status = await getUserStatus(db, userId, request);

      if (status.used >= status.limit) {
        const remaining = msUntilWibReset();
        await logRequest(db, { user_id: userId, endpoint_id: id, status: 429 });
        return jsonRes(429, {
          ok: false,
          message: 'Limit harian habis (' + status.used + '/' + status.limit + '). Reset dalam ' + formatDuration(remaining) + ' (00:00 WIB).',
          limit: status.limit,
          used: status.used,
          reset_in_ms: remaining
        });
      }

      const now = Date.now();
      const userRow = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
      if (!userRow) {"""

new = """  // ==== Cek limit user (anti-bypass) ====
  // Prioritas: cookie session (server-side) > uid param (backward compat)
  if (db) {
    try {
      // Ambil userId dari session kalau ada
      let effectiveUserId = null;
      let viaSession = false;

      try {
        const sessionUserId = await getSessionUserId(db, request);
        if (sessionUserId) {
          effectiveUserId = sessionUserId;
          viaSession = true;
        }
      } catch(e) {}

      // Fallback ke uid param kalau gak ada session
      if (!effectiveUserId && userId) {
        effectiveUserId = userId;
      }

      // Kalau gak ada session DAN gak ada uid → tolak
      if (!effectiveUserId) {
        return jsonRes(401, {
          ok: false,
          message: 'Login dulu atau kirim parameter uid.',
          need_auth: true
        });
      }

      // Cek limit pakai effectiveUserId (bukan uid param)
      const status = await getUserStatus(db, effectiveUserId, request);

      if (status.used >= status.limit) {
        const remaining = msUntilWibReset();
        await logRequest(db, { user_id: effectiveUserId, endpoint_id: id, status: 429 });
        return jsonRes(429, {
          ok: false,
          message: 'Limit harian habis (' + status.used + '/' + status.limit + '). Reset dalam ' + formatDuration(remaining) + ' (00:00 WIB).',
          limit: status.limit,
          used: status.used,
          tier: status.tier,
          reset_in_ms: remaining
        });
      }

      const now = Date.now();
      const userRow = await db.prepare('SELECT id FROM users WHERE id = ?').bind(effectiveUserId).first();
      if (!userRow) {"""

if old not in code:
    print("ERROR: blok utama tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)
print("OK: blok cek limit di-update")

# ===== Update bagian INSERT user baru (pakai effectiveUserId) =====
old2 = """        await db.prepare(
          'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, 0, ?, ?, 0)'
        ).bind(userId, now, now).run();
      } else {
        await db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(now, userId).run();
      }"""

new2 = """        await db.prepare(
          'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, 0, ?, ?, 0)'
        ).bind(effectiveUserId, now, now).run();
      } else {
        await db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(now, effectiveUserId).run();
      }"""

if old2 not in code:
    print("ERROR: blok insert user tidak ditemukan")
    exit(1)

code = code.replace(old2, new2, 1)
print("OK: blok insert user di-update")

# ===== Update bagian catch (fallback userId) =====
old3 = """  } catch (e) {
      // fail-open
    }
  }

  // ==== MODE RAW"""

new3 = """  } catch (e) {
      console.error('[LIMIT-USER]', e.message);
      // fail-open: biar user tetap bisa akses kalau DB error
    }
  }

  // ==== MODE RAW"""

if old3 not in code:
    print("WARNING: blok catch tidak ditemukan (skip)")
else:
    code = code.replace(old3, new3, 1)
    print("OK: blok catch di-update")

# ===== Update bagian MODE RAW (biar pakai effectiveUserId juga) =====
old4 = """    await logRequest(db, { user_id: userId, endpoint_id: 'raw', status: rawRes.status });"""

new4 = """    await logRequest(db, { user_id: (typeof effectiveUserId !== 'undefined' && effectiveUserId) ? effectiveUserId : userId, endpoint_id: 'raw', status: rawRes.status });"""

if old4 in code:
    code = code.replace(old4, new4, 1)
    print("OK: blok raw di-update")

with open('functions/api/proxy.js', 'w') as f:
    f.write(code)

print("SELESAI")
