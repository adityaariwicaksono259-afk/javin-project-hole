export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function ensureSchema(db) {
  const stmts = [
    'CREATE TABLE IF NOT EXISTS chat_rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, user_a TEXT NOT NULL, user_b TEXT NOT NULL, created_at INTEGER NOT NULL, last_message_at INTEGER DEFAULT 0, UNIQUE(user_a, user_b))',
    'CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, sender_code TEXT NOT NULL, text TEXT NOT NULL, created_at INTEGER NOT NULL, read_at INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS user_blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, blocker_code TEXT NOT NULL, blocked_code TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(blocker_code, blocked_code))',
    'CREATE TABLE IF NOT EXISTS user_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_code TEXT NOT NULL, reported_code TEXT NOT NULL, reason TEXT NOT NULL, detail TEXT, created_at INTEGER NOT NULL)',
    'CREATE TABLE IF NOT EXISTS user_bans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_code TEXT, device_hash TEXT, email_hash TEXT, level TEXT NOT NULL DEFAULT "ringan", reason TEXT NOT NULL, until INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS idx_chat_rooms_a ON chat_rooms(user_a)',
    'CREATE INDEX IF NOT EXISTS idx_chat_rooms_b ON chat_rooms(user_b)',
    'CREATE INDEX IF NOT EXISTS idx_chat_msgs_room ON chat_messages(room_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON user_blocks(blocker_code)',
    'CREATE INDEX IF NOT EXISTS idx_ban_usercode ON user_bans(user_code)',
    'CREATE INDEX IF NOT EXISTS idx_ban_device ON user_bans(device_hash)',
    'CREATE INDEX IF NOT EXISTS idx_ban_email ON user_bans(email_hash)'
  ];
  for (const s of stmts) {
    try { await db.prepare(s).run(); } catch(e) {}
  }
}

export async function getMe(request, db) {
  const cookie = request.headers.get('Cookie') || '';
  const now = Date.now();
  const demoMatch = cookie.match(/(?:^|;\s*)javin_demo=([^;]+)/);
  const match = demoMatch || cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  const session = await db.prepare(
    'SELECT * FROM auth_sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();
  if (!session) return null;
  const user = await db.prepare(
    'SELECT id, user_code, name, avatar, email, bio, onboarded FROM auth_users WHERE id = ?'
  ).bind(session.user_id).first();
  if (!user) return null;

  try {
    const ban = await db.prepare(
      'SELECT reason, until FROM user_bans WHERE user_code = ? AND until > ?'
    ).bind(user.user_code, now).first();
    if (ban) return { banned: true, reason: ban.reason, until: ban.until };
  } catch(e) {}

  return {
    id: user.id,
    code: user.user_code,
    name: user.name || 'User',
    avatar: user.avatar || '',
    email: user.email || '',
    bio: user.bio || '',
    onboarded: user.onboarded || 0
  };
}
