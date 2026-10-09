import { json, ensureSchema, getMe } from './_lib.js';

const REPORT_THRESHOLD = 5;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const BAN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB nggak siap' }, 503);
  await ensureSchema(db);
  const me = await getMe(request, db);
  if (!me) return json({ ok: false, message: 'Belum login' }, 401);
  if (me.banned) return json({ ok: false, message: 'Akun kamu sedang dibatasi' }, 403);

  let body;
  try { body = await request.json(); } catch(e) { return json({ ok: false, message: 'Body invalid' }, 400); }
  const target = String(body.target || '').trim();
  const reason = String(body.reason || '').trim().slice(0, 60);
  const detail = String(body.detail || '').trim().slice(0, 500);
  if (!target || target === me.code || !reason) {
    return json({ ok: false, message: 'Target & reason wajib' }, 400);
  }

  const now = Date.now();
  await db.prepare(
    'INSERT INTO user_reports (reporter_code, reported_code, reason, detail, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(me.code, target, reason, detail, now).run();

  // Cek auto-ban
  const since = now - WINDOW_MS;
  let autoBanned = false;
  let uniqCount = 0;
  try {
    const uniq = await db.prepare(
      'SELECT COUNT(DISTINCT reporter_code) as c FROM user_reports WHERE reported_code = ? AND created_at >= ?'
    ).bind(target, since).first();
    uniqCount = (uniq && uniq.c) || 0;

    if (uniqCount >= REPORT_THRESHOLD) {
      // Cek apakah udah di-ban
      const existing = await db.prepare(
        'SELECT 1 FROM user_bans WHERE user_code = ? AND until > ?'
      ).bind(target, now).first();

      if (!existing) {
        const until = now + BAN_DURATION_MS;
        const banReason = 'Auto-ban: ' + uniqCount + ' laporan dalam 7 hari';
        await db.prepare(
          'INSERT INTO user_bans (user_code, reason, until, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_code) DO UPDATE SET reason = excluded.reason, until = excluded.until'
        ).bind(target, banReason, until, now).run();
        autoBanned = true;

        // Notif Telegram (opsional)
        try {
          const { sendTelegram } = await import('../_lib/telegram.js');
          if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
            await sendTelegram(env,
              '🚫 <b>AUTO-BAN USER</b>\n\n' +
              'User: <code>' + target + '</code>\n' +
              'Alasan: ' + uniqCount + ' laporan dalam 7 hari\n' +
              'Durasi: 30 hari',
              { type: 'autoban-chat' }
            );
          }
        } catch(e) {}
      }
    }
  } catch(e) { console.error('[REPORT-AUTOBAN]', e.message); }

  return json({
    ok: true,
    message: autoBanned
      ? 'Laporan terkirim. User telah otomatis dibatasi.'
      : 'Laporan terkirim. Terima kasih.'
  });
}
