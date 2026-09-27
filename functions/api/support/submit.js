// POST /api/support/submit
// Body: { type, userId, userName, userContact, title, message }
import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';

const AUTO_REPLIES = {
  bug: {
    emoji: '🐛',
    title: 'Laporan Bug Diterima',
    reply: 'Terima kasih sudah melaporkan bug ini! 🐛\n\nTim kami akan mengecek laporan Anda dalam 1x24 jam. Jika bug bersifat critical (aplikasi crash / data hilang), kami akan menghubungi Anda via kontak yang terdaftar.\n\nTips sementara:\n• Clear cache browser\n• Refresh halaman\n• Coba lagi dengan koneksi stabil\n\nKalau masih error, balas tiket ini dengan screenshot.'
  },
  error: {
    emoji: '⚠️',
    title: 'Laporan Error Diterima',
    reply: 'Terima kasih atas laporan error-nya! ⚠️\n\nCoba langkah ini dulu:\n1. Clear cache & cookies browser\n2. Refresh halaman (Ctrl + R / tarik ke bawah)\n3. Coba pakai Incognito mode\n4. Pastikan koneksi internet stabil\n\nKalau error masih muncul, tolong balas dengan:\n• Screenshot pesan error\n• Nama tool yang dipakai\n• Waktu kejadian\n\nKami akan cek secepatnya.'
  },
  saran: {
    emoji: '💡',
    title: 'Saran Diterima',
    reply: 'Terima kasih atas sarannya! 💡\n\nSetiap masukan dari user JVaPii sangat berharga buat kami. Saran Anda akan masuk ke daftar pertimbangan update berikutnya.\n\nKalau saran Anda diimplementasikan, kami akan kabari via notifikasi di web atau email Anda.\n\nKeep in touch ya!'
  },
  pembelian: {
    emoji: '💰',
    title: 'Pembelian Diterima',
    reply: 'Terima kasih sudah belanja di JVaPii! 💰\n\nUntuk mempercepat proses, siapkan data berikut:\n\n📋 Yang perlu disiapkan:\n• User ID: (lihat di header web)\n• Screenshot bukti transfer\n• Tanggal & jam order\n• Nomor invoice (kalau ada)\n\n⏱️ Estimasi:\n• Aktivasi manual: 5 menit - 1 jam\n• Kalau lewat 24 jam belum aktif, balas tiket ini\n\nUntuk urgent, hubungi admin via bot Telegram.'
  }
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
  const autoReplyText = AUTO_REPLIES[type].reply;
  let ticketId;

  try {
    const r = await db.prepare(
      'INSERT INTO support_tickets (type, user_id, user_name, user_contact, title, message, status, admin_reply, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, "auto_replied", ?, ?, ?)'
    ).bind(type, userId, userName, userContact, title, message, autoReplyText, now, now).run();
    ticketId = r.meta.last_row_id;
  } catch (e) {
    console.error('[SUPPORT] DB error:', e.message);
    return json({ ok: false, message: 'Server error: ' + e.message }, 500);
  }

  // Kirim ke Telegram admin (read-only notif)
  try {
    const typeEmoji = AUTO_REPLIES[type].emoji;
    const typeLabel = type.toUpperCase();
    const lines = [
      typeEmoji + ' <b>NEW TICKET #' + ticketId + ' — ' + typeLabel + '</b>',
      '',
      title ? '📌 <b>' + escapeHtml(title) + '</b>' : '',
      '👤 ' + escapeHtml(userName || 'Anonim') + (userId ? ' (<code>' + escapeHtml(userId) + '</code>)' : ''),
      userContact ? '📧 ' + escapeHtml(userContact) : '',
      '',
      '💬 <b>Pesan:</b>',
      escapeHtml(message),
      '',
      '🤖 <i>Auto-reply telah dikirim ke user.</i>',
      '🕐 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19)
    ].filter(Boolean);

    await sendTelegram(env, lines.join('\n'), { type: 'support', throttleMs: 1000 });
  } catch (e) {
    console.error('[SUPPORT] Telegram error:', e.message);
  }

  return json({
    ok: true,
    ticket_id: ticketId,
    auto_reply: autoReplyText,
    auto_reply_title: AUTO_REPLIES[type].title,
    auto_reply_emoji: AUTO_REPLIES[type].emoji,
    message: 'Tiket terkirim. Bot telah membalas otomatis.'
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
