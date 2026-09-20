// Telegram Shop Bot Helper
const API = 'https://api.telegram.org/bot';

function getToken(env) { return env.SHOP_BOT_TOKEN; }

export async function tgCall(env, method, body) {
  const token = getToken(env);
  if (!token) return { ok: false, reason: 'no_token' };
  try {
    const r = await fetch(API + token + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) {
    console.error('[SHOP-BOT]', method, e.message);
    return { ok: false, reason: e.message };
  }
}

export function sendMessage(env, chatId, text, options) {
  return tgCall(env, 'sendMessage', Object.assign({
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  }, options || {}));
}

export function sendPhoto(env, chatId, photo, caption, options) {
  return tgCall(env, 'sendPhoto', Object.assign({
    chat_id: chatId,
    photo: photo,
    caption: caption,
    parse_mode: 'HTML'
  }, options || {}));
}

export function editMessage(env, chatId, messageId, text, options) {
  return tgCall(env, 'editMessageText', Object.assign({
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  }, options || {}));
}

export function answerCallback(env, callbackId, text, alert) {
  return tgCall(env, 'answerCallbackQuery', {
    callback_query_id: callbackId,
    text: text || '',
    show_alert: !!alert
  });
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; });
}
