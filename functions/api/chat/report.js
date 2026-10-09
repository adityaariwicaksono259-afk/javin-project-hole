import { json, ensureSchema, getMe } from './_lib.js';

// Window: 1 hari (24 jam)
const WINDOW_MS = 24 * 60 * 60 * 1000;

// Level ban baru
const LEVELS = [
  { min: 5,  max: 9,     level: 'ringan', minMs: 1 * 3600000,  maxMs: 7 * 3600000 },
  { min: 10, max: 29,    level: 'sedang', minMs: 10 * 3600000, maxMs: 24 * 3600000 },
  { min: 30, max: 99999, level: 'parah',  minMs: 0, maxMs: 0 }
];

// Anti-abuse
const MAX_REPORTS_PER_REPORTER_PER_DAY = 10;   // 1 reporter max 10 laporan/hari
const MIN_ACCOUNT_AGE_MS = 1 * 24 * 60 * 60 * 1000; // akun harus umur > 1 hari

function pickLevel(count) {
  for (const l of LEVELS) {
    if (count >= l.min && count <= l.max) return l;
  }
  return LEVELS[0];
}

function randomDuration(lvl) {
  if (lvl.level === 'parah') return 0;
  var ms = lvl.minMs + Math.random() * (lvl.maxMs - lvl.minMs);
  return Math.floor(ms);
}

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

  // ============ ANTI-ABUSE CHECK ============
  try {
    // 1. Cek umur akun reporter
    const meUser = await db.prepare(
      'SELECT created_at FROM auth_users WHERE user_code = ? LIMIT 1'
    ).bind(me.code).first();
    if (meUser && meUser.created_at && (now - meUser.created_at) < MIN_ACCOUNT_AGE_MS) {
      return json({
        ok: false,
        message: 'Akun kamu terlalu baru. Coba lagi besok.'
      }, 403);
    }

    // 2. Cek reporter udah lapor target ini dalam 24 jam terakhir?
    const dup = await db.prepare(
      'SELECT id FROM user_reports WHERE reporter_code = ? AND reported_code = ? AND created_at >= ? LIMIT 1'
    ).bind(me.code, target, now - WINDOW_MS).first();
    if (dup) {
      return json({
        ok: false,
        message: 'Kamu udah lapor user ini hari ini. Tunggu 24 jam.'
      }, 429);
    }

    // 3. Cek total laporan reporter dalam 24 jam (max 10)
    const cntRow = await db.prepare(
      'SELECT COUNT(*) as c FROM user_reports WHERE reporter_code = ? AND created_at >= ?'
    ).bind(me.code, now - WINDOW_MS).first();
    const totalToday = (cntRow && cntRow.c) || 0;
    if (totalToday >= MAX_REPORTS_PER_REPORTER_PER_DAY) {
      return json({
        ok: false,
        message: 'Kamu udah terlalu banyak lapor hari ini (max 10). Coba lagi besok.'
      }, 429);
    }
  } catch(e) {
    console.error('[REPORT-ANTIABUSE]', e.message);
  }
  // ============ END ANTI-ABUSE ============

  // Insert laporan
  await db.prepare(
    'INSERT INTO user_reports (reporter_code, reported_code, reason, detail, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(me.code, target, reason, detail, now).run();

  // ============ CEK AUTO-BAN ============
  const since = now - WINDOW_MS;
  let autoBanned = false;
  let banLevel = null;
  let banUntil = 0;
  let uniqCount = 0;

  try {
    const uniq = await db.prepare(
      'SELECT COUNT(DISTINCT reporter_code) as c FROM user_reports WHERE reported_code = ? AND created_at >= ?'
    ).bind(target, since).first();
    uniqCount = (uniq && uniq.c) || 0;

    const lvl = pickLevel(uniqCount);

    if (uniqCount >= 5) {
      // Cek ban aktif
      const existing = await db.prepare(
        'SELECT id, level, until FROM user_bans WHERE user_code = ? AND (until = 0 OR until > ?) LIMIT 1'
      ).bind(target, now).first();

      if (!existing) {
        // Bikin ban baru
        const dur = randomDuration(lvl);
        banUntil = lvl.level === 'parah' ? 0 : (now + dur);

        await db.prepare(
          'INSERT INTO user_bans (user_code, level, reason, until, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          target,
          lvl.level,
          'Auto-ban: ' + uniqCount + ' laporan unik dalam 24 jam',
          banUntil,
          now
        ).run();

        autoBanned = true;
        banLevel = lvl.level;

        // Notif Telegram
        try {
          const { sendTelegram } = await import('../_lib/telegram.js');
          if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
            const durStr = lvl.level === 'parah'
              ? 'PERMANEN'
              : Math.round((banUntil - now) / 3600000) + ' jam';
            await sendTelegram(env,
              '🚫 <b>AUTO-BAN ' + lvl.label.toUpperCase() + '</b>\n\n' +
              'User: <code>' + target + '</code>\n' +
              'Laporan: ' + uniqCount + ' unik dalam 24 jam\n' +
              'Durasi: ' + durStr,
              { type: 'autoban-chat' }
            );
          }
        } catch(e) {}
      } else {
        // Ada ban aktif — cek eskalasi level
        const curIdx = LEVELS.findIndex(l => l.level === existing.level);
        const newIdx = LEVELS.findIndex(l => l.level === lvl.level);

        if (newIdx > curIdx) {
          const dur = randomDuration(lvl);
          banUntil = lvl.level === 'parah' ? 0 : (now + dur);

          await db.prepare(
            'UPDATE user_bans SET level = ?, until = ?, reason = ? WHERE id = ?'
          ).bind(
            lvl.level,
            banUntil,
            'Auto-ban upgrade: ' + uniqCount + ' laporan unik',
            existing.id
          ).run();

          autoBanned = true;
          banLevel = lvl.level;
        } else {
          banLevel = existing.level;
        }
      }
    }
  } catch(e) { console.error('[REPORT-AUTOBAN]', e.message); }
  // ============ END AUTO-BAN ============

  let msg = 'Laporan terkirim. Terima kasih.';
  if (autoBanned) {
    if (banLevel === 'parah') msg = 'Laporan terkirim. User otomatis dibanned PERMANEN.';
    else msg = 'Laporan terkirim. User otomatis dibanned (' + banLevel + ').';
  }

  return json({
    ok: true,
    message: msg,
    auto_banned: autoBanned,
    ban_level: banLevel,
    total_reports: uniqCount
  });
}
