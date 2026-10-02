with open('functions/api/bot/webhook.js', 'r') as f:
    code = f.read()

anchor = """    // Format: sup:TICKET_ID:TEMPLATE_KEY
    const parts = cbData.split(':');
    if (parts[0] === 'sup' && parts.length === 3) {"""

if anchor not in code:
    print("ERROR: anchor tidak ditemukan")
    exit(1)

ai_handlers = '''    // Format callback_data: ai:TICKET_ID | ai_send:TICKET_ID | ai_regen:TICKET_ID | ai_cancel:TICKET_ID | sup:TICKET_ID:TEMPLATE_KEY
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
        const marker = '\\n\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\ud83d\\udcdd <b>AI DRAFT:</b>';
        if (origText.indexOf('AI DRAFT:') !== -1) {
          const idx = origText.indexOf(marker);
          if (idx !== -1) baseText = origText.slice(0, idx);
        }

        await kv.put('ai_draft:' + ticketId, aiJson.reply, { expirationTtl: 1800 });
        await kv.put('ai_orig:' + ticketId, baseText, { expirationTtl: 1800 });

        const newText = baseText
          + '\\n\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501'
          + '\\n\\ud83d\\udcdd <b>AI DRAFT:</b>\\n\\n'
          + aiJson.reply;

        const buttons = [
          [{ text: '\\u2705 Kirim ke User', callback_data: 'ai_send:' + ticketId }],
          [{ text: '\\ud83d\\udd04 Regenerate', callback_data: 'ai_regen:' + ticketId }],
          [{ text: '\\u274c Batal', callback_data: 'ai_cancel:' + ticketId }]
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
          + '\\n\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501'
          + '\\n\\u2705 <b>TERKIRIM (AI)</b>'
          + '\\n\\ud83d\\udd50 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19);

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
            buttons.unshift([{ text: '\\ud83e\\udd16 AI Reply', callback_data: 'ai:' + ticketId }]);
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

    if (parts[0] === 'sup' && parts.length === 3) {'''

# Tambah import getTemplatesByCategory kalau belum ada
old_import = "import { SUPPORT_TEMPLATES } from '../../_lib/support-templates.js';"
new_import = "import { SUPPORT_TEMPLATES, getTemplatesByCategory } from '../../_lib/support-templates.js';"

if old_import in code and "getTemplatesByCategory" not in code.split("import")[1][:200]:
    code = code.replace(old_import, new_import, 1)
    print("OK: import getTemplatesByCategory ditambahkan")

code = code.replace(anchor, ai_handlers, 1)

with open('functions/api/bot/webhook.js', 'w') as f:
    f.write(code)

print("OK: AI handler ditambahkan")
