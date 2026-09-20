// Telegram Shop Bot Webhook
import { sendMessage, sendPhoto, editMessage, answerCallback, escapeHtml } from '../../_lib/shop-bot.js';

// ====== KONFIGURASI HARGA (bisa diubah dari config D1) ======
const DEFAULT_PACKAGES = [
  { qty: 1, price: 1000, label: '1 Key', bonus: 0 },
  { qty: 3, price: 2800, label: '3 Key', bonus: 200 },
  { qty: 5, price: 4500, label: '5 Key', bonus: 500 },
  { qty: 10, price: 8000, label: '10 Key', bonus: 2000 }
];

async function getPackages(env) {
  try {
    const row = await env.JAVIN_DB.prepare(
      'SELECT value FROM config WHERE key = ?'
    ).bind('shop_packages').first();
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_PACKAGES;
}

async function getQrisImage(env) {
  try {
    const row = await env.JAVIN_DB.prepare(
      'SELECT value FROM config WHERE key = ?'
    ).bind('shop_qris_file_id').first();
    if (row && row.value) return row.value;
  } catch (e) {}
  return null;
}

// ====== KEY GENERATOR ======
function genKey() {
  const n = Math.floor(Math.random() * 10000);
  return 'JV-' + String(n).padStart(4, '0');
}

async function generateKey(env, label) {
  const db = env.JAVIN_DB;
  for (let i = 0; i < 30; i++) {
    const key = genKey();
    const exist = await db.prepare('SELECT key FROM premium_keys WHERE key = ?').bind(key).first();
    if (!exist) {
      const now = Date.now();
      await db.prepare(
        'INSERT INTO premium_keys (key, label, owner_id, max_uses, used_count, status, created_at, last_used) VALUES (?, ?, NULL, 1, 0, "active", ?, NULL)'
      ).bind(key, label, now).run();
      return key;
    }
  }
  throw new Error('Failed to generate unique key');
}

// ====== MENU ======
async function showMenu(env, chatId) {
  const packages = await getPackages(env);
  const text = '🛒 <b>JAVIN SHOP</b>\n\n' +
    'Jual <b>Key Premium APK</b> (Alight Motion).\n' +
    '1 Key = 1x Generate Premium.\n\n' +
    '📦 <b>Paket tersedia:</b>';

  const buttons = packages.map(function(p) {
    const save = p.bonus > 0 ? ' (hemat Rp ' + p.bonus.toLocaleString('id-ID') + ')' : '';
    return [{
      text: '💎 ' + p.label + ' — Rp ' + p.price.toLocaleString('id-ID') + save,
      callback_data: 'buy_' + p.qty
    }];
  });

  buttons.push([{ text: '📖 Cara Pakai', callback_data: 'help' }]);

  await sendMessage(env, chatId, text, {
    reply_markup: { inline_keyboard: buttons }
  });
}

// ====== HANDLE ORDER ======
async function handleBuy(env, chatId, qty, user) {
  const packages = await getPackages(env);
  const pkg = packages.find(function(p){ return p.qty === qty; });
  if (!pkg) {
    await sendMessage(env, chatId, '❌ Paket tidak valid.');
    return;
  }

  const qrisFileId = await getQrisImage(env);
  if (!qrisFileId) {
    await sendMessage(env, chatId,
      '⚠️ <b>Sistem belum siap</b>\n\nAdmin belum set QRIS. Hubungi admin: @JekyNobb'
    );
    return;
  }

  // Bikin order di DB
  const db = env.JAVIN_DB;
  const now = Date.now();
  const result = await db.prepare(
    'INSERT INTO shop_orders (user_chat_id, user_username, user_name, package_qty, package_price, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, "awaiting_payment", ?, ?)'
  ).bind(
    String(chatId),
    user.username || '',
    (user.first_name || '') + (user.last_name ? ' ' + user.last_name : ''),
    qty,
    pkg.price,
    now, now
  ).run();

  const orderId = result.meta.last_row_id;

  // Kirim QRIS
  await sendPhoto(env, chatId, qrisFileId,
    '💳 <b>PEMBAYARAN</b>\n\n' +
    '📦 Paket: <b>' + pkg.label + '</b>\n' +
    '💰 Total: <b>Rp ' + pkg.price.toLocaleString('id-ID') + '</b>\n' +
    '🆔 Order ID: <code>#' + orderId + '</code>\n\n' +
    '👇 <b>Scan QRIS di atas</b> dan transfer sesuai nominal.\n\n' +
    'Setelah transfer, kirim <b>screenshot bukti</b> ke chat ini.',
    {
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Batal', callback_data: 'cancel_' + orderId }]]
      }
    }
  );
}

// ====== HANDLE SCREENSHOT ======
async function handleScreenshot(env, msg) {
  const db = env.JAVIN_DB;
  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1]; // resolusi terbesar
  const fileId = photo.file_id;

  // Cari order terakhir dengan status awaiting_payment
  const order = await db.prepare(
    'SELECT * FROM shop_orders WHERE user_chat_id = ? AND status = "awaiting_payment" ORDER BY created_at DESC LIMIT 1'
  ).bind(String(chatId)).first();

  if (!order) {
    await sendMessage(env, chatId,
      '❌ <b>Tidak ada order aktif.</b>\n\nKetik /beli untuk mulai pesan.'
    );
    return;
  }

  // Update order
  const now = Date.now();
  await db.prepare(
    'UPDATE shop_orders SET screenshot_file_id = ?, status = "pending_review", updated_at = ? WHERE id = ?'
  ).bind(fileId, now, order.id).run();

  // Konfirmasi ke user
  await sendMessage(env, chatId,
    '✅ <b>Bukti terkirim!</b>\n\n' +
    '🆔 Order: <code>#' + order.id + '</code>\n' +
    '⏳ Menunggu verifikasi admin (~5-15 menit).\n\n' +
    'Kamu akan dapet notifikasi begitu admin approve.'
  );

  // Forward ke admin
  const adminId = env.SHOP_ADMIN_CHAT_ID;
  if (!adminId) return;

  const user = msg.from;
  const username = user.username ? '@' + user.username : '(no username)';
  const name = (user.first_name || '') + (user.last_name ? ' ' + user.last_name : '');

  await sendPhoto(env, adminId, fileId,
    '🛒 <b>ORDER BARU</b>\n\n' +
    '🆔 Order: <code>#' + order.id + '</code>\n' +
    '👤 User: ' + escapeHtml(name) + ' (' + escapeHtml(username) + ')\n' +
    '📱 Chat ID: <code>' + chatId + '</code>\n' +
    '📦 Paket: <b>' + order.package_qty + ' Key</b>\n' +
    '💰 Harga: <b>Rp ' + order.package_price.toLocaleString('id-ID') + '</b>\n\n' +
    '👇 Cek bukti transfer di atas, lalu pilih:',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ APPROVE', callback_data: 'approve_' + order.id },
          { text: '❌ TOLAK', callback_data: 'reject_' + order.id }
        ]]
      }
    }
  );
}

// ====== HANDLE ADMIN CALLBACK ======
async function handleApprove(env, callback, orderId) {
  const db = env.JAVIN_DB;
  const order = await db.prepare('SELECT * FROM shop_orders WHERE id = ?').bind(orderId).first();
  if (!order) {
    await answerCallback(env, callback.id, 'Order tidak ditemukan', true);
    return;
  }
  if (order.status === 'approved') {
    await answerCallback(env, callback.id, 'Sudah di-approve sebelumnya', true);
    return;
  }

  // Generate N keys
  const qty = order.package_qty;
  const keys = [];
  try {
    for (let i = 0; i < qty; i++) {
      const key = await generateKey(env, order.user_username || ('chat_' + order.user_chat_id));
      keys.push(key);
    }
  } catch (e) {
    await answerCallback(env, callback.id, 'Gagal generate: ' + e.message, true);
    return;
  }

  const now = Date.now();
  await db.prepare(
    'UPDATE shop_orders SET status = "approved", key_generated = ?, updated_at = ? WHERE id = ?'
  ).bind(keys.join(','), now, orderId).run();

  // Kirim ke user
  const keyList = keys.map(function(k){ return '🔑 <code>' + k + '</code>'; }).join('\n');
  await sendMessage(env, order.user_chat_id,
    '🎉 <b>PEMBAYARAN DITERIMA!</b>\n\n' +
    '🆔 Order: <code>#' + order.id + '</code>\n' +
    '📦 Paket: <b>' + qty + ' Key</b>\n\n' +
    '🔑 <b>Key kamu:</b>\n' + keyList + '\n\n' +
    '📖 <b>Cara pakai:</b>\n' +
    '1. Buka https://jvin.pages.dev/premium.html\n' +
    '2. Masukkan key\n' +
    '3. Ikuti langkah generate premium\n\n' +
    '⚠️ 1 Key = 1x generate. Simpan baik-baik.'
  );

  await answerCallback(env, callback.id, '✅ Approved! Key terkirim ke user.');
  // Edit pesan admin
  await editMessage(env, callback.message.chat.id, callback.message.message_id,
    callback.message.caption + '\n\n✅ <b>APPROVED</b> — ' + keys.length + ' key terkirim'
  );
}

async function handleReject(env, callback, orderId) {
  const db = env.JAVIN_DB;
  const order = await db.prepare('SELECT * FROM shop_orders WHERE id = ?').bind(orderId).first();
  if (!order) {
    await answerCallback(env, callback.id, 'Order tidak ditemukan', true);
    return;
  }

  const now = Date.now();
  await db.prepare(
    'UPDATE shop_orders SET status = "rejected", updated_at = ? WHERE id = ?'
  ).bind(now, orderId).run();

  await sendMessage(env, order.user_chat_id,
    '❌ <b>Order Ditolak</b>\n\n' +
    '🆔 Order: <code>#' + order.id + '</code>\n\n' +
    'Admin menolak order ini. Kemungkinan:\n' +
    '• Bukti transfer tidak valid\n' +
    '• Nominal tidak sesuai\n' +
    '• Screenshot tidak jelas\n\n' +
    'Hubungi admin: @JekyNobb'
  );

  await answerCallback(env, callback.id, '❌ Rejected');
  await editMessage(env, callback.message.chat.id, callback.message.message_id,
    callback.message.caption + '\n\n❌ <b>REJECTED</b>'
  );
}

async function handleCancel(env, callback, orderId) {
  const db = env.JAVIN_DB;
  await db.prepare(
    'UPDATE shop_orders SET status = "cancelled", updated_at = ? WHERE id = ? AND status = "awaiting_payment"'
  ).bind(Date.now(), orderId).run();

  await answerCallback(env, callback.id, 'Order dibatalkan');
  await editMessage(env, callback.message.chat.id, callback.message.message_id,
    '❌ <b>Order #' + orderId + ' dibatalkan.</b>\n\nKetik /beli untuk mulai lagi.'
  );
}

// ====== HANDLE UPDATE ======
async function handleUpdate(env, update) {
  // Callback query (tombol)
  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || '';
    const chatId = cb.message.chat.id;

    if (data.startsWith('buy_')) {
      const qty = parseInt(data.slice(4));
      await answerCallback(env, cb.id);
      await handleBuy(env, chatId, qty, cb.from);
      return;
    }
    if (data.startsWith('approve_')) {
      await handleApprove(env, cb, parseInt(data.slice(8)));
      return;
    }
    if (data.startsWith('reject_')) {
      await handleReject(env, cb, parseInt(data.slice(7)));
      return;
    }
    if (data.startsWith('cancel_')) {
      await handleCancel(env, cb, parseInt(data.slice(7)));
      return;
    }
    if (data === 'help') {
      await answerCallback(env, cb.id);
      await sendMessage(env, chatId,
        '📖 <b>CARA PAKAI KEY</b>\n\n' +
        '1️⃣ Beli key: /beli\n' +
        '2️⃣ Transfer via QRIS\n' +
        '3️⃣ Kirim screenshot bukti\n' +
        '4️⃣ Tunggu admin approve\n' +
        '5️⃣ Dapet key, pakai di:\n' +
        '   https://jvin.pages.dev/premium.html\n\n' +
        '⚠️ <b>Penting:</b>\n' +
        '• 1 key = 1x generate premium\n' +
        '• Key permanen (tidak expired)\n' +
        '• Jangan share key ke orang lain\n\n' +
        '💬 Butuh bantuan? @JekyNobb'
      );
      return;
    }
    return;
  }

  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  // Command
  if (text === '/start' || text === '/menu') {
    await sendMessage(env, chatId,
      '👋 Selamat datang di <b>JAVIN SHOP</b>!\n\n' +
      'Ketik /beli untuk beli Key Premium APK.\n' +
      'Ketik /help untuk cara pakai.'
    );
    await showMenu(env, chatId);
    return;
  }

  if (text === '/beli') {
    await showMenu(env, chatId);
    return;
  }

  if (text === '/help') {
    await sendMessage(env, chatId,
      '📖 <b>CARA PAKAI</b>\n\n' +
      '/beli — Beli key baru\n' +
      '/menu — Menu utama\n\n' +
      'Butuh bantuan? @JekyNobb'
    );
    return;
  }

  // Foto (screenshot)
  if (msg.photo && msg.photo.length > 0) {
    await handleScreenshot(env, msg);
    return;
  }

  // Default
  await sendMessage(env, chatId,
    '❓ Perintah tidak dikenal.\n\nKetik /beli atau /help.'
  );
}

// ====== WEBHOOK HANDLER ======
export async function onRequestPost({ request, env }) {
  let update;
  try { update = await request.json(); }
  catch (e) { return new Response('bad', { status: 400 }); }

  try {
    await handleUpdate(env, update);
  } catch (e) {
    console.error('[SHOP] Error:', e.message);
  }

  return new Response('ok', { status: 200 });
}

export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, message: 'Shop webhook aktif' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
