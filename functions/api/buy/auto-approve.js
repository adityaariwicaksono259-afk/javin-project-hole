// POST /api/buy/auto-approve
// Dipanggil Google Apps Script saat email DANA masuk
// Body: { amount, sender, secret, email_id }
import { sendTelegram, escapeHtml } from '../../_lib/telegram.js';

// Kredit yang didapat per tier
const TIER_CREDITS = {
  basic: 70,
  pro: 150,
  unlimited: 1000
};

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, error: 'DB gak siap' }, 503);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, error: 'Body invalid' }, 400); }

  // Cek secret
  const secret = String(body.secret || '');
  const expected = env.AUTO_APPROVE_SECRET || '';
  if (!expected || secret !== expected) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const amount = parseInt(body.amount, 10);
  const sender = String(body.sender || '').slice(0, 100);
  const emailId = String(body.email_id || '').slice(0, 100);

  if (!isFinite(amount) || amount < 1) {
    return json({ ok: false, error: 'Amount invalid' }, 400);
  }

  const now = Date.now();

  try {
    // Cari order yang match: total_amount sama + status waiting_payment
    // Kalo ada >1 order dengan nominal sama, ambil yang paling lama (FIFO)
    const order = await db.prepare(
      'SELECT * FROM web_orders WHERE total_amount = ? AND status = "waiting_payment" ORDER BY created_at ASC LIMIT 1'
    ).bind(amount).first();

    if (!order) {
      // Gak match — log ke admin
      await sendTelegram(env,
        '⚠️ <b>Transfer gak match order</b>\n\n' +
        '💰 Nominal: <b>Rp ' + amount.toLocaleString('id-ID') + '</b>\n' +
        '👤 Dari: ' + escapeHtml(sender || '-') + '\n' +
        '🕐 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19),
        { type: 'auto-approve-nomatch', throttleMs: 5000 }
      );
      return json({ ok: false, error: 'Order tidak ditemukan', amount: amount });
    }

    // Update order jadi approved
    await db.prepare(
      'UPDATE web_orders SET status = "approved", updated_at = ? WHERE order_code = ?'
    ).bind(now, order.order_code).run();

    // Update tier user di auth_users (kalau user login pakai session)
    let tierApplied = false;
    if (order.user_id) {
      try {
        const user = await db.prepare('SELECT id, tier, tier_expires_at FROM auth_users WHERE id = ?').bind(order.user_id).first();
        if (user) {
          // Kalau tier lama masih aktif, extend dari expires_at lama
          const baseTime = (user.tier_expires_at && user.tier_expires_at > now) ? user.tier_expires_at : now;
          const newExpires = baseTime + ((order.expires_at || 0) - order.created_at);

          const creditsToAdd = TIER_CREDITS[order.tier] || 0;
          const oldCredits = user.credits || 0;
          const newCredits = oldCredits + creditsToAdd;

          await db.prepare(
            'UPDATE auth_users SET tier = ?, tier_expires_at = ?, credits = ? WHERE id = ?'
          ).bind(order.tier, newExpires, newCredits, order.user_id).run();

          tierApplied = true;
          console.log('[AUTO-APPROVE] API Key: ' + oldCredits + ' + ' + creditsToAdd + ' = ' + newCredits);
        }
      } catch (e) {
        console.error('[AUTO-APPROVE] update tier error:', e.message);
      }
    }

    // Notif ke admin
    await sendTelegram(env,
      '✅ <b>Order Auto-Approved</b>\n\n' +
      '🆔 Kode: <code>' + escapeHtml(order.order_code) + '</code>\n' +
      '👤 User: ' + escapeHtml(order.user_name || '-') + (order.user_id ? ' (<code>' + escapeHtml(order.user_id) + '</code>)' : '') + '\n' +
      '📦 Tier: <b>' + escapeHtml(order.tier || '-') + '</b>\n' +
      '💰 Nominal: <b>Rp ' + amount.toLocaleString('id-ID') + '</b>\n' +
      '👤 Dari: ' + escapeHtml(sender || '-') + '\n' +
      '🎫 Tier applied: ' + (tierApplied ? '✅' : '❌ (user gak login)') + '\n' +
      'API Key: +' + (TIER_CREDITS[order.tier] || 0) + '\n' +
      '🕐 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19),
      { type: 'auto-approve', throttleMs: 3000 }
    );

    return json({
      ok: true,
      order_code: order.order_code,
      tier: order.tier,
      tier_applied: tierApplied,
      message: 'Order approved'
    });
  } catch (e) {
    console.error('[AUTO-APPROVE]', e.message);
    return json({ ok: false, error: e.message }, 500);
  }
}

export async function onRequestGet() {
  return json({ ok: false, error: 'Gunakan POST' }, 405);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
