// POST /api/buy/upload — upload bukti transfer
import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let formData;
  try { formData = await request.formData(); }
  catch (e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const orderCode = String(formData.get('order_code') || '').trim();
  const file = formData.get('file');

  if (!orderCode) return json({ ok: false, message: 'Order code wajib' }, 400);
  if (!file || typeof file === 'string') return json({ ok: false, message: 'File wajib' }, 400);
  if (!ALLOWED_TYPES.includes(file.type)) return json({ ok: false, message: 'Tipe file tidak didukung' }, 400);
  if (file.size > MAX_SIZE) return json({ ok: false, message: 'File max 5 MB' }, 413);

  let order;
  try {
    order = await db.prepare('SELECT * FROM web_orders WHERE order_code = ?').bind(orderCode).first();
  } catch (e) { return json({ ok: false, message: 'DB error' }, 500); }

  if (!order) return json({ ok: false, message: 'Order tidak ditemukan' }, 404);
  if (order.status !== 'waiting_payment') {
    return json({ ok: false, message: 'Order sudah diproses sebelumnya' }, 400);
  }

  // Upload ke freeimage.host
  let imageUrl = null;
  try {
    const buf = await file.arrayBuffer();
    const fd = new FormData();
    fd.append('source', new Blob([buf], { type: file.type }), file.name || 'proof.jpg');
    fd.append('type', 'file');
    fd.append('action', 'upload');
    const r = await fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/120' },
      body: fd
    });
    const j = await r.json();
    if (j && j.image && j.image.url) imageUrl = j.image.url;
  } catch (e) {
    console.error('[BUY-UPLOAD]', e.message);
  }

  if (!imageUrl) return json({ ok: false, message: 'Gagal upload bukti' }, 502);

  const now = Date.now();
  try {
    await db.prepare(
      'UPDATE web_orders SET screenshot_url = ?, status = "pending_review", updated_at = ? WHERE order_code = ?'
    ).bind(imageUrl, now, orderCode).run();
  } catch (e) {
    return json({ ok: false, message: 'DB error' }, 500);
  }

  // Kirim ke Telegram admin
  const adminChatId = env.SHOP_ADMIN_CHAT_ID;
  if (adminChatId && env.SHOP_BOT_TOKEN) {
    try {
      const caption = '🛒 <b>ORDER BARU (Web)</b>\n\n' +
        '🆔 Kode: <code>' + escapeHtml(orderCode) + '</code>\n' +
        '👤 User: ' + escapeHtml(order.user_name || '-') + (order.user_id ? ' (<code>' + escapeHtml(order.user_id) + '</code>)' : '') + '\n' +
        '📦 Paket: <b>' + order.package_qty + ' Key</b>\n' +
        '💰 Harga: <b>Rp ' + order.package_price.toLocaleString('id-ID') + '</b>\n\n' +
        '👇 Cek bukti di atas:';

      const fd = new FormData();
      fd.append('chat_id', adminChatId);
      fd.append('photo', imageUrl);
      fd.append('caption', caption);
      fd.append('parse_mode', 'HTML');
      fd.append('reply_markup', JSON.stringify({
        inline_keyboard: [[
          { text: '✅ APPROVE', callback_data: 'webap_' + orderCode },
          { text: '❌ TOLAK', callback_data: 'webrj_' + orderCode }
        ]]
      }));

      await fetch('https://api.telegram.org/bot' + env.SHOP_BOT_TOKEN + '/sendPhoto', {
        method: 'POST',
        body: fd
      });
    } catch (e) {
      console.error('[BUY-UPLOAD] Telegram err:', e.message);
    }
  }

  return json({
    ok: true,
    message: 'Bukti terkirim! Tunggu verifikasi admin (~5-15 menit).',
    order_code: orderCode,
    status: 'pending_review'
  });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
