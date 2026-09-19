// POST /api/admin/backup — backup D1 ke JSON + kirim ke Telegram
// Bisa dipanggil via cron trigger atau manual dari admin panel

import { verifyAdmin } from './auth.js';
import { audit, getClientIP } from '../../_lib/audit.js';

const TABLES = [
  'users',
  'premium_keys',
  'config',
  'fingerprints',
  'audit_log'
];

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extraHeaders || {})
  });
}

async function exportTable(db, tableName) {
  try {
    // Skip kalau tabel nggak ada
    const check = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
    ).bind(tableName).first();
    if (!check) return { ok: false, reason: 'table_not_found', rows: [] };

    const result = await db.prepare('SELECT * FROM ' + tableName).all();
    return { ok: true, rows: result.results || [] };
  } catch (e) {
    return { ok: false, reason: e.message, rows: [] };
  }
}

async function sendBackupToTelegram(env, filename, jsonString) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, reason: 'telegram_not_configured' };

  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', new Blob([jsonString], { type: 'application/json' }), filename);
    formData.append('caption', '📦 D1 Backup\n' +
      '📅 ' + new Date().toISOString() + '\n' +
      '📊 ' + (jsonString.length / 1024).toFixed(1) + ' KB');

    const r = await fetch('https://api.telegram.org/bot' + token + '/sendDocument', {
      method: 'POST',
      body: formData
    });
    if (!r.ok) {
      const err = await r.text();
      return { ok: false, reason: 'telegram_http_' + r.status + ': ' + err.slice(0, 100) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

export async function onRequestPost({ request, env }) {
  // ==== Auto-detect: cron trigger atau admin ====
  const url = new URL(request.url);
  const isCron = request.headers.get('X-Cron-Secret') === env.ADMIN_SESSION_SECRET;

  if (!isCron) {
    const auth = await verifyAdmin(request, env);
    if (!auth.ok) return auth.response;
  }

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum siap.' }, 503);

  const backup = {
    meta: {
      version: 1,
      generated_at: new Date().toISOString(),
      generated_at_ms: Date.now(),
      source: isCron ? 'cron' : 'admin',
      tables: []
    },
    data: {}
  };

  let totalRows = 0;
  const errors = [];

  for (const tableName of TABLES) {
    const result = await exportTable(db, tableName);
    if (result.ok) {
      backup.data[tableName] = result.rows;
      backup.meta.tables.push({ name: tableName, rows: result.rows.length });
      totalRows += result.rows.length;
    } else {
      errors.push({ table: tableName, reason: result.reason });
    }
  }

  backup.meta.total_rows = totalRows;
  backup.meta.errors = errors;

  // Nama file: backup_YYYY-MM-DD_HH-MM.json
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const filename = 'javin_backup_' +
    d.getUTCFullYear() + '-' +
    pad(d.getUTCMonth() + 1) + '-' +
    pad(d.getUTCDate()) + '_' +
    pad(d.getUTCHours()) + '-' +
    pad(d.getUTCMinutes()) + '.json';

  const jsonString = JSON.stringify(backup, null, 2);

  // Kirim ke Telegram
  const tg = await sendBackupToTelegram(env, filename, jsonString);

  // Audit log
  await audit(db, {
    action: 'd1_backup',
    actor: isCron ? 'cron' : 'admin',
    target: filename,
    detail: totalRows + ' rows, ' + (jsonString.length / 1024).toFixed(1) + ' KB, telegram: ' + (tg.ok ? 'sent' : 'failed: ' + tg.reason),
    ip: getClientIP(request)
  });

  return json({
    ok: true,
    filename: filename,
    total_rows: totalRows,
    size_bytes: jsonString.length,
    tables: backup.meta.tables,
    errors: errors,
    telegram: tg
  });
}

export async function onRequestGet({ request, env }) {
  // GET untuk preview (admin only)
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum siap.' }, 503);

  const summary = {};
  for (const tableName of TABLES) {
    try {
      const r = await db.prepare('SELECT COUNT(*) as c FROM ' + tableName).first();
      summary[tableName] = r.c || 0;
    } catch (e) {
      summary[tableName] = 'error: ' + e.message;
    }
  }

  return json({ ok: true, summary: summary });
}
