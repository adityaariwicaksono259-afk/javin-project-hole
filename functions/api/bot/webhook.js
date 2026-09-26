// Webhook untuk bot SECURITY
import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';
import { handleSoundCommand, handleSoundFile } from '../../_lib/sound-commands.js';
import { cmdAdmin, cmdUsers, cmdUserDel, cmdKeys, cmdLogs, cmdLogsClear, cmdConfig, cmdBackup } from '../../_lib/bot-admin.js';

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
  if (!msg) return new Response('ok');

  // ==== HANDLE FILE UPLOAD (audio dari admin) ====
  if (msg.audio || msg.voice || (msg.document && /audio|mp3|m4a|ogg|wav|aac/i.test(msg.document.mime_type || ''))) {
    const chatId0 = String(msg.chat.id);
    const adminId0 = String(env.SHOP_ADMIN_CHAT_ID || '').trim();
    if (chatId0 === adminId0) {
      await handleSoundFile(msg, env, reply);
    }
    return new Response('ok');
  }

  if (!msg.text) return new Response('ok');

  const chatId = String(msg.chat.id);
  const text = String(msg.text || '').trim();
  const adminId = String(env.SHOP_ADMIN_CHAT_ID || '').trim();
  const isAdmin = chatId === adminId;
  
  // Normalize command: hapus @bot, trim
  let cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();
  const args = text.slice(text.indexOf(cmd) + cmd.length).trim();
  console.log('[BOT-CMD]', cmd, '| args:', args, '| raw:', text);

  if (cmd === '/start' || cmd === '/help') {
    let help = '🤖 <b>JAVIN SECURITY BOT</b>\n\n' +
      'Bot ini otomatis ngirim notif:\n' +
      '• 🍯 Honeypot hit\n' +
      '• 🚫 IP autoban\n' +
      '• 🔐 Kode 2FA login\n\n' +
      'Ketik /status untuk cek server.';

    if (isAdmin) {
      help += '\n\n🛡️ <b>ADMIN PANEL</b>\n' +
        '<code>/admin</code> — Menu admin panel\n' +
        '<code>/users</code> — List user (atau <code>/users &lt;id&gt;</code>)\n' +
        '<code>/userdel &lt;id&gt;</code> — Hapus user\n' +
        '<code>/keys</code> — Premium keys (<code>gen N</code>, <code>revoke</code>, <code>del</code>)\n' +
        '<code>/logs [n]</code> — Log terakhir\n' +
        '<code>/logsclear</code> — Hapus semua log\n' +
        '<code>/config</code> — Config server (<code>KEY=VALUE</code> untuk set)\n' +
        '<code>/backup</code> — Backup database\n' +
        '<code>/tambahlimit &lt;id&gt; &lt;jumlah&gt;</code> — Tambah limit user\n' +
        '<code>/resetlimit [id]</code> — Reset limit user\n' +
        '\n🔧 <b>MAINTENANCE</b>\n' +
        '<code>/maintenance on</code> — Aktifkan maintenance\n' +
        '<code>/maintenance off</code> — Matikan\n' +
        '<code>/maintenance status</code> — Cek status\n' +
        '<code>/stats</code> — Statistik server\n' +
        '\n🎵 <b>SOUND</b>\n' +
        '<code>/addsound</code> — Panduan upload sound\n' +
        '<code>/listsound</code> — Liat semua sound\n' +
        '<code>/setsound &lt;id&gt;</code> — Ganti sound aktif\n' +
        '<code>/delsound &lt;id&gt;</code> — Hapus sound\n' +
        '<code>/soundstatus</code> — Liat sound aktif';
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

  // ==== /tambahlimit <user_id> <jumlah> ====
  if (cmd === '/tambahlimit' || cmd === '/addlimit') {
    const parts = args.trim().split(/\s+/);
    if (parts.length < 2) {
      await reply(env, chatId,
        '📝 <b>Cara pakai:</b>\n' +
        '<code>/tambahlimit &lt;user_id&gt; &lt;jumlah&gt;</code>\n\n' +
        '<b>Contoh:</b>\n' +
        '<code>/tambahlimit JH-2VVRLB 50</code>\n' +
        '<code>/tambahlimit JH-2VVRLB -10</code> (kurangi)'
      );
      return new Response('ok');
    }
    const targetId = parts[0];
    const amount = parseInt(parts[1]);
    if (isNaN(amount)) {
      await reply(env, chatId, '❌ Jumlah harus angka.');
      return new Response('ok');
    }
    try {
      const db = env.JAVIN_DB;
      const row = await db.prepare('SELECT id, extra_limit FROM users WHERE id = ?').bind(targetId).first();
      let newLimit;
      if (row) {
        newLimit = (row.extra_limit || 0) + amount;
        if (newLimit < 0) newLimit = 0;
        await db.prepare('UPDATE users SET extra_limit = ?, last_seen = ? WHERE id = ?')
          .bind(newLimit, Date.now(), targetId).run();
      } else {
        newLimit = Math.max(0, amount);
        await db.prepare(
          'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, ?, ?, ?, 0)'
        ).bind(targetId, newLimit, Date.now(), Date.now()).run();
      }
      await reply(env, chatId,
        '✅ <b>LIMIT UPDATED</b>\n\n' +
        'User: <code>' + escapeHtml(targetId) + '</code>\n' +
        'Perubahan: <b>' + (amount >= 0 ? '+' : '') + amount + '</b>\n' +
        'Total extra_limit: <b>' + newLimit + '</b>'
      );
    } catch (e) {
      await reply(env, chatId, '❌ Error: ' + e.message);
    }
    return new Response('ok');
  }

  // ==== /resetlimit [user_id] ====
  if (cmd === '/resetlimit') {
    try {
      const db = env.JAVIN_DB;
      const target = args.trim();
      if (target) {
        await db.prepare('UPDATE users SET total_request = 0 WHERE id = ?').bind(target).run();
        await reply(env, chatId, '✅ Reset limit user <code>' + escapeHtml(target) + '</code>');
      } else {
        const r = await db.prepare('UPDATE users SET total_request = 0').run();
        const count = (r.meta && r.meta.changes) || '?';
        await reply(env, chatId, '✅ Reset <b>' + count + '</b> user');
      }
    } catch (e) {
      await reply(env, chatId, '❌ Error: ' + e.message);
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

  // ==== ADMIN PANEL COMMANDS ====
  if (cmd === '/admin') {
    await cmdAdmin(env, chatId, reply);
    return new Response('ok');
  }
  if (cmd === '/users') {
    await cmdUsers(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/userinfo') {
    await cmdUsers(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/userdel') {
    await cmdUserDel(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/keys') {
    await cmdKeys(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/logs') {
    await cmdLogs(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/logsclear') {
    await cmdLogsClear(env, chatId, reply);
    return new Response('ok');
  }
  if (cmd === '/config') {
    await cmdConfig(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/backup') {
    await cmdBackup(env, chatId, reply);
    return new Response('ok');
  }

  // ==== SOUND COMMANDS ====
  const soundCmds = ['/addsound', '/listsound', '/setsound', '/delsound', '/soundstatus'];
  if (soundCmds.includes(cmd)) {
    await handleSoundCommand(cmd, args, chatId, env, reply);
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
