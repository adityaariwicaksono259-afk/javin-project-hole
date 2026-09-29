// /api/bot/debug-callback — test handler callback tanpa Telegram
// POST body: { "data": "sup:3:beli_pending" }
import { answerCallbackQuery, editTelegramMessage } from '../../_lib/telegram.js';
import { SUPPORT_TEMPLATES } from '../../_lib/support-templates.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch(e) { return json({ ok: false, error: 'Body invalid' }, 400); }

  const cbData = String(body.data || '');
  const parts = cbData.split(':');

  if (parts[0] !== 'sup' || parts.length !== 3) {
    return json({ ok: false, error: 'Format: sup:TICKET_ID:TEMPLATE_KEY' }, 400);
  }

  const ticketId = parseInt(parts[1], 10);
  const tplKey = parts[2];
  const tpl = SUPPORT_TEMPLATES[tplKey];

  if (!tpl || !ticketId) {
    return json({ ok: false, error: 'Template/ticket invalid', tplKey, ticketId }, 400);
  }

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, error: 'DB gak siap' }, 503);

  try {
    const now = Date.now();
    const adminReply = tpl.emoji + ' ' + tpl.reply;

    // Cek tiket ada
    const ticket = await db.prepare('SELECT id, type, status FROM support_tickets WHERE id = ?').bind(ticketId).first();
    if (!ticket) return json({ ok: false, error: 'Tiket #' + ticketId + ' gak ada di DB' }, 404);

    // Update DB
    await db.prepare(
      'UPDATE support_tickets SET admin_reply = ?, status = "resolved", updated_at = ? WHERE id = ?'
    ).bind(adminReply, now, ticketId).run();

    return json({
      ok: true,
      message: 'Handler jalan! DB terupdate.',
      ticket_id: ticketId,
      template: tplKey,
      label: tpl.label,
      prev_status: ticket.status
    });
  } catch(e) {
    return json({ ok: false, error: e.message, stack: e.stack }, 500);
  }
}

export async function onRequestGet() {
  return json({ ok: true, message: 'Gunakan POST dengan { data: "sup:TICKET_ID:TEMPLATE_KEY" }' });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
