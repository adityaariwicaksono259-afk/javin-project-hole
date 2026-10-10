// Webhook untuk bot SECURITY
import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';
import { handleSoundCommand, handleSoundFile } from '../../_lib/sound-commands.js';
import { cmdAdmin, cmdUsers, cmdUserDel, cmdKeys, cmdLogs, cmdLogsClear, cmdConfig, cmdBackup, cmdAnnounce } from '../../_lib/bot-admin.js';
import { cmdWhitelistAdd, cmdUnban, cmdBan, cmdAppeals, cmdApprove, cmdReject, cmdUserBan, cmdUserUnban, cmdUserBanList, cmdPemberitahuan, cmdApiAdd, handleApiStep, handleEditStep, handleWebsiteStep, cmdCancel, cmdApiList, cmdApiEdit, cmdApiHide, cmdApiRestore, cmdTestGithub, cmdCariEndpoint } from '../../_lib/bot-admin.js';
import { cmdSetTier, cmdRemoveTier, cmdTierInfo } from '../../_lib/bot-admin.js';
import { editTelegramMessage, answerCallbackQuery } from '../../_lib/telegram.js';
import { SUPPORT_TEMPLATES, getTemplatesByCategory } from '../../_lib/support-templates.js';
import { cmdOsintIp, cmdOsintIpInfo, cmdOsintDns, cmdOsintReverse, cmdOsintWhois, cmdOsintSubdomain, cmdOsintCve, cmdOsintHeaders, cmdOsintSsl, cmdOsintPhone, cmdOsintQr, cmdOsintHash, cmdOsintPassword, cmdOsintUsername, cmdOsintPortscan } from '../../_lib/osint-commands.js';

async function reply(env, chatId, text) {
  console.log('[BOT-REPLY] Sending to chatId:', chatId, 'text:', text.slice(0, 60));
  const res = await sendTelegram(env, text, { type: 'bot-reply', throttleMs: 0 });
  console.log('[BOT-REPLY] Result:', JSON.stringify(res));
  return res;
}

export async function onRequestPost({ request, env }) {
  // Verifikasi secret token dari Telegram (jika di-set)
  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
  const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET || '';
  if (expectedSecret && secretToken !== expectedSecret) {
    console.warn('[BOT-WEBHOOK] Invalid secret token');
    return new Response('forbidden', { status: 403 });
  }

  let update;
  try { update = await request.json(); }
  catch (e) { return new Response('bad', { status: 400 }); }

  console.log('[BOT-WEBHOOK] Update:', JSON.stringify(update).slice(0, 300));
  
  // ==== HANDLE CALLBACK QUERY (tombol support) ====
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbData = String(cb.data || '');
    const fromId = String(cb.from && cb.from.id || '');
    const adminIdCb = String(env.SHOP_ADMIN_CHAT_ID || '').trim();

    // Cek admin
    if (fromId !== adminIdCb) {
      await answerCallbackQuery(env, cb.id, '⛔ Akses ditolak.');
      return new Response('ok');
    }

    // Format callback_data: ai:TICKET_ID | ai_send:TICKET_ID | ai_regen:TICKET_ID | ai_cancel:TICKET_ID | sup:TICKET_ID:TEMPLATE_KEY
    const parts = cbData.split(':');

    // ==== AI REPLY: panggil AI, tampilkan draft ====
    if ((parts[0] === 'ai' || parts[0] === 'ai_regen') && parts.length === 2) {
      const ticketId = parseInt(parts[1], 10);
      const db = env.JAVIN_DB;
      const kv = env.JAVIN_KV;

      if (!ticketId) {
        await answerCallbackQuery(env, cb.id, 'Ticket ID invalid');
        return new Response('ok');
      }
      if (!db || !kv) {
        await answerCallbackQuery(env, cb.id, 'DB / KV gak siap');
        return new Response('ok');
      }

      try {
        const ticket = await db.prepare('SELECT id, type, title, message, user_name FROM support_tickets WHERE id = ?').bind(ticketId).first();
        if (!ticket) {
          await answerCallbackQuery(env, cb.id, 'Tiket #' + ticketId + ' gak ditemukan');
          return new Response('ok');
        }

        await answerCallbackQuery(env, cb.id, 'Memproses dengan AI...');

        const origin = new URL(request.url).origin;
        const aiRes = await fetch(origin + '/api/ai/generate-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: ticket.type,
            title: ticket.title || '',
            message: ticket.message || '',
            userName: ticket.user_name || ''
          })
        });
        const aiJson = await aiRes.json();

        if (!aiJson.ok) {
          await answerCallbackQuery(env, cb.id, 'AI error: ' + (aiJson.error || 'unknown'));
          return new Response('ok');
        }

        // Simpan draft + teks asli ke KV (expire 30 menit)
        const origText = (cb.message && cb.message.text) || '';
        // Ambil base text (sebelum section AI DRAFT kalau ada)
        let baseText = origText;
        const marker = '\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\ud83d\udcdd <b>AI DRAFT:</b>';
        if (origText.indexOf('AI DRAFT:') !== -1) {
          const idx = origText.indexOf(marker);
          if (idx !== -1) baseText = origText.slice(0, idx);
        }

        await kv.put('ai_draft:' + ticketId, aiJson.reply, { expirationTtl: 1800 });
        await kv.put('ai_orig:' + ticketId, baseText, { expirationTtl: 1800 });

        const newText = baseText
          + '\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501'
          + '\n\ud83d\udcdd <b>AI DRAFT:</b>\n\n'
          + aiJson.reply;

        const buttons = [
          [{ text: '\u2705 Kirim ke User', callback_data: 'ai_send:' + ticketId }],
          [{ text: '\ud83d\udd04 Regenerate', callback_data: 'ai_regen:' + ticketId }],
          [{ text: '\u274c Batal', callback_data: 'ai_cancel:' + ticketId }]
        ];

        await editTelegramMessage(env, cb.message.chat.id, cb.message.message_id, newText, buttons);
      } catch (e) {
        console.error('[AI-CB]', e.message);
        await answerCallbackQuery(env, cb.id, 'Error: ' + e.message);
      }
      return new Response('ok');
    }

    // ==== AI SEND: simpan draft ke DB ====
    if (parts[0] === 'ai_send' && parts.length === 2) {
      const ticketId = parseInt(parts[1], 10);
      const db = env.JAVIN_DB;
      const kv = env.JAVIN_KV;

      if (!db || !kv || !ticketId) {
        await answerCallbackQuery(env, cb.id, 'Data gak siap');
        return new Response('ok');
      }

      try {
        const draft = await kv.get('ai_draft:' + ticketId);
        if (!draft) {
          await answerCallbackQuery(env, cb.id, 'Draft expired. Klik AI Reply lagi.');
          return new Response('ok');
        }

        const now = Date.now();
        await db.prepare(
          'UPDATE support_tickets SET admin_reply = ?, status = "resolved", updated_at = ? WHERE id = ?'
        ).bind(draft, now, ticketId).run();

        const baseText = (await kv.get('ai_orig:' + ticketId)) || (cb.message && cb.message.text) || '';

        await kv.delete('ai_draft:' + ticketId);
        await kv.delete('ai_orig:' + ticketId);

        const newText = baseText
          + '\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501'
          + '\n\u2705 <b>TERKIRIM (AI)</b>'
          + '\n\ud83d\udd50 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19);

        await editTelegramMessage(env, cb.message.chat.id, cb.message.message_id, newText, []);
        await answerCallbackQuery(env, cb.id, 'Balasan AI terkirim ke user');
      } catch (e) {
        console.error('[AI-SEND]', e.message);
        await answerCallbackQuery(env, cb.id, 'Error: ' + e.message);
      }
      return new Response('ok');
    }

    // ==== AI CANCEL: balik ke tombol awal ====
    if (parts[0] === 'ai_cancel' && parts.length === 2) {
      const ticketId = parseInt(parts[1], 10);
      const kv = env.JAVIN_KV;

      if (!kv || !ticketId) {
        await answerCallbackQuery(env, cb.id, 'Data gak siap');
        return new Response('ok');
      }

      try {
        const baseText = (await kv.get('ai_orig:' + ticketId)) || (cb.message && cb.message.text) || '';
        await kv.delete('ai_draft:' + ticketId);
        await kv.delete('ai_orig:' + ticketId);

        // Rekonstruksi tombol template dari DB
        const db = env.JAVIN_DB;
        let buttons = [];
        if (db) {
          const ticket = await db.prepare('SELECT type FROM support_tickets WHERE id = ?').bind(ticketId).first();
          if (ticket) {
            const templateKeys = getTemplatesByCategory(ticket.type);
            templateKeys.forEach(function(key) {
              const tpl = SUPPORT_TEMPLATES[key];
              if (!tpl) return;
              buttons.push([{
                text: tpl.emoji + ' ' + tpl.label,
                callback_data: 'sup:' + ticketId + ':' + key
              }]);
            });
            buttons.unshift([{ text: '\ud83e\udd16 AI Reply', callback_data: 'ai:' + ticketId }]);
          }
        }

        await editTelegramMessage(env, cb.message.chat.id, cb.message.message_id, baseText, buttons);
        await answerCallbackQuery(env, cb.id, 'Dibatalkan');
      } catch (e) {
        console.error('[AI-CANCEL]', e.message);
        await answerCallbackQuery(env, cb.id, 'Error: ' + e.message);
      }
      return new Response('ok');
    }

    if (parts[0] === 'sup' && parts.length === 3) {
      const ticketId = parseInt(parts[1], 10);
      const tplKey = parts[2];
      const tpl = SUPPORT_TEMPLATES[tplKey];

      if (!tpl || !ticketId) {
        await answerCallbackQuery(env, cb.id, '❌ Template / ticket invalid');
        return new Response('ok');
      }

      const db = env.JAVIN_DB;
      if (!db) {
        await answerCallbackQuery(env, cb.id, '❌ DB error');
        return new Response('ok');
      }

      try {
        const now = Date.now();
        const adminReply = tpl.emoji + ' ' + tpl.reply;
        await db.prepare(
          'UPDATE support_tickets SET admin_reply = ?, status = "resolved", updated_at = ? WHERE id = ?'
        ).bind(adminReply, now, ticketId).run();

        // Jawab callback
        await answerCallbackQuery(env, cb.id, '✅ ' + tpl.label + ' terkirim ke user');

        // Edit pesan lama — ganti tombol jadi status
        const origText = cb.message && cb.message.text || '';
        const newText = origText + '\n\n━━━━━━━━━━━━━━━\n✅ <b>TERKIRIM:</b> ' + tpl.emoji + ' ' + tpl.label + '\n🕐 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19);

        await editTelegramMessage(env, cb.message.chat.id, cb.message.message_id, newText, []);
      } catch (e) {
        console.error('[SUPPORT-CB]', e.message);
        await answerCallbackQuery(env, cb.id, '❌ Error: ' + e.message);
      }
      return new Response('ok');
    }

    // Callback gak dikenal
    await answerCallbackQuery(env, cb.id, '');
    return new Response('ok');
  }

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
  
  // ==== INTERACTIVE SESSION CHECK (sebelum parse command) ====
  // Kalau user lagi di tengah flow interactive, forward ke handler session
  // Skip kalau text-nya command (mulai dengan /)
  if (!text.startsWith('/')) {
    try {
      const handledApi = await handleApiStep(env, chatId, text, reply);
      if (handledApi) return new Response('ok');

      const handledWebsite = await handleWebsiteStep(env, chatId, text, reply);
      if (handledWebsite) return new Response('ok');

      const handledEdit = await handleEditStep(env, chatId, text, reply);
      if (handledEdit) return new Response('ok');
    } catch(e) {
      console.error('[INTERACTIVE]', e.message);
    }
  }

  // Normalize command: hapus @bot, trim
  let cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();
  const args = text.slice(text.indexOf(cmd) + cmd.length).trim();
  console.log('[BOT-CMD]', cmd, '| args:', args, '| raw:', text);

  // Batasi command publik — hanya admin yang bisa akses command lain
  const publicCommands = ['/start', '/help', '/status'];
  if (!isAdmin && !publicCommands.includes(cmd)) {
    await reply(env, chatId, '⛔ Akses ditolak.');
    return new Response('ok');
  }

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
        '<code>/users</code> — List user\n' +
        '<code>/userdel &lt;id&gt;</code> — Hapus user\n' +
        '<code>/keys</code> — Premium keys\n' +
        '<code>/logs [n]</code> — Log terakhir\n' +
        '<code>/logsclear</code> — Hapus semua log\n' +
        '<code>/config</code> — Config server\n' +
        '<code>/backup</code> — Backup database\n' +
        '<code>/announce</code> — Manage announcement\n' +
        '<code>/stats</code> — Statistik server';

      help += '\n\n📢 <b>BROADCAST</b>\n' +
        '<code>/pemberitahuan &lt;teks&gt;</code> — Kirim pemberitahuan ke inbox semua user\n' +
        '<code>/pemberitahuan list</code> — List pemberitahuan\n' +
        '<code>/pemberitahuan hapus &lt;id&gt;</code> — Hapus';

      help += '\n\n🚫 <b>USER MODERATION</b>\n' +
        '<code>/appeals [status]</code> — List banding\n' +
        '<code>/approve &lt;id&gt;</code> — Setujui banding\n' +
        '<code>/reject &lt;id&gt; [note]</code> — Tolak banding\n' +
        '<code>/userban &lt;code&gt; [alasan]</code> — Ban user\n' +
        '<code>/userunban &lt;code&gt;</code> — Cabut ban\n' +
        '<code>/userbanlist</code> — List user dibanned';

      help += '\n\n🔧 <b>MAINTENANCE</b>\n' +
        '<code>/maintenance on|off|status</code>';

      help += '\n\n🎵 <b>SOUND</b>\n' +
        '<code>/addsound</code> — Upload sound\n' +
        '<code>/listsound</code> — List sound\n' +
        '<code>/setsound &lt;id&gt;</code> — Set aktif\n' +
        '<code>/delsound &lt;id&gt;</code> — Hapus\n' +
        '<code>/soundstatus</code> — Cek aktif';

      help += '\n\n🌐 <b>ENDPOINT MANAGEMENT</b>\n' +
        '<code>/api</code> — Tambah endpoint (interactive)\n' +
        '<code>/api &lt;url&gt;, &lt;nama&gt;, &lt;folder&gt;, &lt;desc&gt;</code> — Quick add\n' +
        '<code>/apilist [hidden|all]</code> — List endpoint bot\n' +
        '<code>/edit &lt;nama&gt;</code> — Edit endpoint\n' +
        '<code>/hapus &lt;nama&gt;</code> — Hide endpoint\n' +
        '<code>/pulihkan &lt;nama&gt;</code> — Restore endpoint\n' +
        '<code>/cariendpoint &lt;url&gt;</code> — Scan endpoint website\n' +
        '<code>/testgithub</code> — Test koneksi GitHub';

      help += '\n\n🌐 <b>IP MANAGEMENT</b>\n' +
        '<code>/whitelist &lt;ip&gt; [alasan]</code>\n' +
        '<code>/unban &lt;ip&gt;</code>\n' +
        '<code>/ban &lt;ip&gt; [alasan]</code>';

      help += '\n\n🎫 <b>TIER MANAGEMENT</b>\n' +
        '<code>/settier &lt;user_id&gt; &lt;tier&gt; [hari]</code>\n' +
        '<code>/removetier &lt;user_id&gt;</code>\n' +
        '<code>/tier &lt;user_id&gt;</code> — Cek tier\n' +
        '<code>/tambahlimit &lt;id&gt; &lt;jumlah&gt;</code>\n' +
        '<code>/resetlimit [id]</code>';

      help += '\n\n🔍 <b>OSINT</b>\n' +
        '<code>/ip &lt;target&gt;</code> · <code>/ipinfo</code> · <code>/dns</code> · <code>/reverse</code> · <code>/whois</code>\n' +
        '<code>/subdomain</code> · <code>/cve</code> · <code>/headers</code> · <code>/ssl</code> · <code>/phone</code>\n' +
        '<code>/qr</code> · <code>/hash</code> · <code>/password</code> · <code>/username</code> · <code>/portscan</code>';

      help += '\n\n⚙️ <b>OTHER</b>\n' +
        '<code>/cancel</code> — Batalin flow yang jalan';
    }

    await reply(env, chatId, help);;
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
  if (cmd === '/maintenance' || cmd === '/maintenancefitur' || cmd === '/mfitur') {
    const db = env.JAVIN_DB;

    // ============ SUBCOMMAND: /maintenance fitur ============
    // /maintenancefitur -> otomatis fitur mode, args dipakai langsung
  if (cmd === '/maintenancefitur' || cmd === '/mfitur') {
    args = 'fitur ' + (args || '').trim();
    args = args.trim();
  }

  if (args && args.startsWith('fitur')) {
      const sub = args.slice(5).trim();

      // ==== LIST (no arg atau 'stats') ====
      if (!sub || sub.toLowerCase() === 'stats') {
        try {
          const rows = await db.prepare(
            'SELECT feature_key, maintenance, reason, started_at FROM feature_status ORDER BY maintenance DESC, feature_key'
          ).all();

          let h = '🔧 <b>FITUR MAINTENANCE</b>\n\n';
          const list = rows.results || [];

          if (!list.length) {
            h += '<i>Belum ada fitur maintenance.</i>';
          } else {
            h += '<b>Status aktif:</b>\n';
            list.forEach(r => {
              const status = r.maintenance === 1 ? '🔧' : '✅';
              const reason = r.maintenance === 1 && r.reason ? ' · <i>' + escapeHtml(r.reason) + '</i>' : '';
              h += status + ' <code>' + escapeHtml(r.feature_key) + '</code>' + reason + '\n';
            });
          }

          h += '\n<b>Cara pakai:</b>\n';
          h += '<code>/maintenance fitur &lt;nama&gt; on [alasan]</code>\n';
          h += '<code>/maintenance fitur &lt;nama&gt; off</code>\n\n';
          h += '<b>Format nama:</b>\n';
          h += '• Fitur grup: <code>chat</code>, <code>endpoint</code>\n';
          h += '• Nama tool: <code>\"aio Downloader\"</code>, <code>c.ai</code>\n';
          h += '• Bulk (koma): <code>c.ai,amfinder,amsearch</code>\n';

          await reply(env, chatId, h);
        } catch (e) {
          await reply(env, chatId, '❌ Error: ' + escapeHtml(e.message));
        }
        return new Response('ok');
      }

      // ==== PARSE ARGS ====
      // Format: <nama> <action> [alasan]
      // Nama bisa: 'chat' / 'endpoint' / '"aio Downloader"' / 'c.ai,amfinder'
      // Nama dengan spasi wajib pakai quote atau koma (auto-detect)

      // Strategi:
      // 1. Cek kalau ada quote di awal → ambil sampe quote penutup
      // 2. Kalau nggak ada quote → ambil kata pertama (sampai spasi)
      // 3. Setelah nama → action (on/off) → sisanya alasan

      let namaRaw, action, reason;

      const quoteMatch = sub.match(/^"([^"]+)"\s+(\S+)\s*(.*)$/) ||
                         sub.match(/^'([^']+)'\s+(\S+)\s*(.*)$/);

      if (quoteMatch) {
        namaRaw = quoteMatch[1].trim();
        action = (quoteMatch[2] || '').toLowerCase();
        reason = (quoteMatch[3] || '').trim();
      } else {
        // Tanpa quote
        const parts = sub.split(/\s+/);
        // Cek kalau ada koma (bulk) → semua sebelum on/off adalah nama
        const onOffIdx = parts.findIndex(p => /^(on|off|aktif|mati)$/i.test(p));

        if (onOffIdx === -1) {
          await reply(env, chatId,
            '❓ Format: <code>/maintenance fitur &lt;nama&gt; on|off [alasan]</code>\n\n' +
            'Kalau nama ada spasi, pakai quote:\n' +
            '<code>/maintenance fitur \"aio Downloader\" on Update</code>'
          );
          return new Response('ok');
        }

        namaRaw = parts.slice(0, onOffIdx).join(' ').trim();
        action = parts[onOffIdx].toLowerCase();
        reason = parts.slice(onOffIdx + 1).join(' ').trim();
      }

      if (!namaRaw || !action) {
        await reply(env, chatId, '❓ Nama atau action kosong.');
        return new Response('ok');
      }

      // ==== RESOLVE NAMA → KEY ====
      const validGroups = ['chat', 'endpoint'];
      const resolvedKeys = [];
      const errors = [];

      // Split by koma (bulk)
      const namaList = namaRaw.split(',').map(s => s.trim()).filter(Boolean);

      // Load endpoints.json untuk validasi nama tool
      let endpointsList = [];
      try {
        const epRes = await fetch(new URL('/endpoints.json', request.url).toString());
        if (epRes.ok) {
          endpointsList = await epRes.json();
        }
      } catch (e) {
        console.error('[LOAD-ENDPOINTS]', e.message);
      }

      function findCatalogId(nama) {
        // Match case-insensitive, by name atau catalogId
        const n = nama.toLowerCase().trim();
        for (const ep of endpointsList) {
          if (!ep || typeof ep !== 'object') continue;
          if ((ep.name || '').toLowerCase() === n) return ep.catalogId;
          if ((ep.catalogId || '').toLowerCase() === n) return ep.catalogId;
        }
        return null;
      }

      for (const nama of namaList) {
        const lower = nama.toLowerCase();

        // Cek grup dulu
        if (validGroups.includes(lower)) {
          resolvedKeys.push(lower);
          continue;
        }

        // Cek tool via endpoints.json
        const cid = findCatalogId(nama);
        if (cid) {
          resolvedKeys.push('tool:' + cid);
        } else {
          errors.push(nama);
        }
      }

      if (!resolvedKeys.length) {
        await reply(env, chatId,
          '❌ <b>Nggak ada yang bisa diproses</b>\n\n' +
          (errors.length ? 'Nama nggak ketemu: ' + errors.map(e => '<code>' + escapeHtml(e) + '</code>').join(', ') + '\n\n' : '') +
          'Cek di /apilist atau /endpoints buat list nama tool yang tersedia.'
        );
        return new Response('ok');
      }

      // ==== ACTION: ON ====
      if (action === 'on' || action === 'aktif') {
        const finalReason = reason || 'Sedang dalam perbaikan';
        const success = [];
        const failed = [];

        for (const key of resolvedKeys) {
          try {
            await db.prepare(
              'INSERT INTO feature_status (feature_key, maintenance, reason, started_at, by_user) ' +
              'VALUES (?, 1, ?, ?, ?) ' +
              'ON CONFLICT(feature_key) DO UPDATE SET maintenance = 1, reason = excluded.reason, started_at = excluded.started_at, by_user = excluded.by_user'
            ).bind(key, finalReason, Date.now(), String(chatId)).run();
            success.push(key);
          } catch (e) {
            failed.push(key + ': ' + e.message);
          }
        }

        // Broadcast per key
        let broadcastCount = 0;
        for (const key of success) {
          try {
            const displayName = key.startsWith('tool:') ? key.slice(5) : key;
            const notice = await generateMaintenanceNotice(env, displayName, finalReason);
            await db.prepare(
              'INSERT INTO announcements (title, message, type, active, created_at, expires_at) VALUES (?, ?, ?, 1, ?, NULL)'
            ).bind(
              'Pemberitahuan: ' + displayName + ' sedang dalam perbaikan',
              notice,
              'maintenance',
              Date.now()
            ).run();
            broadcastCount++;
          } catch (e) { console.error('[BROADCAST]', e.message); }
        }

        let h = '🔧 <b>MAINTENANCE AKTIF</b>\n\n';
        h += '📝 Alasan: ' + escapeHtml(finalReason) + '\n';
        h += '⏰ Sejak: ' + new Date().toISOString().replace('T', ' ').slice(0, 19) + '\n\n';
        h += '<b>Fitur yang di-maintenance (' + success.length + '):</b>\n';
        success.forEach(k => { h += '• <code>' + escapeHtml(k) + '</code>\n'; });
        if (failed.length) {
          h += '\n<b>Gagal:</b>\n';
          failed.forEach(f => { h += '• ' + escapeHtml(f) + '\n'; });
        }
        h += '\n📢 Pemberitahuan terkirim ke inbox: <b>' + broadcastCount + '</b> user.\n';
        h += 'IP admin tetap bisa akses.\n\n';
        h += 'Matikan: <code>/maintenance fitur ' + namaRaw + ' off</code>';

        await reply(env, chatId, h);
        return new Response('ok');
      }

      // ==== ACTION: OFF ====
      if (action === 'off' || action === 'mati') {
        const success = [];
        const failed = [];

        for (const key of resolvedKeys) {
          try {
            // Hapus row dari DB (biar list bersih)
            await db.prepare(
              'DELETE FROM feature_status WHERE feature_key = ?'
            ).bind(key).run();
            success.push(key);
          } catch (e) {
            failed.push(key + ': ' + e.message);
          }
        }

        let h = '✅ <b>FITUR NORMAL KEMBALI</b>\n\n';
        h += '<b>Fitur aktif kembali (' + success.length + '):</b>\n';
        success.forEach(k => { h += '• <code>' + escapeHtml(k) + '</code>\n'; });
        if (failed.length) {
          h += '\n<b>Gagal:</b>\n';
          failed.forEach(f => { h += '• ' + escapeHtml(f) + '\n'; });
        }
        await reply(env, chatId, h);
        return new Response('ok');
      }

      await reply(env, chatId,
        '❓ Action nggak dikenal: <code>' + escapeHtml(action) + '</code>\n' +
        'Gunakan <code>on</code> atau <code>off</code>.'
      );
      return new Response('ok');
    }


    // ============ SUBCOMMAND EXISTING: on/off/status (mode global) ============
    if (!args || (args !== 'on' && args !== 'off' && args !== 'status')) {
      let st = '❓ tidak diketahui';
      try {
        const row = await db.prepare("SELECT value FROM config WHERE key = 'maintenance_mode'").first();
        const envOn = String(env.MAINTENANCE_MODE || '') === '1';
        const isOn = row ? row.value === '1' : envOn;
        st = isOn ? '🔧 <b>AKTIF</b>' : '✅ <b>NORMAL</b>';
      } catch (e) {}

      await reply(env, chatId,
        '🔧 <b>MAINTENANCE MODE</b>\n\n' +
        'Status: ' + st + '\n\n' +
        '<b>Global:</b>\n' +
        '<code>/maintenance on</code> — Semua web maintenance\n' +
        '<code>/maintenance off</code> — Matikan\n' +
        '<code>/maintenance status</code> — Cek status\n\n' +
        '<b>Per fitur:</b>\n' +
        '<code>/maintenance fitur</code> — List fitur\n' +
        '<code>/maintenance fitur &lt;key&gt; on [alasan]</code>\n' +
        '<code>/maintenance fitur &lt;key&gt; off</code>'
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
      await reply(env, chatId, '❌ Error: ' + escapeHtml(e.message));
    }
    return new Response('ok');
  }

  // ============ HELPER: GENERATE MAINTENANCE NOTICE (300 kata) ============
  async function generateMaintenanceNotice(env, featureKey, reason) {
    const featureName = featureKey === 'chat' ? 'Chat' : (featureKey === 'endpoint' ? 'Endpoint & Tools' : featureKey);

    // ⚠️ Bisa diganti dengan call AI, tapi default template aja
    return [
      'Hai semuanya,',
      '',
      'Kami ingin menginformasikan bahwa fitur ' + featureName + ' di Javin Codex saat ini sedang dalam proses perbaikan. Ini adalah langkah yang kami ambil untuk memastikan kualitas layanan tetap terjaga, sekaligus mempersiapkan beberapa peningkatan yang akan datang. Kami mohon maaf atas ketidaknyamanan yang mungkin timbul dari situasi ini.',
      '',
      'Alasan perbaikan kali ini: ' + reason + '. Tim kami sedang bekerja secepat mungkin untuk menyelesaikan proses ini. Kami tidak ingin terburu-buru karena prioritas kami adalah hasil yang stabil dan aman untuk semua pengguna. Setiap detail sedang kami periksa dengan teliti, mulai dari sisi performa hingga keamanan data kamu.',
      '',
      'Selama proses ini berlangsung, kamu masih bisa mengakses fitur-fitur lain di Javin Codex seperti biasa. Kami sengaja memisahkan sistem per-fitur supaya gangguan pada satu bagian tidak menghambat aktivitas kamu secara keseluruhan. Jadi kalau kamu sedang mengerjakan sesuatu yang tidak berkaitan dengan fitur ini, kamu bisa lanjut tanpa khawatir.',
      '',
      'Kalau ada pertanyaan, keluhan, atau butuh bantuan terkait hal ini, jangan ragu buat hubungi kami lewat halaman Support. Kami bakal dengan senang hati membantu dan menjelaskan situasinya lebih detail kalau kamu butuh. Semua masukan dari kamu sangat berarti buat kami — baik itu kritik, saran, atau sekadar cerita pengalaman pakai Javin Codex.',
      '',
      'Terima kasih banyak atas pengertian dan kesabarannya. Kami akan segera kabari lagi begitu fitur ini kembali normal. Sampai jumpa di update berikutnya, dan seperti biasa — gaskeun eksplor fitur lainnya! 🔥',
      '',
      '— Tim Javin Codex'
    ].join('\n');
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
  if (cmd === '/announce') {
    await cmdAnnounce(env, chatId, args, reply);
    return new Response('ok');
  }
  // ==== USER BAN & APPEAL COMMANDS ====
  if (cmd === '/appeals') {
    await cmdAppeals(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/approve') {
    await cmdApprove(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/reject') {
    await cmdReject(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/userban') {
    await cmdUserBan(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/userunban') {
    await cmdUserUnban(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/userbanlist') {
    await cmdUserBanList(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/pemberitahuan' || cmd === '/pemberitahuan' || cmd === '/broadcast') {
    await cmdPemberitahuan(env, chatId, args, reply);
    return new Response('ok');
  }

  // ==== ENDPOINT MANAGEMENT ====
  if (cmd === '/api') {
    await cmdApiAdd(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/apilist') {
    await cmdApiList(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/edit') {
    await cmdApiEdit(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/hapus') {
    await cmdApiHide(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/pulihkan') {
    await cmdApiRestore(env, chatId, args, reply);
    return new Response('ok');
  }
  if (cmd === '/cancel') {
    await cmdCancel(env, chatId, reply);
    return new Response('ok');
  }
  if (cmd === '/testgithub') {
    await cmdTestGithub(env, chatId, reply);
    return new Response('ok');
  }
  if (cmd === '/cariendpoint') {
    await cmdCariEndpoint(env, chatId, args, reply);
    return new Response('ok');
  }

  // ==== SOUND COMMANDS ====
  const soundCmds = ['/addsound', '/listsound', '/setsound', '/delsound', '/soundstatus'];
  if (soundCmds.includes(cmd)) {
    await handleSoundCommand(cmd, args, chatId, env, reply);
    return new Response('ok');
  }


  // ==== OSINT COMMANDS ====
  if (cmd === '/ip') { await cmdOsintIp(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/ipinfo') { await cmdOsintIpInfo(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/dns') { await cmdOsintDns(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/reverse') { await cmdOsintReverse(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/whois') { await cmdOsintWhois(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/subdomain') { await cmdOsintSubdomain(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/cve') { await cmdOsintCve(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/headers') { await cmdOsintHeaders(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/ssl') { await cmdOsintSsl(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/phone') { await cmdOsintPhone(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/qr') { await cmdOsintQr(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/hash') { await cmdOsintHash(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/password') { await cmdOsintPassword(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/username') { await cmdOsintUsername(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/portscan') { await cmdOsintPortscan(env, chatId, args, reply); return new Response('ok'); }

  // ==== IP MANAGEMENT ====
  if (cmd === '/whitelist') { await cmdWhitelistAdd(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/unban') { await cmdUnban(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/ban') { await cmdBan(env, chatId, args, reply); return new Response('ok'); }

  // ==== TIER MANAGEMENT ====
  if (cmd === '/settier') { await cmdSetTier(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/removetier') { await cmdRemoveTier(env, chatId, args, reply); return new Response('ok'); }
  if (cmd === '/tier') { await cmdTierInfo(env, chatId, args, reply); return new Response('ok'); }

  await reply(env, chatId, '❓ Command nggak dikenal. Ketik /help.');
  return new Response('ok');
}

export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, message: 'Security bot webhook aktif' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
