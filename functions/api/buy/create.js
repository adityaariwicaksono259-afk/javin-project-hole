// POST /api/buy/create — bikin order baru
// GET  /api/buy/create — list paket + cek QRIS
export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const qty = parseInt(body.package_qty);
  if (!isFinite(qty) || qty < 1 || qty > 100) return json({ ok: false, message: 'Paket tidak valid' }, 400);

  const userId = String(body.user_id || '').trim().slice(0, 40);
  const userName = String(body.user_name || '').trim().slice(0, 60);

  let packages = null;
  try {
    const row = await db.prepare("SELECT value FROM config WHERE key = 'shop_packages'").first();
    if (row && row.value) packages = JSON.parse(row.value);
  } catch (e) {}
  if (!Array.isArray(packages) || !packages.length) {
    packages = [
      { qty: 1, price: 1000, label: '1 Key' },
      { qty: 3, price: 2800, label: '3 Key' },
      { qty: 5, price: 4500, label: '5 Key' },
      { qty: 10, price: 8000, label: '10 Key' }
    ];
  }

  const pkg = packages.find(function(p){ return p.qty === qty; });
  if (!pkg) return json({ ok: false, message: 'Paket tidak tersedia' }, 400);

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'VIN-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

  const now = Date.now();
  try {
    await db.prepare(
      'INSERT INTO web_orders (order_code, user_id, user_name, package_qty, package_price, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, "waiting_payment", ?, ?)'
    ).bind(code, userId, userName, qty, pkg.price, now, now).run();
  } catch (e) {
    return json({ ok: false, message: 'Gagal bikin order: ' + e.message }, 500);
  }

  let qrisUrl = null;
  try {
    const r = await db.prepare("SELECT value FROM config WHERE key = 'shop_qris_file_id'").first();
    if (r && r.value) qrisUrl = r.value;
  } catch (e) {}

  return json({
    ok: true,
    order_code: code,
    package: { qty: qty, price: pkg.price, label: pkg.label },
    qris_file_id: qrisUrl,
    has_qris: !!qrisUrl,
    message: 'Order dibuat.'
  });
}

export async function onRequestGet({ env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let packages = null, qris = null;
  try {
    const r1 = await db.prepare("SELECT value FROM config WHERE key = 'shop_packages'").first();
    if (r1 && r1.value) packages = JSON.parse(r1.value);
    const r2 = await db.prepare("SELECT value FROM config WHERE key = 'shop_qris_file_id'").first();
    if (r2 && r2.value) qris = r2.value;
  } catch (e) {}

  if (!Array.isArray(packages) || !packages.length) {
    packages = [
      { qty: 1, price: 1000, label: '1 Key' },
      { qty: 3, price: 2800, label: '3 Key' },
      { qty: 5, price: 4500, label: '5 Key' },
      { qty: 10, price: 8000, label: '10 Key' }
    ];
  }

  return json({ ok: true, packages: packages, has_qris: !!qris });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
