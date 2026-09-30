// POST /api/buy/create — bikin order baru
// GET  /api/buy/create — list paket
export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const tier = String(body.tier || '').trim().toLowerCase();
  const userId = String(body.user_id || '').trim().slice(0, 40);
  const userName = String(body.user_name || '').trim().slice(0, 60);

  const packages = {
    basic: { tier: 'basic', price: 3000, days: 5, label: 'Basic' },
    pro: { tier: 'pro', price: 8000, days: 12, label: 'Pro' },
    unlimited: { tier: 'unlimited', price: 30000, days: 36, label: 'Unlimited' }
  };

  const pkg = packages[tier];
  if (!pkg) return json({ ok: false, message: 'Paket tidak tersedia' }, 400);

  // Generate kode unik 3 digit (001-999)
  const uniqueCode = Math.floor(Math.random() * 999) + 1;
  const totalAmount = pkg.price + uniqueCode;

  // Generate order code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  const orderCode = 'ORD-' + rand;

  const now = Date.now();
  const expiresAt = now + (pkg.days * 24 * 60 * 60 * 1000);

  try {
    await db.prepare(
      'INSERT INTO web_orders (order_code, user_id, user_name, package_qty, package_price, total_amount, tier, unique_code, expires_at, status, created_at, updated_at) ' +
      'VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, "waiting_payment", ?, ?)'
    ).bind(orderCode, userId, userName, pkg.price, totalAmount, pkg.tier, uniqueCode, expiresAt, now, now).run();
  } catch (e) {
    console.error('[BUY-CREATE]', e.message);
    return json({ ok: false, message: 'Gagal bikin order: ' + e.message }, 500);
  }

  // Ambil info pembayaran
  let qrisUrl = null;
  let danaNumber = null;
  try {
    const r1 = await db.prepare("SELECT value FROM config WHERE key = 'shop_qris_file_id'").first();
    if (r1 && r1.value) qrisUrl = r1.value;
    const r2 = await db.prepare("SELECT value FROM config WHERE key = 'shop_dana_number'").first();
    if (r2 && r2.value) danaNumber = r2.value;
  } catch (e) {}

  return json({
    ok: true,
    order_code: orderCode,
    tier: pkg.tier,
    label: pkg.label,
    price: pkg.price,
    unique_code: uniqueCode,
    total_amount: totalAmount,
    duration_days: pkg.days,
    expires_at: expiresAt,
    qris_file_id: qrisUrl,
    dana_number: danaNumber,
    has_qris: !!qrisUrl,
    message: 'Order dibuat. Transfer sesuai nominal.'
  });
}

export async function onRequestGet() {
  return json({
    ok: true,
    packages: [
      { tier: 'basic', price: 3000, days: 5, label: 'Basic', limit: '100 req/hari' },
      { tier: 'pro', price: 8000, days: 12, label: 'Pro', limit: '500 req/hari' },
      { tier: 'unlimited', price: 30000, days: 36, label: 'Unlimited', limit: 'Unlimited' }
    ]
  });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
