// ===== Sound Commands Handler =====
// Storage: Telegram file_id (gak butuh KV/R2)

const TG_API = 'https://api.telegram.org/bot';

async function tgGet(env, method, params) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, reason: 'no_token' };
  const url = TG_API + token + '/' + method + (params ? '?' + new URLSearchParams(params) : '');
  try {
    const r = await fetch(url);
    return await r.json();
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

export async function tgGetFile(env, fileId) {
  const j = await tgGet(env, 'getFile', { file_id: fileId });
  if (!j.ok) return null;
  return j.result;
}

export function tgFileUrl(env, filePath) {
  return TG_API + env.TELEGRAM_BOT_TOKEN + '/' + filePath;
}

// ===== Handle file upload dari admin =====
export async function handleSoundFile(msg, env, reply) {
  const chatId = String(msg.chat.id);
  const file = msg.audio || msg.voice || msg.document || msg.video_note;
  if (!file) return false;

  // Validasi: audio only
  const isAudio = !!(msg.audio || msg.voice) || 
                  (msg.document && /audio|mp3|m4a|ogg|wav|aac/i.test(msg.document.mime_type || ''));
  if (!isAudio) {
    await reply(env, chatId, '❌ Cuma file audio yang bisa (mp3, m4a, ogg, wav).');
    return true;
  }

  // Max 20MB
  const size = file.file_size || 0;
  if (size > 20 * 1024 * 1024) {
    await reply(env, chatId, '❌ File kegedean. Max 20MB.');
    return true;
  }

  const db = env.JAVIN_DB;
  const id = 'snd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const name = msg.caption || file.file_name || ('sound-' + new Date().toISOString().slice(0, 10));
  const mime = file.mime_type || 'audio/mpeg';
  const duration = file.duration || 0;
  const fileId = file.file_id;

  try {
    // Set semua jadi non-aktif dulu
    await db.prepare("UPDATE sounds SET is_active = 0").run();
    // Insert baru sebagai aktif
    await db.prepare(
      "INSERT INTO sounds (id, file_id, name, mime, size, duration, uploaded_by, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)"
    ).bind(id, fileId, name, mime, size, duration, chatId, Date.now()).run();
    // Update config
    await db.prepare(
      "INSERT INTO config (key, value, updated_at) VALUES ('active_sound_id', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    ).bind(id, Date.now()).run();

    const sizeKB = Math.round(size / 1024);
    await reply(env, chatId,
      '✅ <b>SOUND UPDATED</b>\n\n' +
      '🆔 <code>' + id + '</code>\n' +
      '📛 ' + escapeHtml(name) + '\n' +
      '💾 ' + sizeKB + ' KB' +
      (duration ? '\n⏱ ' + duration + ' detik' : '') +
      '\n\nSound lama otomatis diganti. User akan dengar sound baru saat refresh web.'
    );
  } catch (e) {
    await reply(env, chatId, '❌ Gagal simpan: ' + e.message);
  }
  return true;
}

// ===== Handle text commands =====
export async function handleSoundCommand(cmd, args, chatId, env, reply) {
  const db = env.JAVIN_DB;

  // ==== /listsound ====
  if (cmd === '/listsound') {
    try {
      const rows = await db.prepare(
        "SELECT id, name, size, duration, is_active, created_at FROM sounds ORDER BY created_at DESC LIMIT 20"
      ).all();
      const list = (rows.results || []);
      if (!list.length) {
        await reply(env, chatId, '📭 Belum ada sound. Kirim file audio langsung ke bot buat nambah.');
        return true;
      }
      let text = '🎵 <b>DAFTAR SOUND</b> (' + list.length + ')\n\n';
      list.forEach((s, i) => {
        const sizeKB = Math.round((s.size || 0) / 1024);
        const active = s.is_active ? ' 🟢 AKTIF' : '';
        const date = new Date(s.created_at).toISOString().slice(0, 16).replace('T', ' ');
        text += (i + 1) + '. <code>' + s.id + '</code>' + active + '\n';
        text += '   📛 ' + escapeHtml(s.name || '-') + '\n';
        text += '   💾 ' + sizeKB + ' KB' + (s.duration ? ' · ⏱ ' + s.duration + 's' : '') + '\n';
        text += '   📅 ' + date + '\n\n';
      });
      text += '<i>Set aktif: /setsound &lt;id&gt;</i>';
      await reply(env, chatId, text);
    } catch (e) {
      await reply(env, chatId, '❌ Error: ' + e.message);
    }
    return true;
  }

  // ==== /setsound <id> ====
  if (cmd === '/setsound') {
    if (!args) {
      await reply(env, chatId, '⚠️ Pakai: <code>/setsound &lt;id&gt;</code>\nLiat id pakai /listsound.');
      return true;
    }
    const id = args.split(/\s+/)[0];
    try {
      const row = await db.prepare("SELECT id, name FROM sounds WHERE id = ?").bind(id).first();
      if (!row) {
        await reply(env, chatId, '❌ Sound dengan id <code>' + escapeHtml(id) + '</code> gak ketemu.');
        return true;
      }
      await db.prepare("UPDATE sounds SET is_active = 0").run();
      await db.prepare("UPDATE sounds SET is_active = 1 WHERE id = ?").bind(id).run();
      await db.prepare(
        "INSERT INTO config (key, value, updated_at) VALUES ('active_sound_id', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      ).bind(id, Date.now()).run();
      await reply(env, chatId, '✅ Aktif: <b>' + escapeHtml(row.name || id) + '</b>');
    } catch (e) {
      await reply(env, chatId, '❌ Error: ' + e.message);
    }
    return true;
  }

  // ==== /delsound <id> ====
  if (cmd === '/delsound') {
    if (!args) {
      await reply(env, chatId, '⚠️ Pakai: <code>/delsound &lt;id&gt;</code>');
      return true;
    }
    const id = args.split(/\s+/)[0];
    try {
      const row = await db.prepare("SELECT name, is_active FROM sounds WHERE id = ?").bind(id).first();
      if (!row) {
        await reply(env, chatId, '❌ Gak ketemu.');
        return true;
      }
      await db.prepare("DELETE FROM sounds WHERE id = ?").bind(id).run();
      if (row.is_active) {
        // Aktifkan yang paling baru kalau ada
        const latest = await db.prepare("SELECT id FROM sounds ORDER BY created_at DESC LIMIT 1").first();
        if (latest) {
          await db.prepare("UPDATE sounds SET is_active = 1 WHERE id = ?").bind(latest.id).run();
          await db.prepare("UPDATE config SET value = ?, updated_at = ? WHERE key = 'active_sound_id'").bind(latest.id, Date.now()).run();
        } else {
          await db.prepare("UPDATE config SET value = '', updated_at = ? WHERE key = 'active_sound_id'").bind(Date.now()).run();
        }
      }
      await reply(env, chatId, '🗑 Terhapus: <b>' + escapeHtml(row.name || id) + '</b>');
    } catch (e) {
      await reply(env, chatId, '❌ Error: ' + e.message);
    }
    return true;
  }

  // ==== /soundstatus ====
  if (cmd === '/soundstatus') {
    try {
      const row = await db.prepare(
        "SELECT id, name, size, duration, created_at FROM sounds WHERE is_active = 1 LIMIT 1"
      ).first();
      if (!row) {
        await reply(env, chatId, '📭 Belum ada sound aktif.\n\nKirim file audio ke bot buat nambah.');
        return true;
      }
      const sizeKB = Math.round((row.size || 0) / 1024);
      await reply(env, chatId,
        '🎵 <b>SOUND AKTIF</b>\n\n' +
        '🆔 <code>' + row.id + '</code>\n' +
        '📛 ' + escapeHtml(row.name || '-') + '\n' +
        '💾 ' + sizeKB + ' KB' +
        (row.duration ? '\n⏱ ' + row.duration + 's' : '')
      );
    } catch (e) {
      await reply(env, chatId, '❌ Error: ' + e.message);
    }
    return true;
  }

  // ==== /addsound (panduan) ====
  if (cmd === '/addsound') {
    await reply(env, chatId,
      '📤 <b>TAMBAH SOUND</b>\n\n' +
      'Cara: <b>Kirim file audio langsung</b> ke chat ini (mp3/m4a/ogg).\n\n' +
      '• Sound otomatis jadi aktif\n' +
      '• Sound lama tetap tersimpan\n' +
      '• Max 20MB\n\n' +
      'Caption (optional) = nama sound.'
    );
    return true;
  }

  return false;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
