// POST /api/support/submit
// Body: { type, userId, userName, userContact, title, message }
import { sendTelegramWithButtons, escapeHtml } from '../../_lib/telegram.js';
import { SUPPORT_TEMPLATES, getTemplatesByCategory } from '../../_lib/support-templates.js';

const SIMPLE_REPLY = 'Aduan Anda akan diproses maksimal 1×24 jam.';

const CATEGORY_LABEL = {
  bug: '🐛 Bug Report',
  error: '⚠️ Error Report',
  saran: '💡 Saran Fitur',
  pembelian: '💰 Pembelian'
};

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const type = String(body.type || '').toLowerCase();
  if (!['bug', 'error', 'saran', 'pembelian'].includes(type)) {
    return json({ ok: false, message: 'Kategori harus: bug, error, saran, atau pembelian' }, 400);
  }

  const message = String(body.message || '').trim();
  if (!message || message.length < 5) {
    return json({ ok: false, message: 'Pesan minimal 5 karakter' }, 400);
  }
  if (message.length > 3000) {
    return json({ ok: false, message: 'Pesan max 3000 karakter' }, 413);
  }

  const userId = String(body.userId || '').trim().slice(0, 40);
  const userName = String(body.userName || '').trim().slice(0, 60);
  const userContact = String(body.userContact || '').trim().slice(0, 100);
  const title = String(body.title || '').trim().slice(0, 150);

  const now = Date.now();
  let ticketId;

  try {
    const r = await db.prepare(
      'INSERT INTO support_tickets (type, user_id, user_name, user_contact, title, message, status, admin_reply, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, "open", NULL, ?, ?)'
    ).bind(type, userId, userName, userContact, title, message, now, now).run();
    ticketId = r.meta.last_row_id;
  } catch (e) {
    console.error('[SUPPORT] DB error:', e.message);
    return json({ ok: false, message: 'Server error: ' + e.message }, 500);
  }

  // ==== Kirim ke Telegram admin dengan inline buttons ====
  try {
    const typeLabel = CATEGORY_LABEL[type] || type;
    const lines = [
      '📩 <b>NEW TICKET #' + ticketId + '</b>',
      '',
      '🏷️ ' + typeLabel,
      title ? '📌 <b>' + escapeHtml(title) + '</b>' : '',
      '👤 ' + escapeHtml(userName || 'Anonim') + (userId ? ' (<code>' + escapeHtml(userId) + '</code>)' : ''),
      userContact ? '📧 ' + escapeHtml(userContact) : '',
      '',
      '💬 <b>Pesan:</b>',
      escapeHtml(message),
      '',
      '🕐 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19)
    ].filter(Boolean);

    // Tombol AI Reply (baris pertama)
    const buttons = [];
    buttons.push([{
      text: 'AI Reply (auto)',
      callback_data: 'ai:' + ticketId
    }]);

    // Tombol template per kategori
    const templateKeys = getTemplatesByCategory(type);
    templateKeys.forEach(function(key) {
      const tpl = SUPPORT_TEMPLATES[key];
      if (!tpl) return;
      buttons.push([{
        text: tpl.emoji + ' ' + tpl.label,
        callback_data: 'sup:' + ticketId + ':' + key
      }]);
    });

    await sendTelegramWithButtons(env, lines.join('\n'), buttons, { type: 'support' });
  } catch (e) {
    console.error('[SUPPORT] Telegram error:', e.message);
  }

  return json({
    ok: true,
    ticket_id: ticketId,
    auto_reply: SIMPLE_REPLY,
    message: 'Tiket terkirim.'
  });
}

export async function onRequestGet() {
  return json({ ok: false, message: 'Gunakan POST' }, 405);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
