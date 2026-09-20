// GET /api/shop/setup?action=info|set|delete
// Auth: via session admin (cookie) ATAU secret di URL
import { tgCall } from '../../_lib/shop-bot.js';
import { verifyAdmin } from '../admin/auth.js';

function json(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  // Auth: session admin ATAU secret
  let authorized = false;
  if (secret && secret === env.ADMIN_SESSION_SECRET) {
    authorized = true;
  } else {
    const auth = await verifyAdmin(request, env);
    if (auth.ok) authorized = true;
  }

  if (!authorized) {
    return json({ ok: false, message: 'Login admin dulu atau kasih ?secret=...' }, 403);
  }

  const action = url.searchParams.get('action') || 'info';

  if (!env.SHOP_BOT_TOKEN) {
    return json({ ok: false, message: 'SHOP_BOT_TOKEN belum di-set.' }, 503);
  }

  if (action === 'info') {
    const me = await tgCall(env, 'getMe', {});
    const wh = await tgCall(env, 'getWebhookInfo', {});
    return json({ ok: true, me: me, webhook: wh });
  }

  if (action === 'set') {
    const webhookUrl = url.origin + '/api/shop/webhook';
    const r = await tgCall(env, 'setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true
    });
    return json({ ok: true, webhook_url: webhookUrl, result: r });
  }

  if (action === 'delete') {
    const r = await tgCall(env, 'deleteWebhook', { drop_pending_updates: true });
    return json({ ok: true, result: r });
  }

  return json({ ok: false, message: 'Action: info | set | delete' }, 400);
}
