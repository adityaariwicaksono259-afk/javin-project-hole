with open('functions/api/buy/create.js', 'r') as f:
    code = f.read()

# ===== Cari blok generate kode unik lama =====
old = """  // Generate kode unik 3 digit (001-999)
  const uniqueCode = Math.floor(Math.random() * 999) + 1;
  const totalAmount = pkg.price + uniqueCode;

  // Generate order code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  const orderCode = 'ORD-' + rand;

  const now = Date.now();
  const expiresAt = now + (pkg.days * 24 * 60 * 60 * 1000);
"""

new = """  // ===== Generate kode unik 3 digit dengan cek duplikat =====
  // Kode unik gak boleh sama dengan order aktif (status waiting_payment/pending_review)
  let uniqueCode = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = Math.floor(Math.random() * 999) + 1;
    try {
      const existing = await db.prepare(
        'SELECT id FROM web_orders WHERE package_price = ? AND unique_code = ? AND status IN ("waiting_payment", "pending_review") LIMIT 1'
      ).bind(pkg.price, candidate).first();
      if (!existing) {
        uniqueCode = candidate;
        break;
      }
    } catch (e) {
      console.error('[BUY-CREATE] check dup error:', e.message);
    }
  }

  // Fallback: kalau 30x gagal (harusnya hampir mustahil), pakai sequential
  if (uniqueCode === null) {
    console.warn('[BUY-CREATE] Fallback ke sequential');
    const usedRows = await db.prepare(
      'SELECT unique_code FROM web_orders WHERE package_price = ? AND status IN ("waiting_payment", "pending_review")'
    ).bind(pkg.price).all();
    const used = new Set((usedRows.results || []).map(r => r.unique_code));
    for (let i = 1; i <= 999; i++) {
      if (!used.has(i)) { uniqueCode = i; break; }
    }
    if (uniqueCode === null) {
      return json({ ok: false, message: 'Server sibuk, coba lagi nanti.' }, 503);
    }
  }

  const totalAmount = pkg.price + uniqueCode;

  // Generate order code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  const orderCode = 'ORD-' + rand;

  const now = Date.now();
  const expiresAt = now + (pkg.days * 24 * 60 * 60 * 1000);
"""

if old not in code:
    print("ERROR: blok kode unik tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)

with open('functions/api/buy/create.js', 'w') as f:
    f.write(code)

print("OK: kode unik unik-per-order ditambahkan")
