// functions/_lib/gen-api-key.js
// Helper: generate API key + default credits untuk user baru

const API_KEY_LENGTH = 8;
const DEFAULT_CREDITS = 5;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// WIB timezone helpers
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const MIN_CREDITS_BEFORE_RESET = 5;

// Start of today (WIB) dalam ms UTC
function getTodayWibStartMs() {
  const nowWib = Date.now() + WIB_OFFSET_MS;
  const dayWib = Math.floor(nowWib / 86400000) * 86400000;
  return dayWib - WIB_OFFSET_MS;
} // tanpa 0,1,I,O biar gak bingung

/**
 * Generate random API key 8 karakter (contoh: LSHAI1728)
 */
export function generateApiKey() {
  const bytes = new Uint8Array(API_KEY_LENGTH);
  crypto.getRandomValues(bytes);
  let key = '';
  for (let i = 0; i < API_KEY_LENGTH; i++) {
    key += CHARS[bytes[i] % CHARS.length];
  }
  return key;
}

/**
 * Generate unique API key + pastikan gak duplikat di DB
 */
export async function generateUniqueApiKey(db) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const key = generateApiKey();
    try {
      const exist = await db.prepare(
        'SELECT api_key FROM auth_users WHERE api_key = ? LIMIT 1'
      ).bind(key).first();
      if (!exist) return key;
    } catch (e) {
      console.error('[GEN-API-KEY] check dup error:', e.message);
    }
  }
  // Fallback: tambah timestamp
  return generateApiKey() + Date.now().toString(36).slice(-2).toUpperCase();
}

/**
 * Ambil credits + api_key user (by id atau user_code)
 */
export async function getUserCredits(db, userId) {
  if (!db || !userId) return null;
  try {
    let user = await db.prepare(
      'SELECT id, user_code, api_key, credits FROM auth_users WHERE id = ? LIMIT 1'
    ).bind(userId).first();
    if (!user) {
      user = await db.prepare(
        'SELECT id, user_code, api_key, credits FROM auth_users WHERE user_code = ? LIMIT 1'
      ).bind(userId).first();
    }
    return user || null;
  } catch (e) {
    console.error('[GET-CREDITS]', e.message);
    return null;
  }
}

/**
 * Verify API key → return user + credits
 */
export async function verifyApiKey(db, apiKey) {
  if (!db) return { ok: false, code: 503, message: 'DB belum di-bind.' };
  if (!apiKey) return { ok: false, code: 401, message: 'API Key wajib.' };

  const key = String(apiKey).trim().toUpperCase();

  try {
    let user = await db.prepare(
      'SELECT id, user_code, api_key, credits, tier, last_credit_reset FROM auth_users WHERE api_key = ? LIMIT 1'
    ).bind(key).first();

    if (!user) {
      return { ok: false, code: 403, message: 'API Key tidak ditemukan.' };
    }

    // ==== LAZY RESET (auto jam 00.00 WIB) ====
    // Kalau user udah lewat hari reset & saldo < MIN, reset ke MIN
    const todayStart = getTodayWibStartMs();
    const lastReset = user.last_credit_reset || 0;
    const currentCredits = user.credits || 0;

    if (lastReset < todayStart && currentCredits < MIN_CREDITS_BEFORE_RESET) {
      try {
        await db.prepare(
          'UPDATE auth_users SET credits = ?, last_credit_reset = ? WHERE id = ?'
        ).bind(MIN_CREDITS_BEFORE_RESET, todayStart, user.id).run();

        user = { ...user, credits: MIN_CREDITS_BEFORE_RESET, last_credit_reset: todayStart };
        console.log('[LAZY-RESET] user ' + user.id + ' reset ' + currentCredits + ' → ' + MIN_CREDITS_BEFORE_RESET);
      } catch (e) {
        console.error('[LAZY-RESET]', e.message);
      }
    }

    return {
      ok: true,
      user,
      credits: user.credits || 0
    };
  } catch (e) {
    return { ok: false, code: 500, message: 'Internal error' };
  }
}

/**
 * Potong credits user (atomic) — return baru atau error
 */
export async function deductCredits(db, userId, cost) {
  if (!db || !userId || !cost) return { ok: false, message: 'Param invalid' };

  try {
    const user = await db.prepare(
      'SELECT credits FROM auth_users WHERE id = ? LIMIT 1'
    ).bind(userId).first();

    if (!user) return { ok: false, message: 'User tidak ditemukan.' };

    const oldCredits = user.credits || 0;
    if (oldCredits < cost) {
      return {
        ok: false,
        message: 'Kredit tidak cukup. Butuh ' + cost + ', punya ' + oldCredits + '.',
        credits: oldCredits,
        needed: cost
      };
    }

    const newCredits = oldCredits - cost;
    await db.prepare(
      'UPDATE auth_users SET credits = ? WHERE id = ?'
    ).bind(newCredits, userId).run();

    return {
      ok: true,
      credits: newCredits,
      cost,
      deducted: cost
    };
  } catch (e) {
    return { ok: false, message: 'Internal error' };
  }
}

/**
 * Tambah credits user (buat topup / bonus)
 */
export async function addCredits(db, userId, amount) {
  if (!db || !userId || !amount) return { ok: false, message: 'Param invalid' };

  try {
    const user = await db.prepare(
      'SELECT credits FROM auth_users WHERE id = ? LIMIT 1'
    ).bind(userId).first();

    if (!user) return { ok: false, message: 'User tidak ditemukan.' };

    const oldCredits = user.credits || 0;
    const newCredits = oldCredits + amount;

    await db.prepare(
      'UPDATE auth_users SET credits = ? WHERE id = ?'
    ).bind(newCredits, userId).run();

    return {
      ok: true,
      credits: newCredits,
      added: amount,
      old: oldCredits
    };
  } catch (e) {
    return { ok: false, message: 'Internal error' };
  }
}

export { DEFAULT_CREDITS, MIN_CREDITS_BEFORE_RESET, getTodayWibStartMs };
