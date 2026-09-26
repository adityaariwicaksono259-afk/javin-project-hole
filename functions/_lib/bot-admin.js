// ===== Bot Admin Commands =====
// Semua fitur panel admin dipindah ke bot Telegram

export function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}

function fmtDate(ts){
  if (!ts) return '-';
  try { return new Date(ts).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}); } catch(e){ return '-'; }
}

// ============ MENU UTAMA ============
export async function cmdAdmin(env, chatId, reply){
  const h =
    '🛡️ <b>ADMIN PANEL</b>\n\n' +
    'Pilih menu di bawah:\n\n' +
    '<b>👥 Users</b> — kelola user &amp; limit\n' +
    '<b>🔑 Keys</b> — premium keys\n' +
    '<b>📋 Logs</b> — aktivitas\n' +
    '<b>⚙️ Config</b> — konfigurasi server\n' +
    '<b>💾 Backup</b> — export database';
  await reply(env, chatId, h);
}

// ============ USERS ============
export async function cmdUsers(env, chatId, args, reply){
  const db = env.JAVIN_DB;
  const arg = (args || '').trim();

  try {
    // Kalau ada arg → cari user spesifik
    if (arg) {
      const row = await db.prepare(
        'SELECT id, extra_limit, total_request, created_at, last_seen FROM users WHERE id = ?'
      ).bind(arg).first();

      if (!row) {
        await reply(env, chatId, '❌ User <code>' + esc(arg) + '</code> gak ketemu.');
        return;
      }

      const today = await db.prepare(
        'SELECT COUNT(*) as c FROM logs WHERE user_id = ? AND created_at >= ?'
      ).bind(arg, Date.now() - 86400000).first();

      const h =
        '👤 <b>USER DETAIL</b>\n\n' +
        '🆔 <code>' + esc(row.id) + '</code>\n' +
        '📊 Limit: <b>' + (row.total_request || 0) + '</b> / ' + ((row.extra_limit || 0) + 15) + '\n' +
        '➕ Extra: ' + (row.extra_limit || 0) + '\n' +
        '📅 Dibuat: ' + fmtDate(row.created_at) + '\n' +
        '👁️ Terakhir: ' + fmtDate(row.last_seen) + '\n' +
        '📈 Request 24j: ' + (today ? today.c : 0);
      await reply(env, chatId, h);
      return;
    }

    // List semua user
    const rows = await db.prepare(
      'SELECT id, extra_limit, total_request, last_seen FROM users ORDER BY last_seen DESC LIMIT 30'
    ).all();

    const users = rows.results || [];
    if (!users.length) {
      await reply(env, chatId, '📭 Belum ada user.');
      return;
    }

    let h = '👥 <b>USERS</b> (' + users.length + ' terakhir)\n\n';
    users.forEach((u, i) => {
      h += (i+1) + '. <code>' + esc(u.id) + '</code>\n';
      h += '   Limit: ' + (u.total_request||0) + ' | Extra: ' + (u.extra_limit||0) + '\n';
    });
    h += '\n💡 <code>/userinfo &lt;id&gt;</code> untuk detail';
    await reply(env, chatId, h);
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

export async function cmdUserDel(env, chatId, args, reply){
  const db = env.JAVIN_DB;
  const id = (args || '').trim();
  if (!id) {
    await reply(env, chatId, '⚠️ Pakai: <code>/userdel &lt;id&gt;</code>');
    return;
  }
  try {
    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    await db.prepare('DELETE FROM logs WHERE user_id = ?').bind(id).run();
    await reply(env, chatId, '🗑️ User <code>' + esc(id) + '</code> dihapus.');
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// ============ KEYS ============
function genKey(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random()*chars.length)];
  return 'JV-' + s;
}

export async function cmdKeys(env, chatId, args, reply){
  const db = env.JAVIN_DB;
  const arg = (args || '').trim().toLowerCase();

  try {
    // Generate keys: /keys gen 5
    if (arg.indexOf('gen') === 0) {
      const n = parseInt(arg.split(/\s+/)[1] || '1');
      if (!n || n < 1 || n > 50) {
        await reply(env, chatId, '⚠️ Pakai: <code>/keys gen &lt;1-50&gt;</code>');
        return;
      }
      const keys = [];
      for (let i = 0; i < n; i++) {
        let key, exists = true;
        while (exists) {
          key = genKey();
          const c = await db.prepare('SELECT key FROM premium_keys WHERE key = ?').bind(key).first();
          exists = !!c;
        }
        await db.prepare(
          'INSERT INTO premium_keys (key, label, owner_id, max_uses, used_count, status, created_at, last_used) VALUES (?, NULL, NULL, 1, 0, "active", ?, NULL)'
        ).bind(key, Date.now()).run();
        keys.push(key);
      }
      let h = '🔑 <b>KEY BARU</b> (' + n + ')\n\n';
      keys.forEach(k => { h += '<code>' + esc(k) + '</code>\n'; });
      await reply(env, chatId, h);
      return;
    }

    // Revoke: /keys revoke JV-XXXX
    if (arg.indexOf('revoke') === 0) {
      const key = arg.split(/\s+/)[1];
      if (!key) { await reply(env, chatId, '⚠️ Pakai: <code>/keys revoke &lt;key&gt;</code>'); return; }
      await db.prepare('UPDATE premium_keys SET status = "revoked" WHERE key = ?').bind(key.toUpperCase()).run();
      await reply(env, chatId, '🚫 Key <code>' + esc(key.toUpperCase()) + '</code> di-revoke.');
      return;
    }

    // Delete: /keys del JV-XXXX
    if (arg.indexOf('del') === 0) {
      const key = arg.split(/\s+/)[1];
      if (!key) { await reply(env, chatId, '⚠️ Pakai: <code>/keys del &lt;key&gt;</code>'); return; }
      await db.prepare('DELETE FROM premium_keys WHERE key = ?').bind(key.toUpperCase()).run();
      await reply(env, chatId, '🗑️ Key <code>' + esc(key.toUpperCase()) + '</code> dihapus.');
      return;
    }

    // Default: list keys
    const rows = await db.prepare(
      'SELECT key, status, used_count, max_uses, created_at FROM premium_keys ORDER BY created_at DESC LIMIT 30'
    ).all();
    const keys = rows.results || [];
    if (!keys.length) {
      await reply(env, chatId, '📭 Belum ada key.\n\nGenerate: <code>/keys gen 5</code>');
      return;
    }
    let h = '🔑 <b>PREMIUM KEYS</b> (' + keys.length + ')\n\n';
    keys.forEach((k, i) => {
      const st = k.status === 'active' ? '🟢' : (k.status === 'revoked' ? '🚫' : '⚪');
      h += (i+1) + '. ' + st + ' <code>' + esc(k.key) + '</code>\n';
      h += '   Pakai: ' + (k.used_count||0) + '/' + (k.max_uses||1) + '\n';
    });
    h += '\n💡 <code>/keys gen N</code> · <code>/keys revoke &lt;key&gt;</code> · <code>/keys del &lt;key&gt;</code>';
    await reply(env, chatId, h);
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// ============ LOGS ============
export async function cmdLogs(env, chatId, args, reply){
  const db = env.JAVIN_DB;
  const n = Math.min(parseInt((args || '').trim() || '30'), 100);

  try {
    const rows = await db.prepare(
      'SELECT user_id, endpoint_id, status, created_at FROM logs ORDER BY created_at DESC LIMIT ?'
    ).bind(n).all();
    const logs = rows.results || [];
    if (!logs.length) {
      await reply(env, chatId, '📭 Belum ada log.');
      return;
    }
    let h = '📋 <b>LOGS</b> (' + logs.length + ' terakhir)\n\n';
    logs.forEach(l => {
      const ok = l.status >= 200 && l.status < 300 ? '✅' : '❌';
      const t = new Date(l.created_at).toLocaleTimeString('id-ID', {timeZone:'Asia/Jakarta', hour:'2-digit', minute:'2-digit'});
      h += ok + ' ' + t + ' · <code>' + esc(l.user_id) + '</code> · ' + esc(l.endpoint_id) + ' · ' + l.status + '\n';
    });
    await reply(env, chatId, h);
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

export async function cmdLogsClear(env, chatId, reply){
  const db = env.JAVIN_DB;
  try {
    await db.prepare('DELETE FROM logs').run();
    await reply(env, chatId, '🗑️ Semua log dihapus.');
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// ============ CONFIG ============
export async function cmdConfig(env, chatId, args, reply){
  const db = env.JAVIN_DB;
  const arg = (args || '').trim();

  try {
    // Set: /config KEY=VALUE
    if (arg.indexOf('=') !== -1) {
      const parts = arg.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      if (!key) { await reply(env, chatId, '⚠️ Format: <code>/config KEY=VALUE</code>'); return; }
      await db.prepare(
        'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
      ).bind(key, value, Date.now()).run();
      await reply(env, chatId, '✅ <code>' + esc(key) + '</code> = <code>' + esc(value) + '</code>');
      return;
    }

    // List config
    const rows = await db.prepare('SELECT key, value, updated_at FROM config ORDER BY key').all();
    const cfg = rows.results || [];
    if (!cfg.length) {
      await reply(env, chatId, '📭 Config kosong.\n\nSet: <code>/config KEY=VALUE</code>');
      return;
    }
    let h = '⚙️ <b>CONFIG</b>\n\n';
    cfg.forEach(c => {
      h += '<code>' + esc(c.key) + '</code> = <code>' + esc(String(c.value).slice(0, 60)) + '</code>\n';
    });
    h += '\n💡 Set: <code>/config KEY=VALUE</code>';
    await reply(env, chatId, h);
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// ============ BACKUP ============
export async function cmdBackup(env, chatId, reply){
  const db = env.JAVIN_DB;
  const TABLES = ['users', 'premium_keys', 'logs', 'config', 'sounds', 'auth_users', 'auth_sessions', 'announcements'];

  try {
    const dump = { created_at: new Date().toISOString(), tables: {} };
    for (const t of TABLES) {
      try {
        const rows = await db.prepare('SELECT * FROM ' + t + ' LIMIT 5000').all();
        dump.tables[t] = rows.results || [];
      } catch(e) {
        dump.tables[t] = { error: e.message };
      }
    }
    const json = JSON.stringify(dump, null, 2);
    const sizeKB = Math.round(json.length / 1024);
    if (sizeKB > 45) {
      await reply(env, chatId, '⚠️ Backup kegedean (' + sizeKB + ' KB). Telegram max 50 KB buat pesan. Pakai /backup email atau server.');
      return;
    }
    // Kirim sebagai code block
    await reply(env, chatId, '💾 <b>BACKUP</b> (' + sizeKB + ' KB)\n\n<pre>' + json.slice(0, 3500).replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;') + '</pre>');
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}
