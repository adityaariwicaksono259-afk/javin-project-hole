
function json(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function tgCall(env, method, body) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, reason: 'no_token' };
  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (!secret || secret !== env.ADMIN_SESSION_SECRET) {
    return json({ ok: false, message: 'Kasih ?secret=... di URL' }, 403);
  }

  const action = url.searchParams.get('action') || 'info';

  if (!env.TELEGRAM_BOT_TOKEN) return json({ ok: false, message: 'TELEGRAM_BOT_TOKEN belum di-set.' }, 503);

  if (action === 'info') {
    const me = await tgCall(env, 'getMe', {});
    const wh = await tgCall(env, 'getWebhookInfo', {});
    return json({ ok: true, me: me, webhook: wh });
  }

  if (action === 'set') {
    const webhookUrl = url.origin + '/api/bot/webhook';
    const r = await tgCall(env, 'setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message'],
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
