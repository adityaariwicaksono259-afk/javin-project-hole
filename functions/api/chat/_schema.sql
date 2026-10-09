-- ============================================
-- JAVIN CHAT — Schema D1
-- ============================================

-- 1. Room chat 1-on-1 (pair user ↔ user)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_message_at INTEGER DEFAULT 0,
  UNIQUE(user_a, user_b)
);

-- 2. Pesan
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  sender_code TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER DEFAULT 0
);

-- 3. Blokir user
CREATE TABLE IF NOT EXISTS user_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blocker_code TEXT NOT NULL,
  blocked_code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(blocker_code, blocked_code)
);

-- 4. Laporan user
CREATE TABLE IF NOT EXISTS user_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_code TEXT NOT NULL,
  reported_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_a ON chat_rooms(user_a);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_b ON chat_rooms(user_b);
CREATE INDEX IF NOT EXISTS idx_chat_msgs_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON user_blocks(blocker_code);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON user_reports(reported_code);
