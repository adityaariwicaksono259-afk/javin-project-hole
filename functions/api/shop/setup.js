// GET /api/shop/setup?secret=ADMIN_SESSION_SECRET
// Register webhook ke Telegram + cek status
import { tgCall } from '../../_lib/shop-bot.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (secret !== env.ADMIN_SESSION_SECRET) {
    return json({ ok: false, message: 'Secret salah.' }, 403);
  }

  const action = url.searchParams.get('action') || 'info';
  const token = env.SHOP_BOT_TOKEN;

  if (!token) {
    return json({ ok: false, message: 'SHOP_BOT_TOKEN belum di-set.' }, 503);
  }

  // ==== INFO ====
  if (action === 'info') {
    const me = await tgCall(env, 'getMe', {});
    const wh = await tgCall(env, 'getWebhookInfo', {});
    return json({ ok: true, me: me, webhook: wh });
  }

  // ==== SET WEBHOOK ====
  if (action === 'set') {
    const webhookUrl = url.origin + '/api/shop/webhook';
    const r = await tgCall(env, 'setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true
    });
    return json({ ok: true, webhook_url: webhookUrl, result: r });
  }

  // ==== DELETE WEBHOOK ====
  if (action === 'delete') {
    const r = await tgCall(env, 'deleteWebhook', { drop_pending_updates: true });
    return json({ ok: true, result: r });
  }

  return json({ ok: false, message: 'Action tidak valid. Pakai: info | set | delete' }, 400);
}

function json(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
