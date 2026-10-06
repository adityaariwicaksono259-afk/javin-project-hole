// GET /api/cron/reset-credits?secret=XXX
// Reset credits user yang < MIN_CREDITS_BEFORE_RESET ke MIN (5).
// Dipanggil external cron jam 00.00 WIB.

import { MIN_CREDITS_BEFORE_RESET, getTodayWibStartMs } from '../../_lib/gen-api-key.js';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestGet({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, error: 'DB nggak siap' }, 503);

  const url = new URL(request.url);
  const secret = url.searchParams.get('secret') || '';
  const expected = env.CRON_SECRET || '';

  if (!expected) {
    return json({ ok: false, error: 'CRON_SECRET belum di-set di env.' }, 503);
  }
  if (secret !== expected) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const todayStart = getTodayWibStartMs();

  try {
    // Cari user yang:
    // - last_credit_reset < todayStart (belom reset hari ini)
    // - credits < MIN (kurang dari 5)
    const users = await db.prepare(
      'SELECT id, user_code, credits FROM auth_users WHERE (last_credit_reset IS NULL OR last_credit_reset < ?) AND COALESCE(credits, 0) < ?'
    ).bind(todayStart, MIN_CREDITS_BEFORE_RESET).all();

    const rows = users.results || [];
    let resetCount = 0;

    for (const u of rows) {
      try {
        await db.prepare(
          'UPDATE auth_users SET credits = ?, last_credit_reset = ? WHERE id = ?'
        ).bind(MIN_CREDITS_BEFORE_RESET, todayStart, u.id).run();
        resetCount++;
      } catch (e) {
        console.error('[CRON-RESET] user ' + u.id + ':', e.message);
      }
    }

    return json({
      ok: true,
      today_start_wib: todayStart,
      checked: rows.length,
      reset: resetCount,
      min_credits: MIN_CREDITS_BEFORE_RESET
    });
  } catch (e) {
    console.error('[CRON-RESET]', e.message);
    return json({ ok: false, error: e.message }, 500);
  }
}

export async function onRequestPost() {
  return json({ ok: false, error: 'Gunakan GET' }, 405);
}
