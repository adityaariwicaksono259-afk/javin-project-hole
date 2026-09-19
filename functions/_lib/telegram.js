// Helper: kirim notif ke Telegram
// Rate limit internal: max 1 pesan per 10 detik per tipe event

const lastSent = new Map();

export async function sendTelegram(env, message, options) {
  options = options || {};
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, reason: 'not-configured' };

  // Throttle: max 1 pesan per 10 detik per event type
  const type = options.type || 'default';
  const throttleMs = options.throttleMs || 10000;
  const now = Date.now();
  const last = lastSent.get(type) || 0;
  if (now - last < throttleMs) {
    return { ok: false, reason: 'throttled' };
  }
  lastSent.set(type, now);

  const text = String(message || '').slice(0, 4000);

  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    if (!r.ok) {
      const err = await r.text();
      console.error('[TELEGRAM] Send failed:', r.status, err.slice(0, 200));
      return { ok: false, reason: 'http-' + r.status };
    }
    return { ok: true };
  } catch (e) {
    console.error('[TELEGRAM] Error:', e.message);
    return { ok: false, reason: e.message };
  }
}

export function escapeHtml(s) {
  return String(s || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}
