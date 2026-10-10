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

// ============ ANNOUNCEMENT ============
export async function cmdAnnounce(env, chatId, args, reply){
  const db = env.JAVIN_DB;
  const arg = (args || '').trim();

  try {
    // Format: /announce add <type> <title> | <message>
    if (arg.indexOf('add ') === 0) {
      const rest = arg.slice(4).trim();
      // Parse type dulu (info/success/warning/danger/maintenance)
      const typeMatch = rest.match(/^(info|success|warning|danger|maintenance)\s+/i);
      let type = 'info';
      let payload = rest;
      if (typeMatch) {
        type = typeMatch[1].toLowerCase();
        payload = rest.slice(typeMatch[0].length).trim();
      }

      // Split by " | " jadi title + message
      const parts = payload.split('|');
      if (parts.length < 2) {
        await reply(env, chatId,
          '⚠️ Format: <code>/announce add [type] Judul | Pesan</code>\n\n' +
          'Type: info, success, warning, danger, maintenance\n\n' +
          'Contoh:\n' +
          '<code>/announce add info Server Update | Maintenance jam 12 malam ya'
        );
        return;
      }

      const title = parts[0].trim();
      const message = parts.slice(1).join('|').trim();

      if (!title || !message) {
        await reply(env, chatId, '⚠️ Judul & pesan gak boleh kosong.');
        return;
      }

      await db.prepare(
        'INSERT INTO announcements (title, message, type, active, created_at, expires_at) VALUES (?, ?, ?, 1, ?, NULL)'
      ).bind(title, message, type, Date.now()).run();

      await reply(env, chatId,
        '✅ <b>ANNOUNCEMENT DIBUAT</b>\n\n' +
        '🏷️ Type: <b>' + esc(type) + '</b>\n' +
        '📌 Title: ' + esc(title) + '\n' +
        '💬 Message: ' + esc(message.slice(0, 200))
      );
      return;
    }

    // Format: /announce del <id>
    if (arg.indexOf('del ') === 0) {
      const id = parseInt(arg.slice(4).trim());
      if (!id) { await reply(env, chatId, '⚠️ Pakai: <code>/announce del &lt;id&gt;</code>'); return; }
      await db.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run();
      await reply(env, chatId, '🗑️ Announcement #' + id + ' dihapus.');
      return;
    }

    // Format: /announce off <id>
    if (arg.indexOf('off ') === 0) {
      const id = parseInt(arg.slice(4).trim());
      if (!id) { await reply(env, chatId, '⚠️ Pakai: <code>/announce off &lt;id&gt;</code>'); return; }
      await db.prepare('UPDATE announcements SET active = 0 WHERE id = ?').bind(id).run();
      await reply(env, chatId, '⏸️ Announcement #' + id + ' dinonaktifkan.');
      return;
    }

    // Format: /announce on <id>
    if (arg.indexOf('on ') === 0) {
      const id = parseInt(arg.slice(3).trim());
      if (!id) { await reply(env, chatId, '⚠️ Pakai: <code>/announce on &lt;id&gt;</code>'); return; }
      await db.prepare('UPDATE announcements SET active = 1 WHERE id = ?').bind(id).run();
      await reply(env, chatId, '▶️ Announcement #' + id + ' diaktifkan.');
      return;
    }

    // Default: list announcements
    const rows = await db.prepare(
      'SELECT id, title, message, type, active, created_at, expires_at FROM announcements ORDER BY created_at DESC LIMIT 20'
    ).all();
    const list = rows.results || [];

    if (!list.length) {
      await reply(env, chatId,
        '📭 Belum ada announcement.\n\n' +
        '<b>Cara pakai:</b>\n' +
        '<code>/announce add [type] Judul | Pesan</code>\n' +
        '<code>/announce del &lt;id&gt;</code>\n' +
        '<code>/announce off &lt;id&gt;</code>\n' +
        '<code>/announce on &lt;id&gt;</code>\n\n' +
        'Type: info · success · warning · danger · maintenance'
      );
      return;
    }

    let h = '📢 <b>ANNOUNCEMENTS</b> (' + list.length + ')\n\n';
    list.forEach(function(a){
      const icon = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '🚨', maintenance: '🔧' }[a.type] || 'ℹ️';
      const st = a.active ? '🟢' : '⚪';
      h += st + ' #' + a.id + ' ' + icon + ' <b>' + esc(a.title) + '</b>\n';
      h += '   ' + esc(String(a.message).slice(0, 80)) + '\n';
    });
    h += '\n💡 <code>/announce add ...</code> · <code>/announce del &lt;id&gt;</code>';
    await reply(env, chatId, h);
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// ==================== IP MANAGEMENT (v1.0) ====================

// Helper: validasi format IP
function isValidIP(ip) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) ||
         /^[0-9a-f:]+$/i.test(ip); // IPv6 simple
}

// /whitelist <ip> [alasan]
export async function cmdWhitelistAdd(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const parts = (args || '').trim().split(/\s+/);
  const ip = parts[0];
  const reason = parts.slice(1).join(' ') || 'Manual whitelist via Telegram';

  if (!ip || !isValidIP(ip)) {
    await reply(env, chatId, '❓ Format: <code>/whitelist &lt;ip&gt; [alasan]</code>\\nContoh: <code>/whitelist 114.79.1.2 My office IP</code>');
    return;
  }

  try {
    const now = Date.now();
    await db.prepare(
      'INSERT INTO ip_whitelist (ip, reason, added_at, added_by) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(ip) DO UPDATE SET reason = excluded.reason, added_at = excluded.added_at'
    ).bind(ip, reason, now, 'telegram_admin').run();

    await reply(env, chatId,
      '✅ <b>IP WHITELISTED</b>\\n\\n' +
      '🌐 IP: <code>' + ip + '</code>\\n' +
      '📝 Alasan: ' + reason + '\\n' +
      '🕐 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19)
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + e.message);
  }
}

// /unban <ip>
export async function cmdUnban(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const ip = (args || '').trim().split(/\s+/)[0];
  if (!ip || !isValidIP(ip)) {
    await reply(env, chatId, '❓ Format: <code>/unban &lt;ip&gt;</code>');
    return;
  }

  try {
    const r1 = await db.prepare('DELETE FROM blocked_ips WHERE ip = ?').bind(ip).run();
    const r2 = await db.prepare('DELETE FROM ip_rate_limit WHERE ip = ?').bind(ip).run();
    const r3 = await db.prepare('DELETE FROM ip_errors WHERE ip = ?').bind(ip).run();

    const changes = (r1.meta && r1.meta.changes || 0) +
                    (r2.meta && r2.meta.changes || 0) +
                    (r3.meta && r3.meta.changes || 0);

    await reply(env, chatId,
      '✅ <b>IP UNBANNED</b>\\n\\n' +
      '🌐 IP: <code>' + ip + '</code>\\n' +
      '🗑️ Record dihapus: ' + changes + '\\n' +
      '🕐 ' + new Date().toISOString().replace('T', ' ').slice(0, 19)
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + e.message);
  }
}

// /ban <ip> [alasan]
export async function cmdBan(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const parts = (args || '').trim().split(/\s+/);
  const ip = parts[0];
  const reason = parts.slice(1).join(' ') || 'Manual ban via Telegram';

  if (!ip || !isValidIP(ip)) {
    await reply(env, chatId, '❓ Format: <code>/ban &lt;ip&gt; [alasan]</code>');
    return;
  }

  try {
    const now = Date.now();
    const until = now + (365 * 24 * 60 * 60 * 1000); // ban 1 tahun

    await db.prepare(
      'INSERT INTO blocked_ips (ip, reason, until, created_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(ip) DO UPDATE SET reason = excluded.reason, until = excluded.until'
    ).bind(ip, reason, until, now).run();

    // Hapus dari whitelist kalau ada (biar konsisten)
    try { await db.prepare('DELETE FROM ip_whitelist WHERE ip = ?').bind(ip).run(); } catch(e) {}

    await reply(env, chatId,
      '🚫 <b>IP BANNED</b>\\n\\n' +
      '🌐 IP: <code>' + ip + '</code>\\n' +
      '📝 Alasan: ' + reason + '\\n' +
      '⏱️ Durasi: 1 tahun\\n' +
      '🕐 ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19)
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + e.message);
  }
}

// ==================== TIER MANAGEMENT (v1.0) ====================

const TIER_DEFAULT_DAYS = { basic: 5, pro: 12, unlimited: 36, free: 0 };
const TIER_LIST = ['free', 'basic', 'pro', 'unlimited'];

// Cari user by id ATAU user_code
async function findAuthUser(db, identifier) {
  let user = await db.prepare(
    'SELECT id, user_code, name, email, tier, tier_expires_at FROM auth_users WHERE id = ? LIMIT 1'
  ).bind(identifier).first();

  if (!user) {
    user = await db.prepare(
      'SELECT id, user_code, name, email, tier, tier_expires_at FROM auth_users WHERE user_code = ? LIMIT 1'
    ).bind(identifier).first();
  }

  return user;
}

// /settier <user_id> <tier> [hari]
export async function cmdSetTier(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const parts = (args || '').trim().split(/\s+/);
  const identifier = parts[0];
  const tier = (parts[1] || '').toLowerCase();
  const daysArg = parts[2];

  if (!identifier || !tier) {
    await reply(env, chatId,
      '❓ Format: <code>/settier &lt;user_id&gt; &lt;tier&gt; [hari]</code>\n\n' +
      '<b>Tier:</b> free, basic, pro, unlimited\n' +
      '<b>Contoh:</b>\n' +
      '<code>/settier JH-ABC123 pro 30</code>\n' +
      '<code>/settier kp:e24... basic</code> (pakai default 5 hari)'
    );
    return;
  }

  if (TIER_LIST.indexOf(tier) === -1) {
    await reply(env, chatId, '❌ Tier tidak valid. Pilih: free, basic, pro, unlimited.');
    return;
  }

  try {
    const user = await findAuthUser(db, identifier);
    if (!user) {
      await reply(env, chatId, '❌ User <code>' + identifier + '</code> tidak ditemukan.');
      return;
    }

    const now = Date.now();
    let newExpires = 0;
    let days = 0;

    if (tier === 'free') {
      newExpires = 0;
      days = 0;
    } else {
      days = daysArg ? parseInt(daysArg, 10) : TIER_DEFAULT_DAYS[tier];
      if (!isFinite(days) || days < 1 || days > 3650) {
        await reply(env, chatId, '❌ Durasi tidak valid (1-3650 hari).');
        return;
      }

      // Kalau user masih punya tier aktif, extend dari expiry lama
      const baseTime = (user.tier_expires_at && user.tier_expires_at > now) ? user.tier_expires_at : now;
      newExpires = baseTime + (days * 24 * 60 * 60 * 1000);
    }

    await db.prepare(
      'UPDATE auth_users SET tier = ?, tier_expires_at = ? WHERE id = ?'
    ).bind(tier, newExpires, user.id).run();

    // Update extra_limit di tabel users (biar /api/user/me konsisten)
    const TIER_LIMITS = { free: 20, demo: 3, basic: 70, pro: 150, unlimited: 500 };
    try {
      const userRow = await db.prepare('SELECT id FROM users WHERE id = ?').bind(user.id).first();
      if (userRow) {
        await db.prepare('UPDATE users SET extra_limit = ? WHERE id = ?').bind(TIER_LIMITS[tier], user.id).run();
      }
    } catch(e) {}

    const expiryStr = newExpires > 0
      ? new Date(newExpires).toISOString().replace('T', ' ').slice(0, 19)
      : '(tanpa expiry)';

    await reply(env, chatId,
      '✅ <b>TIER UPDATED</b>\n\n' +
      '👤 User: <code>' + user.id + '</code>\n' +
      '🏷️ Nama: ' + (user.name || '-') + '\n' +
      '🎫 Tier baru: <b>' + tier + '</b>\n' +
      '⏱️ Durasi: ' + (days > 0 ? days + ' hari' : '-') + '\n' +
      '📅 Expires: ' + expiryStr + '\n' +
      '🕐 Update: ' + new Date(now).toISOString().replace('T', ' ').slice(0, 19)
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + e.message);
  }
}

// /removetier <user_id>
export async function cmdRemoveTier(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const identifier = (args || '').trim().split(/\s+/)[0];
  if (!identifier) {
    await reply(env, chatId, '❓ Format: <code>/removetier &lt;user_id&gt;</code>');
    return;
  }

  try {
    const user = await findAuthUser(db, identifier);
    if (!user) {
      await reply(env, chatId, '❌ User <code>' + identifier + '</code> tidak ditemukan.');
      return;
    }

    await db.prepare(
      'UPDATE auth_users SET tier = "free", tier_expires_at = 0 WHERE id = ?'
    ).bind(user.id).run();

    // Reset extra_limit ke 20
    try {
      await db.prepare('UPDATE users SET extra_limit = 20 WHERE id = ?').bind(user.id).run();
    } catch(e) {}

    await reply(env, chatId,
      '✅ <b>TIER REMOVED</b>\n\n' +
      '👤 User: <code>' + user.id + '</code>\n' +
      '🏷️ Nama: ' + (user.name || '-') + '\n' +
      '🎫 Tier sekarang: <b>free</b>\n' +
      '📊 Limit: 20/hari\n' +
      '🕐 ' + new Date().toISOString().replace('T', ' ').slice(0, 19)
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + e.message);
  }
}

// /tier <user_id>
export async function cmdTierInfo(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const identifier = (args || '').trim().split(/\s+/)[0];
  if (!identifier) {
    await reply(env, chatId, '❓ Format: <code>/tier &lt;user_id&gt;</code>');
    return;
  }

  try {
    const user = await findAuthUser(db, identifier);
    if (!user) {
      await reply(env, chatId, '❌ User <code>' + identifier + '</code> tidak ditemukan.');
      return;
    }

    const now = Date.now();
    const active = user.tier && user.tier !== 'free' && (!user.tier_expires_at || user.tier_expires_at > now);

    let sisaStr = '-';
    if (user.tier_expires_at && user.tier_expires_at > now) {
      const sisaMs = user.tier_expires_at - now;
      const sisaHari = Math.floor(sisaMs / (24 * 60 * 60 * 1000));
      const sisaJam = Math.floor((sisaMs % (24 * 60 * 60 * 1000)) / 3600000);
      sisaStr = sisaHari + ' hari ' + sisaJam + ' jam';
    }

    const expiryStr = user.tier_expires_at
      ? new Date(user.tier_expires_at).toISOString().replace('T', ' ').slice(0, 19)
      : '-';

    await reply(env, chatId,
      '🎫 <b>USER TIER INFO</b>\n\n' +
      '👤 ID: <code>' + user.id + '</code>\n' +
      '🆔 Code: <code>' + (user.user_code || '-') + '</code>\n' +
      '🏷️ Nama: ' + (user.name || '-') + '\n' +
      '📧 Email: ' + (user.email || '-') + '\n\n' +
      '🎖️ Tier: <b>' + (user.tier || 'free') + '</b> ' + (active ? '✅' : '(expired)') + '\n' +
      '📅 Expires: ' + expiryStr + '\n' +
      '⏱️ Sisa: ' + sisaStr
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + e.message);
  }
}


// ==================== USER BAN MANAGEMENT (v2.0) ====================

// /appeals — list banding pending
export async function cmdAppeals(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const status = (args || 'pending').trim().toLowerCase();

  try {
    const rows = await db.prepare(
      'SELECT a.id, a.ban_id, a.user_code, a.message, a.created_at, ' +
      'b.level AS ban_level, b.reason AS ban_reason, b.until AS ban_until ' +
      'FROM ban_appeals a LEFT JOIN user_bans b ON a.ban_id = b.id ' +
      'WHERE a.status = ? ORDER BY a.created_at DESC LIMIT 20'
    ).bind(status).all();

    const list = rows.results || [];
    if (!list.length) {
      await reply(env, chatId, '📭 Tidak ada banding dengan status: <b>' + esc(status) + '</b>');
      return;
    }

    let h = '📋 <b>BANDING (' + esc(status.toUpperCase()) + ')</b> — ' + list.length + '\n\n';
    list.forEach(function(a) {
      h += '<b>#' + a.id + '</b> · <code>' + esc(a.user_code) + '</code>\n';
      h += '   Level ban: ' + esc(a.ban_level || '?') + '\n';
      h += '   Alasan ban: ' + esc((a.ban_reason || '').slice(0, 60)) + '\n';
      h += '   Pesan: ' + esc(a.message.slice(0, 100)) + (a.message.length > 100 ? '...' : '') + '\n';
      h += '   → <code>/approve ' + a.id + '</code> atau <code>/reject ' + a.id + ' [catatan]</code>\n\n';
    });
    await reply(env, chatId, h);
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// /approve <appeal_id> — setujui banding, cabut ban
export async function cmdApprove(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const appealId = parseInt((args || '').trim().split(/\s+/)[0], 10);
  if (!appealId) { await reply(env, chatId, '❓ Format: <code>/approve &lt;id&gt;</code>'); return; }

  try {
    const appeal = await db.prepare(
      'SELECT id, ban_id, user_code, status FROM ban_appeals WHERE id = ?'
    ).bind(appealId).first();

    if (!appeal) { await reply(env, chatId, '❌ Banding #' + appealId + ' tidak ditemukan.'); return; }
    if (appeal.status !== 'pending') {
      await reply(env, chatId, '⚠️ Banding #' + appealId + ' udah diproses sebelumnya (' + appeal.status + ').');
      return;
    }

    const now = Date.now();
    await db.prepare(
      'UPDATE ban_appeals SET status = "approved", admin_note = "Approved via Telegram", resolved_at = ? WHERE id = ?'
    ).bind(now, appealId).run();

    await db.prepare('DELETE FROM user_bans WHERE id = ?').bind(appeal.ban_id).run();

    await reply(env, chatId,
      '✅ <b>BANDING DISETUJUI</b>\n\n' +
      '🆔 Appeal: <code>#' + appealId + '</code>\n' +
      '👤 User: <code>' + esc(appeal.user_code) + '</code>\n' +
      '🔓 Ban dicabut, user bisa akses lagi.'
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// /reject <appeal_id> [catatan] — tolak banding
export async function cmdReject(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const parts = (args || '').trim().split(/\s+/);
  const appealId = parseInt(parts[0], 10);
  const note = parts.slice(1).join(' ') || 'Ditolak via Telegram';

  if (!appealId) { await reply(env, chatId, '❓ Format: <code>/reject &lt;id&gt; [catatan]</code>'); return; }

  try {
    const appeal = await db.prepare(
      'SELECT id, ban_id, user_code, status FROM ban_appeals WHERE id = ?'
    ).bind(appealId).first();

    if (!appeal) { await reply(env, chatId, '❌ Banding #' + appealId + ' tidak ditemukan.'); return; }
    if (appeal.status !== 'pending') {
      await reply(env, chatId, '⚠️ Banding #' + appealId + ' udah diproses (' + appeal.status + ').');
      return;
    }

    const now = Date.now();
    await db.prepare(
      'UPDATE ban_appeals SET status = "rejected", admin_note = ?, resolved_at = ? WHERE id = ?'
    ).bind(note, now, appealId).run();

    await reply(env, chatId,
      '❌ <b>BANDING DITOLAK</b>\n\n' +
      '🆔 Appeal: <code>#' + appealId + '</code>\n' +
      '👤 User: <code>' + esc(appeal.user_code) + '</code>\n' +
      '📝 Catatan: ' + esc(note)
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// /userban <user_code> [alasan] — ban manual user
export async function cmdUserBan(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const parts = (args || '').trim().split(/\s+/);
  const userCode = parts[0];
  const reason = parts.slice(1).join(' ') || 'Manual ban via Telegram';

  if (!userCode) { await reply(env, chatId, '❓ Format: <code>/userban &lt;user_code&gt; [alasan]</code>'); return; }

  try {
    const user = await db.prepare(
      'SELECT id, user_code, name FROM auth_users WHERE user_code = ? LIMIT 1'
    ).bind(userCode).first();

    if (!user) { await reply(env, chatId, '❌ User <code>' + esc(userCode) + '</code> tidak ditemukan.'); return; }

    const now = Date.now();
    // Permanen (until = 0)
    await db.prepare(
      'INSERT INTO user_bans (user_code, level, reason, until, created_at) VALUES (?, ?, ?, 0, ?) ' +
      'ON CONFLICT(id) DO NOTHING'
    ).bind(user.user_code, 'parah', 'Manual ban: ' + reason, now).run();

    await reply(env, chatId,
      '🚫 <b>USER BANNED</b>\n\n' +
      '👤 User: <code>' + esc(user.user_code) + '</code>\n' +
      '📛 Nama: ' + esc(user.name || '-') + '\n' +
      '📝 Alasan: ' + esc(reason) + '\n' +
      '⏱️ Durasi: <b>Permanen</b>'
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// /userunban <user_code> — cabut ban
export async function cmdUserUnban(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const userCode = (args || '').trim().split(/\s+/)[0];
  if (!userCode) { await reply(env, chatId, '❓ Format: <code>/userunban &lt;user_code&gt;</code>'); return; }

  try {
    const ban = await db.prepare(
      'SELECT id, level, reason FROM user_bans WHERE user_code = ? LIMIT 1'
    ).bind(userCode).first();

    if (!ban) { await reply(env, chatId, 'ℹ️ User <code>' + esc(userCode) + '</code> tidak sedang dibanned.'); return; }

    await db.prepare('DELETE FROM user_bans WHERE user_code = ?').bind(userCode).run();

    await reply(env, chatId,
      '✅ <b>USER UNBANNED</b>\n\n' +
      '👤 User: <code>' + esc(userCode) + '</code>\n' +
      '📝 Alasan ban sebelumnya: ' + esc(ban.reason || '-')
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}

// /userbanlist — list user yang dibanned
export async function cmdUserBanList(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  try {
    const rows = await db.prepare(
      'SELECT user_code, level, reason, until, created_at FROM user_bans ORDER BY created_at DESC LIMIT 30'
    ).all();

    const list = rows.results || [];
    if (!list.length) { await reply(env, chatId, '📭 Tidak ada user yang dibanned.'); return; }

    const now = Date.now();
    let h = '🚫 <b>DAFTAR USER BANNED</b> — ' + list.length + '\n\n';
    list.forEach(function(b) {
      const isPerm = !b.until || b.until === 0;
      const untilStr = isPerm ? '<b>Permanen</b>' : new Date(b.until).toISOString().slice(0, 16).replace('T', ' ');
      const expire = !isPerm && b.until < now ? ' ⏰(expired)' : '';
      h += '👤 <code>' + esc(b.user_code) + '</code> · <b>' + esc(b.level || '?') + '</b>\n';
      h += '   📝 ' + esc((b.reason || '').slice(0, 60)) + '\n';
      h += '   ⏱️ ' + untilStr + expire + '\n\n';
    });
    h += 'Unban: <code>/userunban &lt;user_code&gt;</code>';
    await reply(env, chatId, h);
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}


// ==================== /pemberitahuan — BROADCAST SIMPLE ====================

// /pemberitahuan <teks>
// Kirim pemberitahuan ke inbox semua user. Format simpel.
export async function cmdPemberitahuan(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const message = (args || '').trim();
  if (!message) {
    await reply(env, chatId,
      '❓ <b>Format:</b>\n' +
      '<code>/pemberitahuan &lt;teks&gt;</code>\n\n' +
      '<b>Contoh:</b>\n' +
      '<code>/pemberitahuan Server maintenance jam 12 malam ya</code>\n\n' +
      '<b>Subcommand:</b>\n' +
      '<code>/pemberitahuan list</code> — list semua pemberitahuan\n' +
      '<code>/pemberitahuan hapus &lt;id&gt;</code> — hapus'
    );
    return;
  }

  // Subcommand: list
  if (message.toLowerCase() === 'list') {
    try {
      const rows = await db.prepare(
        'SELECT id, title, message, active, created_at FROM announcements ORDER BY created_at DESC LIMIT 20'
      ).all();
      const list = rows.results || [];
      if (!list.length) { await reply(env, chatId, '📭 Belum ada pemberitahuan.'); return; }

      let h = '📢 <b>DAFTAR PEMBERITAHUAN</b> — ' + list.length + '\n\n';
      list.forEach(function(a) {
        const status = a.active ? '🟢' : '🔴';
        h += status + ' <b>#' + a.id + '</b> · ' + new Date(a.created_at).toISOString().slice(0, 16).replace('T', ' ') + '\n';
        h += '   <b>' + esc(a.title) + '</b>\n';
        h += '   ' + esc(a.message.slice(0, 100)) + (a.message.length > 100 ? '...' : '') + '\n\n';
      });
      h += '<code>/pemberitahuan hapus &lt;id&gt;</code>';
      await reply(env, chatId, h);
    } catch(e) {
      await reply(env, chatId, '❌ Error: ' + esc(e.message));
    }
    return;
  }

  // Subcommand: hapus <id>
  const hapusMatch = message.match(/^hapus\s+(\d+)$/i);
  if (hapusMatch) {
    const id = parseInt(hapusMatch[1], 10);
    try {
      await db.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run();
      await reply(env, chatId, '🗑️ Pemberitahuan <b>#' + id + '</b> dihapus.');
    } catch(e) {
      await reply(env, chatId, '❌ Error: ' + esc(e.message));
    }
    return;
  }

  // Kirim pemberitahuan baru
  // Auto-generate title dari 50 karakter pertama
  const title = message.length > 50 ? message.slice(0, 47) + '...' : message;
  const type = 'info';

  try {
    const ins = await db.prepare(
      'INSERT INTO announcements (title, message, type, active, created_at, expires_at) VALUES (?, ?, ?, 1, ?, NULL)'
    ).bind(title, message, type, Date.now()).run();

    // Hitung total user untuk konfirmasi
    const cnt = await db.prepare('SELECT COUNT(*) as c FROM auth_users').first();
    const total = (cnt && cnt.c) || 0;

    await reply(env, chatId,
      '✅ <b>PEMBERITAHUAN TERKIRIM</b>\n\n' +
      '🆔 ID: <code>' + ins.meta.last_row_id + '</code>\n' +
      '📌 Judul: ' + esc(title) + '\n' +
      '💬 Pesan: ' + esc(message.slice(0, 200)) + (message.length > 200 ? '...' : '') + '\n' +
      '👥 Terkirim ke <b>' + total + '</b> user (via inbox)\n\n' +
      'Batalkan: <code>/pemberitahuan hapus ' + ins.meta.last_row_id + '</code>'
    );
  } catch(e) {
    await reply(env, chatId, '❌ Error: ' + esc(e.message));
  }
}


// ==================== ENDPOINT MANAGEMENT (v3.0) ====================

import { addEndpoint, editEndpoint, hideEndpoint, restoreEndpoint, listBotEndpoints, autoDetectParams, scanEndpoint, formatScanResult } from './endpoints-editor.js';

// ============================================
// /api — tambah endpoint (interactive atau quick)
// ============================================
export async function cmdApiAdd(env, chatId, args, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  const arg = (args || '').trim();

  // ==== QUICK MODE: /api url, nama, folder, desc, params ====
  if (arg) {
    const parts = arg.split(',').map(s => s.trim());
    if (parts.length < 4) {
      await reply(env, chatId,
        '❓ <b>Format quick:</b>\n' +
        '<code>/api url, nama, folder, deskripsi, params</code>\n\n' +
        '<b>Contoh:</b>\n' +
        '<code>/api https://api.com/cek, cek-ai, ai, Cari metadata AI, query</code>\n\n' +
        'Atau ketik <code>/api</code> aja buat mode step-by-step.'
      );
      return;
    }

    const [url, name, folder, desc, params, ...rest] = parts;
    // Cek flag -post
    const allRest = [params, ...rest].filter(Boolean).join(' ');
    const method = /-post/i.test(allRest) ? 'POST' : 'GET';
    const cleanParams = (params || '').replace(/-post/gi, '').trim();

    await reply(env, chatId, '⏳ Memproses...');
    const result = await addEndpoint(env, { url, name, folder, desc: desc || name, params: cleanParams, method });

    if (!result.ok) {
      await reply(env, chatId, '❌ Gagal: ' + esc(result.message));
      return;
    }

    const ep = result.endpoint;
    await reply(env, chatId,
      '✅ <b>ENDPOINT DITAMBAHKAN</b>\n\n' +
      '📛 Nama: <b>' + esc(ep.name) + '</b>\n' +
      '📁 Folder: ' + esc(ep.folder) + '\n' +
      '🔗 URL: <code>' + esc(ep.upstream) + '</code>\n' +
      '🚪 Method: ' + ep.m + '\n' +
      '📋 Params: ' + (ep.params.length ? ep.params.map(p => p.n).join(', ') : '-') + '\n' +
      '🆔 ID: <code>' + ep.catalogId + '</code>\n\n' +
      '⏱️ Live dalam 1-2 menit.'
    );
    return;
  }

  // ==== INTERACTIVE MODE ====
  await db.prepare(
    'INSERT INTO bot_sessions (chat_id, state, data, updated_at) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(chat_id) DO UPDATE SET state = excluded.state, data = excluded.data, updated_at = excluded.updated_at'
  ).bind(String(chatId), 'api_await_url', '{}', Date.now()).run();

  await reply(env, chatId,
    '🔧 <b>TAMBAH ENDPOINT BARU</b>\n\n' +
    '<b>Step 1/5:</b> Kirim URL upstream\n\n' +
    'Contoh:\n' +
    '<code>https://api.nexadev.my.id/c.ai</code>\n\n' +
    'Ketik <code>/cancel</code> buat batalin.'
  );
}

// ============================================
// HANDLE STEP INTERACTIVE
// ============================================
export async function handleApiStep(env, chatId, text, reply) {
  const db = env.JAVIN_DB;
  if (!db) return false;

  // Ambil session
  const sess = await db.prepare(
    'SELECT state, data FROM bot_sessions WHERE chat_id = ? LIMIT 1'
  ).bind(String(chatId)).first();

  if (!sess || !sess.state || sess.state === 'idle') return false;
  if (!sess.state.startsWith('api_await_')) return false;

  // Cek timeout (10 menit)
  // (updated_at di-cek di caller atau auto-handled)
  let data = {};
  try { data = JSON.parse(sess.data || '{}'); } catch(e) {}

  // ==== STEP 1: URL ====
  if (sess.state === 'api_await_url') {
    const url = text.trim();
    if (!/^https?:\/\//i.test(url)) {
      await reply(env, chatId, '❌ URL harus mulai dengan <code>http://</code> atau <code>https://</code>\n\nCoba lagi:');
      return true;
    }
    data.url = url;
    await updateSession(db, chatId, 'api_await_name', data);
    await reply(env, chatId,
      '✅ URL disimpan.\n\n' +
      '<b>Step 2/5:</b> Nama tool? (contoh: cek-ai)'
    );
    return true;
  }

  // ==== STEP 2: NAMA ====
  if (sess.state === 'api_await_name') {
    const name = text.trim();
    if (name.length < 2 || name.length > 40) {
      await reply(env, chatId, '❌ Nama harus 2-40 karakter. Coba lagi:');
      return true;
    }
    data.name = name;
    await updateSession(db, chatId, 'api_await_folder', data);
    await reply(env, chatId,
      '✅ Nama disimpan.\n\n' +
      '<b>Step 3/5:</b> Folder?\n\n' +
      'Contoh: <code>ai</code>, <code>tools</code>, <code>downloader</code>, <code>search</code>, <code>osint</code>, <code>canvas</code>'
    );
    return true;
  }

  // ==== STEP 3: FOLDER ====
  if (sess.state === 'api_await_folder') {
    const folder = text.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,30}$/.test(folder)) {
      await reply(env, chatId, '❌ Folder cuma boleh huruf kecil, angka, -, _. Coba lagi:');
      return true;
    }
    data.folder = folder;
    await updateSession(db, chatId, 'api_await_desc', data);
    await reply(env, chatId,
      '✅ Folder disimpan.\n\n' +
      '<b>Step 4/5:</b> Deskripsi singkat?'
    );
    return true;
  }

  // ==== STEP 4: DESKRIPSI ====
  if (sess.state === 'api_await_desc') {
    const desc = text.trim();
    if (desc.length < 5 || desc.length > 200) {
      await reply(env, chatId, '❌ Deskripsi 5-200 karakter. Coba lagi:');
      return true;
    }
    data.desc = desc;

    // Scan comprehensive
    await reply(env, chatId, '🔍 Scanning endpoint...\n\nCek reachable, SSL, auth, param, response shape...');

    let scan;
    try {
      scan = await scanEndpoint(data.url);
    } catch (e) {
      scan = { ok: false, errors: ['Scan error: ' + e.message], checks: {}, warnings: [], detected_param: '' };
    }

    // Format hasil scan pakai HTML (bukan markdown)
    const scanLines = [];
    scanLines.push('🔍 <b>HASIL SCAN</b>');
    scanLines.push('─────────────────');
    scanLines.push((scan.checks?.reachable ? '✅' : '❌') + ' Reachable: ' + (scan.status || '-'));
    scanLines.push((scan.checks?.ssl ? '✅' : '⚠️') + ' SSL: ' + (scan.checks?.ssl ? 'Valid' : 'HTTP only'));
    scanLines.push((scan.checks?.fast ? '✅' : '⚠️') + ' Speed: ' + (scan.elapsed_ms || 0) + 'ms');
    scanLines.push((scan.checks?.auth ? '⚠️' : '✅') + ' Auth: ' + (scan.checks?.auth ? '<b>BUTUH</b>' : 'Tidak butuh'));
    scanLines.push('📄 Content: ' + (scan.content_type ? esc(scan.content_type) : '-'));
    scanLines.push('🎯 Shape: ' + (scan.response_shape ? esc(scan.response_shape) : '-'));
    scanLines.push('📋 Param: ' + (scan.detected_param ? '<b>' + esc(scan.detected_param) + '</b>' : '(tidak butuh / tidak terdeteksi)'));
    scanLines.push('─────────────────');

    if (scan.warnings && scan.warnings.length) {
      scanLines.push('⚠️ <b>Warnings:</b>');
      scan.warnings.slice(0, 4).forEach(w => scanLines.push('• ' + esc(w)));
    }

    if (scan.errors && scan.errors.length) {
      scanLines.push('❌ <b>Errors:</b>');
      scan.errors.slice(0, 4).forEach(e => scanLines.push('• ' + esc(e)));
    }

    scanLines.push('');

    // Kalau scan deteksi website HTML — kasih user pilihan (skip/generate/tutorial)
    if (scan.type === 'website' || (scan.response_shape === 'html' && !scan.checks?.reachable)) {
      await handleWebsiteFound(env, chatId, data, reply);
      return true;
    }

    // Kalau ada API key / umbrella
    if (scan.is_umbrella) {
      scanLines.push('❌ <b>Endpoint umbrella</b> — butuh API key / auth.');
      scanLines.push('');
      scanLines.push('Mau lanjut tetep tambah? Endpoint bakal ada di katalog, tapi user harus akses manual (nggak bisa auto-proxy).');
      scanLines.push('');
      scanLines.push('Kirim <code>ya</code> buat tetep tambah, atau <code>/cancel</code>');
      data._umbrellaWarning = true;
      await updateSession(db, chatId, 'api_preview_umbrella', data);
      await reply(env, chatId, scanLines.join('\n'));
      return true;
    }

    // Kalau scan sukses
    if (scan.ok) {
      scanLines.push('✅ <b>Bisa di-proxy dari CF</b>');
      data.params = scan.detected_param;
      data._autoDetected = true;
      data._scanInfo = {
        content_type: scan.content_type,
        response_shape: scan.response_shape,
        elapsed_ms: scan.elapsed_ms
      };
      await updateSession(db, chatId, 'api_preview', data);

      scanLines.push('');
      scanLines.push('<b>Step 5/5: Preview</b>');
      scanLines.push('─────────────────');
      scanLines.push('📛 Nama: <b>' + esc(data.name) + '</b>');
      scanLines.push('📁 Folder: ' + esc(data.folder));
      scanLines.push('🔗 URL: <code>' + esc(data.url) + '</code>');
      scanLines.push('📝 Desc: ' + esc(data.desc));
      scanLines.push('📋 Params: ' + (scan.detected_param || '-'));
      scanLines.push('🚪 Method: GET');
      scanLines.push('─────────────────');
      scanLines.push('');
      scanLines.push('Kirim <code>ya</code> buat simpan, atau ketik params manual (contoh: <code>query|limit</code>)');

      await reply(env, chatId, scanLines.join('\n'));
    } else {
      // Gagal scan
      scanLines.push('⚠️ <b>Scan gagal total</b>');
      scanLines.push('');
      scanLines.push('Kemungkinan:');
      scanLines.push('• Upstream block CF');
      scanLines.push('• Butuh konfigurasi khusus');
      scanLines.push('• URL salah / server down');
      scanLines.push('');
      scanLines.push('Kirim params manual buat tetep lanjut, atau <code>/cancel</code>');
      await updateSession(db, chatId, 'api_await_params', data);
      await reply(env, chatId, scanLines.join('\n'));
    }
    return true;
  }

  // ==== STEP 5a: PARAMS MANUAL ====
  if (sess.state === 'api_await_params') {
    const params = text.trim();
    data.params = params === '-' ? '' : params;
    await updateSession(db, chatId, 'api_preview', data);

    await reply(env, chatId,
      '<b>Step 5/5: Preview</b>\n' +
      '─────────────────\n' +
      '📛 Nama: <b>' + esc(data.name) + '</b>\n' +
      '📁 Folder: ' + esc(data.folder) + '\n' +
      '🔗 URL: <code>' + esc(data.url) + '</code>\n' +
      '📝 Desc: ' + esc(data.desc) + '\n' +
      '📋 Params: ' + (data.params || '-') + '\n' +
      '🚀 Method: GET\n' +
      '─────────────────\n\n' +
      'Kirim <code>ya</code> buat simpan, atau <code>/cancel</code>'
    );
    return true;
  }

  // ==== STEP 5a-bis: PREVIEW UMBRELLA ====
  if (sess.state === 'api_preview_umbrella') {
    if (!/^ya$/i.test(text.trim())) {
      await reply(env, chatId, '❓ Kirim <code>ya</code> buat tetep tambah, atau <code>/cancel</code>');
      return true;
    }

    await reply(env, chatId, '⏳ Menyimpan...');
    const result = await addEndpoint(env, {
      url: data.url,
      name: data.name,
      folder: data.folder,
      desc: data.desc + ' [UMBRELLA — akses manual]',
      params: data.params || '',
      method: 'GET'
    });

    await clearSession(db, chatId);

    if (!result.ok) {
      await reply(env, chatId, '❌ Gagal: ' + esc(result.message));
      return true;
    }

    await reply(env, chatId,
      '✅ <b>DITAMBAHKAN (UMBRELLA)</b>\n\n' +
      '📛 Nama: <b>' + esc(result.endpoint.name) + '</b>\n' +
      '⚠️ Status: Butuh API key / auth\n' +
      '🆔 ID: <code>' + result.endpoint.catalogId + '</code>\n\n' +
      'Catatan: User mungkin perlu akses manual.'
    );
    return true;
  }

  // ==== STEP 5b: PREVIEW & CONFIRM ====
  if (sess.state === 'api_preview') {
    if (!/^ya$/i.test(text.trim())) {
      await reply(env, chatId, '❓ Kirim <code>ya</code> buat simpan, atau <code>/cancel</code> buat batal.');
      return true;
    }

    await reply(env, chatId, '⏳ Menyimpan ke GitHub...');
    const result = await addEndpoint(env, {
      url: data.url,
      name: data.name,
      folder: data.folder,
      desc: data.desc,
      params: data.params,
      method: 'GET'
    });

    await clearSession(db, chatId);

    if (!result.ok) {
      await reply(env, chatId, '❌ Gagal: ' + esc(result.message));
      return true;
    }

    const ep = result.endpoint;
    await reply(env, chatId,
      '✅ <b>ENDPOINT BERHASIL DITAMBAHKAN</b>\n\n' +
      '📛 Nama: <b>' + esc(ep.name) + '</b>\n' +
      '📁 Folder: ' + esc(ep.folder) + '\n' +
      '🆔 ID: <code>' + ep.catalogId + '</code>\n\n' +
      '⏱️ Live dalam 1-2 menit.\n' +
      'Edit: <code>/edit ' + esc(ep.name) + '</code>\n' +
      'Hide: <code>/hapus ' + esc(ep.name) + '</code>'
    );
    return true;
  }

  return false;
}

// Helper: update session state
async function updateSession(db, chatId, state, data) {
  await db.prepare(
    'INSERT INTO bot_sessions (chat_id, state, data, updated_at) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(chat_id) DO UPDATE SET state = excluded.state, data = excluded.data, updated_at = excluded.updated_at'
  ).bind(String(chatId), state, JSON.stringify(data), Date.now()).run();
}

// Helper: clear session
async function clearSession(db, chatId) {
  await db.prepare('DELETE FROM bot_sessions WHERE chat_id = ?').bind(String(chatId)).run();
}

// ============================================
// /cancel — batalin flow
// ============================================
export async function cmdCancel(env, chatId, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }
  await clearSession(db, chatId);
  await reply(env, chatId, '✅ Dibatalkan.');
}

// ============================================
// /apilist — list endpoint dari bot
// ============================================
export async function cmdApiList(env, chatId, args, reply) {
  const mode = (args || '').trim().toLowerCase();

  await reply(env, chatId, '⏳ Ambil dari GitHub...');
  const result = await listBotEndpoints(env);
  if (!result.ok) {
    await reply(env, chatId, '❌ Gagal: ' + esc(result.message));
    return;
  }

  let list = result.endpoints;
  if (mode === 'hidden') list = list.filter(e => e.hidden);
  else if (mode !== 'all') list = list.filter(e => !e.hidden);

  if (list.length === 0) {
    await reply(env, chatId, '📭 Belum ada endpoint dari bot' + (mode === 'hidden' ? ' yang di-hide.' : '.'));
    return;
  }

  let h = '📋 <b>ENDPOINT BOT</b> — ' + list.length + '\n\n';
  list.forEach((ep, i) => {
    if (i >= 25) return;
    const status = ep.hidden ? '🚫' : '✅';
    h += status + ' <b>' + esc(ep.name) + '</b>\n';
    h += '   📁 ' + esc(ep.folder) + ' · 🆔 <code>' + esc(ep.catalogId) + '</code>\n';
  });
  if (list.length > 25) h += '\n... dan ' + (list.length - 25) + ' lainnya';
  h += '\n\nEdit: <code>/edit &lt;nama&gt;</code>\nHide: <code>/hapus &lt;nama&gt;</code>';
  await reply(env, chatId, h);
}

// ============================================
// /edit <nama> — edit endpoint
// ============================================
export async function cmdApiEdit(env, chatId, args, reply) {
  const name = (args || '').trim();
  if (!name) {
    await reply(env, chatId, '❓ Format: <code>/edit &lt;nama&gt;</code>');
    return;
  }

  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  // Cek endpoint ada
  const list = await listBotEndpoints(env);
  if (!list.ok) { await reply(env, chatId, '❌ ' + esc(list.message)); return; }

  const target = list.endpoints.find(e => (e.name || '').toLowerCase() === name.toLowerCase() || e.catalogId === name);
  if (!target) { await reply(env, chatId, '❌ Endpoint "' + esc(name) + '" tidak ditemukan.'); return; }

  // Simpan session
  const data = { targetName: target.name };
  await db.prepare(
    'INSERT INTO bot_sessions (chat_id, state, data, updated_at) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(chat_id) DO UPDATE SET state = excluded.state, data = excluded.data, updated_at = excluded.updated_at'
  ).bind(String(chatId), 'edit_choose_field', JSON.stringify(data), Date.now()).run();

  await reply(env, chatId,
    '✏️ <b>EDIT: ' + esc(target.name) + '</b>\n\n' +
    '<b>Data sekarang:</b>\n' +
    '📛 Nama: ' + esc(target.name) + '\n' +
    '📁 Folder: ' + esc(target.folder) + '\n' +
    '🔗 URL: <code>' + esc(target.upstream || '-') + '</code>\n' +
    '📝 Desc: ' + esc(target.desc || '-') + '\n' +
    '📋 Params: ' + (target.params && target.params.length ? target.params.map(p => p.n).join(', ') : '-') + '\n\n' +
    '<b>Pilih yang mau di-edit:</b>\n' +
    '1️⃣ Nama\n' +
    '2️⃣ Deskripsi\n' +
    '3️⃣ Folder\n' +
    '4️⃣ Params\n' +
    '5️⃣ URL\n\n' +
    'Kirim angka (1-5) atau <code>/cancel</code>'
  );
}

// ============================================
// /hapus <nama> — hide endpoint
// ============================================
export async function cmdApiHide(env, chatId, args, reply) {
  const name = (args || '').trim();
  if (!name) {
    await reply(env, chatId, '❓ Format: <code>/hapus &lt;nama&gt;</code>');
    return;
  }

  await reply(env, chatId, '⏳ Memproses...');
  const result = await hideEndpoint(env, name);

  if (!result.ok) {
    await reply(env, chatId, '❌ ' + esc(result.message));
    return;
  }

  await reply(env, chatId,
    '✅ <b>' + esc(name) + '</b> di-hide dari halaman user.\n\n' +
    'Data tetap tersimpan di endpoints.json.\n' +
    'Pulihkan: <code>/pulihkan ' + esc(name) + '</code>\n' +
    'Live dalam 1-2 menit.'
  );
}

// ============================================
// /pulihkan <nama> — restore endpoint
// ============================================
export async function cmdApiRestore(env, chatId, args, reply) {
  const name = (args || '').trim();
  if (!name) {
    await reply(env, chatId, '❓ Format: <code>/pulihkan &lt;nama&gt;</code>');
    return;
  }

  await reply(env, chatId, '⏳ Memproses...');
  const result = await restoreEndpoint(env, name);

  if (!result.ok) {
    await reply(env, chatId, '❌ ' + esc(result.message));
    return;
  }

  await reply(env, chatId,
    '✅ <b>' + esc(name) + '</b> muncul lagi di halaman user.' +
    (result.was_hidden ? '' : '\n\nℹ️ Sebelumnya nggak dalam status hidden.') + '\n\n' +
    'Live dalam 1-2 menit.'
  );
}

// ============================================
// HANDLE EDIT STEP (dipanggil dari handleApiStep atau standalone)
// ============================================
export async function handleEditStep(env, chatId, text, reply) {
  const db = env.JAVIN_DB;
  if (!db) return false;

  const sess = await db.prepare(
    'SELECT state, data FROM bot_sessions WHERE chat_id = ? LIMIT 1'
  ).bind(String(chatId)).first();

  if (!sess || !sess.state || !sess.state.startsWith('edit_')) return false;

  let data = {};
  try { data = JSON.parse(sess.data || '{}'); } catch(e) {}

  // ==== Pilih field ====
  if (sess.state === 'edit_choose_field') {
    const choice = text.trim();
    const map = { '1': 'name', '2': 'desc', '3': 'folder', '4': 'params', '5': 'url' };
    const field = map[choice];
    if (!field) {
      await reply(env, chatId, '❓ Kirim angka 1-5, atau <code>/cancel</code>');
      return true;
    }
    data.field = field;
    await updateSession(db, chatId, 'edit_await_value', data);
    const labelMap = { name: 'Nama baru', desc: 'Deskripsi baru', folder: 'Folder baru', params: 'Params baru (contoh: query|limit atau -)', url: 'URL baru' };
    await reply(env, chatId, labelMap[field] + '?');
    return true;
  }

  // ==== Input value ====
  if (sess.state === 'edit_await_value') {
    const val = text.trim();
    const fields = {};
    fields[data.field] = val;

    await reply(env, chatId, '⏳ Menyimpan...');
    const result = await editEndpoint(env, data.targetName, fields);
    await clearSession(db, chatId);

    if (!result.ok) {
      await reply(env, chatId, '❌ Gagal: ' + esc(result.message));
      return true;
    }

    await reply(env, chatId, '✅ Berhasil di-update.\n\nLive dalam 1-2 menit.');
    return true;
  }

  return false;
}


// ==================== /testgithub — CEK KONEKSI GITHUB ====================

import { testConnection } from './github.js';

export async function cmdTestGithub(env, chatId, reply) {
  await reply(env, chatId, '🔍 Cek koneksi GitHub...');

  const result = await testConnection(env);

  if (!result.ok) {
    await reply(env, chatId,
      '❌ <b>GITHUB ERROR</b>\n\n' +
      'Reason: <code>' + esc(result.message) + '</code>\n\n' +
      '<b>Kemungkinan penyebab:</b>\n' +
      '• <code>GITHUB_TOKEN</code> belum di-set di CF env\n' +
      '• Token sudah expired/revoked\n' +
      '• Scope token kurang (harus ada <b>repo</b>)\n' +
      '• Typo di nama token'
    );
    return;
  }

  await reply(env, chatId,
    '✅ <b>GITHUB OK</b>\n\n' +
    '📦 Repo: <code>' + esc(result.repo) + '</code>\n' +
    '🌿 Branch: <code>' + esc(result.default_branch) + '</code>\n' +
    '🔒 Private: ' + (result.private ? 'Ya' : 'Tidak') + '\n\n' +
    'Coba: <code>/apilist</code> buat cek endpoint bot.'
  );
}


// ==================== WEBSITE SCRAPER GENERATOR ====================

import {
  generateScraperScript,
  generatePackageJson,
  generateReadme,
  createGithubRepo,
  commitGeneratedFiles
} from './script-generator.js';

// ============================================
// HANDLE WEBSITE DETECTION — setelah scan
// ============================================
export async function handleWebsiteFound(env, chatId, data, reply) {
  const db = env.JAVIN_DB;
  if (!db) { await reply(env, chatId, '❌ DB gak tersedia.'); return; }

  await reply(env, chatId,
    '🌐 <b>WEBSITE TERDETEKSI</b>\n\n' +
    'URL yang kamu kasih ini <b>website HTML</b>, bukan API.\n' +
    'Biar bisa dipakai di Javin, perlu di-scrape dulu (butuh Node.js server).\n\n' +
    '<b>Pilih:</b>\n' +
    '1️⃣ <b>Skip</b> — jangan tambah\n' +
    '2️⃣ <b>Generate template</b> — bot bikin script Node.js + deploy guide\n' +
    '3️⃣ <b>Setup manual</b> — kasih tutorial Render\n\n' +
    'Kirim angka (1-3) atau <code>/cancel</code>'
  );

  await db.prepare(
    'INSERT INTO bot_sessions (chat_id, state, data, updated_at) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(chat_id) DO UPDATE SET state = excluded.state, data = excluded.data, updated_at = excluded.updated_at'
  ).bind(String(chatId), 'website_choose', JSON.stringify(data), Date.now()).run();
}

// ============================================
// HANDLE WEBSITE STEP (dipanggil dari handleApiStep)
// ============================================
export async function handleWebsiteStep(env, chatId, text, reply) {
  const db = env.JAVIN_DB;
  if (!db) return false;

  const sess = await db.prepare(
    'SELECT state, data FROM bot_sessions WHERE chat_id = ? LIMIT 1'
  ).bind(String(chatId)).first();

  if (!sess || !sess.state || !sess.state.startsWith('website_')) return false;

  let data = {};
  try { data = JSON.parse(sess.data || '{}'); } catch(e) {}

  // ==== Choose 1/2/3 ====
  if (sess.state === 'website_choose') {
    const choice = text.trim();

    if (choice === '1') {
      await clearSession(db, chatId);
      await reply(env, chatId, '✅ Dibatalkan. Endpoint nggak ditambah.');
      return true;
    }

    if (choice === '2') {
      // Bot auto-generate script + repo GitHub
      await generateScraperRepo(env, chatId, data, reply);
      return true;
    }

    if (choice === '3') {
      await reply(env, chatId,
        '📖 <b>TUTORIAL SETUP MANUAL</b>\n\n' +
        '<b>Yang dibutuhkan:</b>\n' +
        '• Akun GitHub\n' +
        '• Akun Render (gratis)\n\n' +
        '<b>Langkah:</b>\n' +
        '1. Buat repo GitHub: <code>' + esc((data.name || 'scraper') + '-backend') + '</code>\n' +
        '2. Buat file <code>server.js</code> (pakai code dari bot)\n' +
        '3. Buat <code>package.json</code> dengan deps: express, axios, cheerio\n' +
        '4. Push ke GitHub\n' +
        '5. Buat Web Service di render.com\n' +
        '6. Copy URL Render → register ke bot\n\n' +
        'Atau balik ke menu dan pilih <b>2</b> buat auto-generate.\n\n' +
        'Ketik <code>/cancel</code> buat keluar.'
      );
      return true;
    }

    await reply(env, chatId, '❓ Kirim 1, 2, atau 3. Atau /cancel.');
    return true;
  }

  return false;
}

// ============================================
// AUTO-GENERATE REPO + SCRIPT
// ============================================
async function generateScraperRepo(env, chatId, data, reply) {
  const db = env.JAVIN_DB;
  const repoName = (data.name || 'scraper').toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-backend';

  await reply(env, chatId,
    '🤖 <b>Auto-generate script...</b>\n\n' +
    '📦 Bikin repo: <code>' + repoName + '</code>\n' +
    '📝 Generate server.js\n' +
    '📄 Generate package.json + README\n' +
    '🚀 Commit ke GitHub\n\n' +
    'Tunggu 10-30 detik...'
  );

  // 1. Buat repo
  const repoResult = await createGithubRepo(env, repoName, true);
  if (!repoResult.ok) {
    await clearSession(db, chatId);
    await reply(env, chatId,
      '❌ <b>Gagal bikin repo</b>\n\n' +
      'Error: <code>' + esc(repoResult.message) + '</code>\n\n' +
      'Kemungkinan:\n' +
      '• Repo <code>' + repoName + '</code> udah ada di akun kamu\n' +
      '• Token GitHub expired\n' +
      '• Rate limit GitHub'
    );
    return;
  }

  // 2. Generate file
  const serverCode = generateScraperScript({
    name: data.name,
    upstream: data.url,
    path: '/scrape',
    params: data.params ? data.params.split('|') : ['q']
  });

  const pkgJson = generatePackageJson(repoName);
  const readme = generateReadme(data.name, data.url, '/scrape');

  // 3. Commit file ke repo
  const commitResult = await commitGeneratedFiles(
    env,
    env.GITHUB_OWNER || 'adityaariwicaksono259-afk',
    repoName,
    [
      { path: 'server.js', content: serverCode },
      { path: 'package.json', content: pkgJson },
      { path: 'README.md', content: readme }
    ],
    'Initial commit: auto-generated by JAVIN Bot'
  );

  await clearSession(db, chatId);

  if (!commitResult.ok) {
    await reply(env, chatId,
      '⚠️ Repo dibuat tapi commit gagal.\n\n' +
      'Repo: <code>' + repoResult.repo + '</code>\n' +
      'Error: <code>' + esc(commitResult.message) + '</code>\n\n' +
      'Upload manual via GitHub web UI.'
    );
    return;
  }

  // Summary singkat
  await reply(env, chatId,
    '✅ <b>REPO BERHASIL DIBUAT</b>\n\n' +
    '📦 Repo: <code>' + repoResult.repo + '</code>\n' +
    '🔗 URL: ' + repoResult.url + '\n' +
    '📄 Files: ' + commitResult.committed.join(', ') + '\n\n' +
    '📨 Mengirim file + panduan lengkap...'
  );

  // Kirim file server.js + package.json + panduan lengkap
  await sendSetupGuide(env, chatId, data, reply);
}


// ==================== SEND FILE VIA TELEGRAM ====================

// Kirim file via Telegram sendDocument
async function sendFileTelegram(env, chatId, filename, content, caption) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, message: 'TELEGRAM_BOT_TOKEN kosong.' };

  // Telegram pakai multipart/form-data untuk sendDocument
  const boundary = '----JavinBot' + Date.now();
  const parts = [];

  // Field: chat_id
  parts.push('--' + boundary + '\r\n');
  parts.push('Content-Disposition: form-data; name="chat_id"\r\n\r\n');
  parts.push(String(chatId) + '\r\n');

  // Field: caption
  if (caption) {
    parts.push('--' + boundary + '\r\n');
    parts.push('Content-Disposition: form-data; name="caption"\r\n\r\n');
    parts.push(caption + '\r\n');
  }

  // Field: parse_mode
  parts.push('--' + boundary + '\r\n');
  parts.push('Content-Disposition: form-data; name="parse_mode"\r\n\r\n');
  parts.push('HTML\r\n');

  // Field: document (file)
  parts.push('--' + boundary + '\r\n');
  parts.push(`Content-Disposition: form-data; name="document"; filename="${filename}"\r\n`);
  parts.push('Content-Type: text/javascript\r\n\r\n');
  parts.push(content + '\r\n');

  // Closing
  parts.push('--' + boundary + '--\r\n');

  const body = parts.join('');

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      body: body
    });
    const j = await r.json();
    if (j && j.ok) return { ok: true };
    return { ok: false, message: (j && j.description) || 'Telegram error' };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// ============================================
// KIRIM PANDUAN LENGKAP KE USER
// ============================================
export async function sendSetupGuide(env, chatId, data, reply) {
  const db = env.JAVIN_DB;
  if (!db) return;

  const name = data.name || 'scraper';
  const repoName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-backend';
  const upstream = data.url || '';
  const params = data.params || 'q';
  const paramsList = params.split('|').map(s => s.trim()).filter(Boolean);

  // ============================================
  // 1. KIRIM FILE server.js
  // ============================================
  const serverCode = generateScraperScript({
    name: name,
    upstream: upstream,
    path: '/scrape',
    params: paramsList
  });

  await sendFileTelegram(env, chatId, 'server.js', serverCode,
    '📄 <b>server.js</b>\nFile utama. Upload ke repo GitHub.'
  );

  // ============================================
  // 2. KIRIM FILE package.json
  // ============================================
  const pkgJson = generatePackageJson(repoName);
  await sendFileTelegram(env, chatId, 'package.json', pkgJson,
    '📄 <b>package.json</b>\nDependencies. Upload ke repo GitHub.'
  );

  // ============================================
  // 3. KIRIM PANDUAN + KODE YANG HARUS DIEDIT
  // ============================================
  const startIdx = serverCode.indexOf('// ====== PARSING ======');
  const endIdx = serverCode.indexOf('res.json({', startIdx);
  const parsingCode = startIdx !== -1 && endIdx !== -1
    ? serverCode.slice(startIdx, endIdx).trim()
    : '// (bagian parsing nggak terdeteksi)';

  const guide = [
    '📖 <b>PANDUAN LENGKAP</b>',
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '<b>📋 Yang barusan gua kirim:</b>',
    '• <code>server.js</code> — file utama',
    '• <code>package.json</code> — dependencies',
    '',
    '<b>🚀 LANGKAH DEPLOY:</b>',
    '',
    '<b>1. Bikin repo GitHub</b>',
    '   • Buka: https://github.com/new',
    '   • Nama: <code>' + repoName + '</code>',
    '   • Private: ✅',
    '   • JANGAN centang "Add README"',
    '   • Klik <b>Create repository</b>',
    '',
    '<b>2. Upload 2 file</b>',
    '   • Di repo baru, klik <b>Add file</b> → <b>Upload files</b>',
    '   • Upload <code>server.js</code> + <code>package.json</code>',
    '   • Klik <b>Commit changes</b>',
    '',
    '<b>3. Deploy ke Render</b>',
    '   • Buka: https://dashboard.render.com',
    '   • Login pakai GitHub',
    '   • Klik <b>New</b> → <b>Web Service</b>',
    '   • Connect repo <code>' + repoName + '</code>',
    '   • Setting:',
    '      - Name: <code>' + repoName + '</code>',
    '      - Region: <b>Singapore</b>',
    '      - Build: <code>npm install</code>',
    '      - Start: <code>npm start</code>',
    '      - Plan: <b>Free</b>',
    '   • Klik <b>Create Web Service</b>',
    '   • Tunggu 2-5 menit',
    '',
    '<b>4. Register ke bot</b>',
    '   Setelah Render live, dapet URL kayak:',
    '   <code>https://' + repoName + '.onrender.com</code>',
    '',
    '   Kirim ke gua:',
    '   <code>/api https://' + repoName + '.onrender.com/scrape, ' + name + ', tools, ' + (data.desc || name) + ', ' + params + '</code>',
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    '<b>⚠️ YANG HARUS DIGANTI DI server.js</b>',
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    'Cari komentar: <code>⚠️ EDIT BAGIAN INI</code>',
    '',
    'Ada <b>2 bagian</b> yang perlu diganti:',
    '',
    '<b>A. Build URL</b> — sesuaikan format param:',
    '<pre>' + escapeHtml(
`// SEKARANG (generik):
const targetUrl = UPSTREAM_BASE + '?q=' + encodeURIComponent(q);

// CONTOH (kalau target beda format):
const targetUrl = UPSTREAM_BASE + '/search/' + q;
// atau
const targetUrl = UPSTREAM_BASE + '/api?keyword=' + q + '&limit=20';`
    ) + '</pre>',
    '',
    '<b>B. Selector Parsing</b> — sesuaikan dengan struktur HTML target:',
    '<pre>' + escapeHtml(
`// SEKARANG (generik):
$('article, .item, .card, .result').each((i, el) => {
  const link = $el.find('a').first().attr('href');
  const title = $el.find('h1, h2, h3').first().text();
  const image = $el.find('img').first().attr('src');
  ...
});

// CONTOH (spesifik LK21):
$('article.card').each((i, el) => {
  const link = $el.find('figure a').attr('href');
  const title = $el.find('h3.poster-title').text().trim();
  const image = $el.find('img').attr('data-src');
  ...
});`
    ) + '</pre>',
    '',
    '<b>🔍 Cara nemu selector yang bener:</b>',
    '1. Buka website target di Chrome HP',
    '2. Long-press elemen (judul/poster) → <b>Inspect</b>',
    '3. Catat <code>class</code> atau <code>id</code>-nya',
    '4. Ganti selector di <code>server.js</code>',
    '5. Commit ulang ke GitHub (Render auto-redeploy)',
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    '<b>💡 TIPS:</b>',
    '• Bot udah kasih template kerja — tinggal edit selector',
    '• Test hasil dulu di browser: <code>' + upstream + '</code>',
    '• Kalau bingung, kirim screenshot ke gua (via support page)',
    '• Render free tier sleep 15 menit, bangun butuh 30 detik'
  ].join('\n');

  await reply(env, chatId, guide);

  // Clear session
  await db.prepare('DELETE FROM bot_sessions WHERE chat_id = ?').bind(String(chatId)).run();
}


// ==================== /cariendpoint — cari endpoint dari website ====================

import { findEndpoints, formatFinderResult } from './endpoint-finder.js';

export async function cmdCariEndpoint(env, chatId, args, reply) {
  const url = (args || '').trim();

  if (!url) {
    await reply(env, chatId,
      '❓ <b>Format:</b>\n' +
      '<code>/cariendpoint &lt;url&gt;</code>\n\n' +
      '<b>Contoh:</b>\n' +
      '<code>/cariendpoint manhwadesu.wiki</code>\n' +
      '<code>/cariendpoint https://lk21official.cc</code>'
    );
    return;
  }

  await reply(env, chatId,
    '🔍 <b>Cari endpoint</b>\n' +
    '🌐 <code>' + esc(url) + '</code>\n\n' +
    '⏳ Proses: 10-30 detik...\n' +
    'Tunggu ya.'
  );

  let result;
  try {
    result = await findEndpoints(url, function(progress) {
      console.log('[FINDER]', progress);
    });
  } catch (e) {
    console.error('[CARIENDPOINT]', e);
    await reply(env, chatId,
      '❌ <b>Scan gagal</b>\n\n' +
      'Error: <code>' + esc(e.message || 'unknown') + '</code>\n\n' +
      'Coba lagi atau kirim screenshot ke gue.'
    );
    return;
  }

  // Format hasil — max 20 endpoint biar nggak kepanjangan
  const formatted = formatFinderResult(result, 20);

  // Split jadi chunk max 3500 char (aman dari 4096 limit)
  const chunks = splitText(formatted, 3500);

  for (let i = 0; i < chunks.length; i++) {
    const prefix = chunks.length > 1 ? '<i>📄 Part ' + (i+1) + '/' + chunks.length + '</i>\n\n' : '';
    try {
      await reply(env, chatId, prefix + chunks[i]);
    } catch (e) {
      console.error('[CARIENDPOINT-SEND]', e);
      // Kalau kirim gagal, coba tanpa prefix
      try { await reply(env, chatId, chunks[i]); } catch (e2) {}
    }
    // Delay antar chunk (rate limit Telegram)
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

// Helper: split text jadi chunks max char, tidak motong HTML tag
function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const lines = text.split('\n');
  const chunks = [];
  let current = '';

  for (const line of lines) {
    const wouldBe = current ? current + '\n' + line : line;
    if (wouldBe.length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current = wouldBe;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
