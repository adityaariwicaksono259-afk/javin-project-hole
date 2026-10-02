with open('functions/api/bot/webhook.js', 'r') as f:
    code = f.read()

# ===== 1. Tambah import =====
old_import = "import { cmdAdmin, cmdUsers, cmdUserDel, cmdKeys, cmdLogs, cmdLogsClear, cmdConfig, cmdBackup, cmdAnnounce } from '../../_lib/bot-admin.js';"

if old_import not in code:
    print("ERROR: import anchor tidak ditemukan")
    exit(1)

new_import = old_import + "\nimport { editTelegramMessage, answerCallbackQuery } from '../../_lib/telegram.js';\nimport { SUPPORT_TEMPLATES } from '../../_lib/support-templates.js';"

if "editTelegramMessage" not in code:
    code = code.replace(old_import, new_import, 1)
    print("OK: import ditambahkan")
else:
    print("SKIP: import sudah ada")

# ===== 2. Sisipkan handler callback_query sebelum const msg = update.message =====
anchor = "  const msg = update.message;"

if anchor not in code:
    print("ERROR: anchor msg tidak ditemukan")
    exit(1)

callback_handler = '''  // ==== HANDLE CALLBACK QUERY (tombol support) ====
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

    // Format: sup:TICKET_ID:TEMPLATE_KEY
    const parts = cbData.split(':');
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
        const newText = origText + '\\n\\n━━━━━━━━━━━━━━━\\n✅ <b>TERKIRIM:</b> ' + tpl.emoji + ' ' + tpl.label + '\\n🕐 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19);

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

'''

if "HANDLE CALLBACK QUERY" not in code:
    code = code.replace(anchor, callback_handler + anchor, 1)
    print("OK: handler callback_query ditambahkan")
else:
    print("SKIP: handler callback sudah ada")

with open('functions/api/bot/webhook.js', 'w') as f:
    f.write(code)

print("SELESAI")
