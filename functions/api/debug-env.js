export async function onRequest({ env }) {
  return new Response(JSON.stringify({
    ok: true,
    has_bot_token: !!env.TELEGRAM_BOT_TOKEN,
    has_chat_id: !!env.TELEGRAM_CHAT_ID,
    bot_token_len: (env.TELEGRAM_BOT_TOKEN || '').length,
    chat_id_len: (env.TELEGRAM_CHAT_ID || '').length,
    bot_token_start: (env.TELEGRAM_BOT_TOKEN || '').slice(0, 10),
    chat_id_value: (env.TELEGRAM_CHAT_ID || '').slice(0, 15),
    all_env_keys: Object.keys(env).filter(k => !k.startsWith('__')).sort()
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
