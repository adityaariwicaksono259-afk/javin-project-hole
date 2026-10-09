import { json, ensureSchema, getMe } from './_lib.js';

const LEVELS = [
  { min: 5, max: 9, level: 'ringan', label: 'Ringan', minMs: 1 * 3600000, maxMs: 7 * 3600000 },
  { min: 10, max: 14, level: 'sedang', label: 'Sedang', minMs: 10 * 3600000, maxMs: 24 * 3600000 },
  { min: 15, max: 99999, level: 'parah', label: 'Parah', minMs: 0, maxMs: 0 }
];

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function pickLevel(count) {
  for (const l of LEVELS) {
    if (count >= l.min && count <= l.max) return l;
  }
  return LEVELS[0];
}

function randomDuration(lvl) {
  if (lvl.level === 'parah') return 0; // permanen
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
  await db.prepare(
    'INSERT INTO user_reports (reporter_code, reported_code, reason, detail, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(me.code, target, reason, detail, now).run();

  // Cek auto-ban
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

    // Ambil level tertinggi yang applicable
    const lvl = pickLevel(uniqCount);

    if (uniqCount >= 5) {
      // Cek apakah udah ada ban aktif
      const existing = await db.prepare(
        'SELECT id, level, until FROM user_bans WHERE user_code = ? AND (until = 0 OR until > ?) LIMIT 1'
      ).bind(target, now).first();

      if (!existing) {
        // Belum ada ban → bikin baru
        const dur = randomDuration(lvl);
        banUntil = lvl.level === 'parah' ? 0 : (now + dur);

        const ins = await db.prepare(
          'INSERT INTO user_bans (user_code, level, reason, until, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          target,
          lvl.level,
          'Auto-ban: ' + uniqCount + ' laporan unik dalam 7 hari',
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
              'Laporan: ' + uniqCount + ' unik dalam 7 hari\n' +
              'Durasi: ' + durStr,
              { type: 'autoban-chat' }
            );
          }
        } catch(e) {}
      } else {
        // Udah ada ban → cek apakah level-nya naik (eskalasi)
        const currentLevelIdx = LEVELS.findIndex(l => l.level === existing.level);
        const newLevelIdx = LEVELS.findIndex(l => l.level === lvl.level);

        if (newLevelIdx > currentLevelIdx) {
          // Naikin level (contoh: ringan → sedang)
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

  let msg = 'Laporan terkirim. Terima kasih.';
  if (autoBanned) {
    if (banLevel === 'parah') {
      msg = 'Laporan terkirim. User telah otomatis dibanned permanen.';
    } else {
      msg = 'Laporan terkirim. User telah otomatis dibanned (' + banLevel + ').';
    }
  }

  return json({
    ok: true,
    message: msg,
    auto_banned: autoBanned,
    ban_level: banLevel
  });
}
