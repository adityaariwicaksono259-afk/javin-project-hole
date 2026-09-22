// GET /api/buy/status?code=ORDER_CODE
// GET /api/buy/status?user_id=xxx
export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const userId = url.searchParams.get('user_id');

  try {
    if (code) {
      const order = await db.prepare(
        'SELECT order_code, user_id, package_qty, package_price, status, key_generated, admin_note, created_at, updated_at FROM web_orders WHERE order_code = ?'
      ).bind(code).first();
      if (!order) return json({ ok: false, message: 'Order tidak ditemukan' }, 404);
      if (order.status !== 'approved') order.key_generated = null;
      return json({ ok: true, order: order });
    }

    if (userId) {
      const rows = await db.prepare(
        'SELECT order_code, package_qty, package_price, status, key_generated, admin_note, created_at, updated_at FROM web_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
      ).bind(userId).all();
      const list = (rows.results || []).map(function(o){
        if (o.status !== 'approved') o.key_generated = null;
        return o;
      });
      return json({ ok: true, orders: list });
    }

    return json({ ok: false, message: 'Kasih ?code= atau ?user_id=' }, 400);
  } catch (e) {
    console.error('[BUY-STATUS]', e.message);
    return json({ ok: false, message: 'DB error: ' + e.message }, 500);
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
