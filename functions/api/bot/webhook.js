// Webhook untuk bot SECURITY
import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';

async function reply(env, chatId, text) {
  console.log('[BOT-REPLY] Sending to chatId:', chatId, 'text:', text.slice(0, 60));
  const res = await sendTelegram(env, text, { type: 'bot-reply', throttleMs: 0 });
  console.log('[BOT-REPLY] Result:', JSON.stringify(res));
  return res;
}

export async function onRequestPost({ request, env }) {
  let update;
  try { update = await request.json(); }
  catch (e) { return new Response('bad', { status: 400 }); }

  console.log('[BOT-WEBHOOK] Update:', JSON.stringify(update).slice(0, 300));
  
  const msg = update.message;
  if (!msg || !msg.text) return new Response('ok');

  const chatId = String(msg.chat.id);
  const text = String(msg.text || '').trim();
  const adminId = String(env.SHOP_ADMIN_CHAT_ID || '').trim();
  const isAdmin = chatId === adminId;
  
  // Normalize command: hapus @bot, trim
  let cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();
  const args = text.slice(text.indexOf(cmd) + cmd.length).trim();
  console.log('[BOT-CMD]', cmd, '| args:', args, '| raw:', text);
  const text = String(msg.text || '').trim();
  const adminId = String(env.SHOP_ADMIN_CHAT_ID || '').trim();
  const isAdmin = chatId === adminId;

  if (cmd === '/start' || cmd === '/help') {
    let help = '🤖 <b>JAVIN SECURITY BOT</b>\n\n' +
      'Bot ini otomatis ngirim notif:\n' +
      '• 🍯 Honeypot hit\n' +
      '• 🚫 IP autoban\n' +
      '• 🔐 Kode 2FA login\n\n' +
      'Ketik /status untuk cek server.';

    if (isAdmin) {
      help += '\n\n🛡️ <b>ADMIN COMMANDS</b>\n' +
        '<code>/maintenance on</code> — Aktifkan maintenance\n' +
        '<code>/maintenance off</code> — Matikan\n' +
        '<code>/maintenance status</code> — Cek status\n' +
        '<code>/stats</code> — Statistik server';
    }

    await reply(env, chatId, help);
    return new Response('ok');
  }

  if (cmd === '/status') {
    await reply(env, chatId,
      '✅ <b>Server Online</b>\n\n' +
      '🕐 ' + new Date().toISOString().replace('T', ' ').slice(0, 19) + '\n' +
      '🌐 https://jvin.pages.dev'
    );
    return new Response('ok');
  }

  if (!isAdmin) {
    await reply(env, chatId, '⛔ Command tidak dikenal.');
    return new Response('ok');
  }

  // ==== /maintenance ====
  if (cmd === '/maintenance') {
    const db = env.JAVIN_DB;
    // args udah di-normalize

    if (!args || (args !== 'on' && args !== 'off' && args !== 'status')) {
      let st = '❓ tidak diketahui';
      try {
        const row = await db.prepare("SELECT value FROM config WHERE key = 'maintenance_mode'").first();
        const envOn = String(env.MAINTENANCE_MODE || '') === '1';
        const isOn = row ? row.value === '1' : envOn;
        st = isOn ? '🔧 <b>AKTIF</b>' : '✅ <b>NORMAL</b>';
      } catch (e) {}

      await reply(env, chatId,
        '🔧 <b>MODE MAINTENANCE</b>\n\n' +
        'Status: ' + st + '\n\n' +
        '<b>Command:</b>\n' +
        '<code>/maintenance on</code> — Aktifkan\n' +
        '<code>/maintenance off</code> — Matikan\n' +
        '<code>/maintenance status</code> — Cek status'
      );
      return new Response('ok');
    }

    if (args === 'status') {
      let st = '❓';
      try {
        const row = await db.prepare("SELECT value FROM config WHERE key = 'maintenance_mode'").first();
        const envOn = String(env.MAINTENANCE_MODE || '') === '1';
        const isOn = row ? row.value === '1' : envOn;
        st = isOn ? '🔧 <b>AKTIF</b>' : '✅ <b>NORMAL</b>';
      } catch (e) {}
      await reply(env, chatId, '📊 Status: ' + st);
      return new Response('ok');
    }

    const newVal = args === 'on' ? '1' : '0';
    try {
      await db.prepare(
        "INSERT INTO config (key, value, updated_at) VALUES ('maintenance_mode', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      ).bind(newVal, Date.now()).run();

      if (newVal === '1') {
        await reply(env, chatId,
          '🔧 <b>MAINTENANCE AKTIF</b>\n\n' +
          'Semua user bakal redirect ke halaman maintenance.\n' +
          'IP admin tetap bisa akses.\n\n' +
          'Matikan: <code>/maintenance off</code>'
        );
      } else {
        await reply(env, chatId, '✅ <b>MAINTENANCE OFF</b>\n\nWebsite kembali normal.');
      }
    } catch (e) {
      await reply(env, chatId, '❌ Gagal: ' + e.message);
    }
    return new Response('ok');
  }

  if (cmd === '/stats') {
    try {
      const db = env.JAVIN_DB;
      const [users, keys, orders, blocked] = await Promise.all([
        db.prepare('SELECT COUNT(*) as c FROM users').first(),
        db.prepare('SELECT COUNT(*) as c FROM premium_keys').first(),
        db.prepare('SELECT COUNT(*) as c FROM web_orders').first(),
        db.prepare('SELECT COUNT(*) as c FROM blocked_ips WHERE until > ?').bind(Date.now()).first()
      ]);

      await reply(env, chatId,
        '📊 <b>STATISTIK</b>\n\n' +
        '👥 Users: <b>' + (users.c || 0) + '</b>\n' +
        '🔑 Keys: <b>' + (keys.c || 0) + '</b>\n' +
        '🛒 Orders: <b>' + (orders.c || 0) + '</b>\n' +
        '🚫 Blocked: <b>' + (blocked.c || 0) + '</b>'
      );
    } catch (e) {
      await reply(env, chatId, '❌ Error: ' + e.message);
    }
    return new Response('ok');
  }

  await reply(env, chatId, '❓ Command nggak dikenal. Ketik /help.');
  return new Response('ok');
}

export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, message: 'Security bot webhook aktif' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
