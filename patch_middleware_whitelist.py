with open('functions/_middleware.js', 'r') as f:
    code = f.read()

old = """  const __adminIPs = String(context.env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
  const __isWhitelisted = __adminIPs.includes(__ip);"""

new = """  const __adminIPs = String(context.env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
  let __isWhitelisted = __adminIPs.includes(__ip);

  // Cek D1 whitelist juga (kalau belum whitelist dari env)
  if (!__isWhitelisted && __db) {
    try {
      const __wlRow = await __db.prepare(
        'SELECT ip FROM ip_whitelist WHERE ip = ? LIMIT 1'
      ).bind(__ip).first();
      if (__wlRow) __isWhitelisted = true;
    } catch(e) {
      console.error('[WHITELIST-DB]', e.message);
    }
  }"""

if old not in code:
    print("ERROR: blok adminIPs tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)
print("OK: middleware baca whitelist dari D1")

with open('functions/_middleware.js', 'w') as f:
    f.write(code)
print("SELESAI")
