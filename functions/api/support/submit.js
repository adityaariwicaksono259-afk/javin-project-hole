// POST /api/support/submit
// Body: { type, userId, userName, userContact, title, message }
import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body invalid' }, 400); }

  const type = String(body.type || '').toLowerCase();
  if (!['bug', 'saran', 'lainnya'].includes(type)) {
    return json({ ok: false, message: 'Tipe harus bug/saran/lainnya' }, 400);
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
      'INSERT INTO support_tickets (type, user_id, user_name, user_contact, title, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, "open", ?, ?)'
    ).bind(type, userId, userName, userContact, title, message, now, now).run();
    ticketId = r.meta.last_row_id;
  } catch (e) {
    console.error('[SUPPORT] DB error:', e.message);
    return json({ ok: false, message: 'Server error' }, 500);
  }

  // Kirim ke Telegram admin
  try {
    const typeEmoji = type === 'bug' ? '🐛 BUG REPORT' : type === 'saran' ? '💡 SARAN' : '📨 PESAN';
    const lines = [
      '<b>' + typeEmoji + ' #' + ticketId + '</b>',
      '',
      title ? '📌 <b>' + escapeHtml(title) + '</b>' : '',
      '👤 ' + escapeHtml(userName || 'Anonim') + (userId ? ' (<code>' + escapeHtml(userId) + '</code>)' : ''),
      userContact ? '📧 ' + escapeHtml(userContact) : '',
      '',
      '💬 <b>Pesan:</b>',
      escapeHtml(message),
      '',
      '🕐 ' + new Date().toISOString().replace('T', ' ').slice(0, 19)
    ].filter(Boolean);

    await sendTelegram(env, lines.join('\n'), { type: 'support', throttleMs: 1000 });
  } catch (e) {
    console.error('[SUPPORT] Telegram error:', e.message);
  }

  return json({ ok: true, ticket_id: ticketId, message: 'Terima kasih! Laporan kamu udah diterima.' });
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
