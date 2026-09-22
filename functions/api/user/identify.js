// POST /api/user/identify
// Body: { fp: "hash-hex", components: { ua, screen, cores, gpu, tz, ... } }
// Return: { ok, uid, is_new, matched_via }

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function genUserId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) s += chars[bytes[i] % chars.length];
  return 'JH-' + s;
}

// Hitung kesamaan 2 komponen string (0-1)
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  // Jaccard similarity dari karakter
  const sa = new Set(a.split(''));
  const sb = new Set(b.split(''));
  let inter = 0;
  for (const ch of sa) if (sb.has(ch)) inter++;
  return inter / (sa.size + sb.size - inter);
}

// Total similarity score (0-100)
function componentScore(a, b) {
  const keys = ['ua', 'screen', 'cores', 'gpu', 'tz', 'lang', 'platform', 'mem', 'touch', 'dpr'];
  let total = 0, count = 0;
  for (const k of keys) {
    if (a[k] && b[k]) {
      total += similarity(String(a[k]), String(b[k]));
      count++;
    }
  }
  if (count === 0) return 0;
  return Math.round((total / count) * 100);
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ ok: false, message: 'Body tidak valid.' }, 400); }

  const fp = String(body.fp || '').trim().toLowerCase();
  const components = body.components || null;

  if (!fp || !/^[a-f0-9]{16,128}$/.test(fp)) {
    return json({ ok: false, message: 'Fingerprint tidak valid.' }, 400);
  }

  const now = Date.now();

  try {
    // ==== 1. Exact match ====
    const exact = await db.prepare(
      'SELECT user_id, components FROM fingerprints WHERE fp_hash = ?'
    ).bind(fp).first();

    if (exact && exact.user_id) {
      await db.prepare('UPDATE fingerprints SET last_seen = ? WHERE fp_hash = ?').bind(now, fp).run();
      await ensureUser(db, exact.user_id, now);
      return json({ ok: true, uid: exact.user_id, is_new: false, matched_via: 'exact' });
    }

    // ==== 2. Fuzzy match (kalau ada components) ====
    if (components && typeof components === 'object') {
      // Ambil 100 fingerprint terbaru
      const recent = await db.prepare(
        'SELECT fp_hash, user_id, components FROM fingerprints WHERE last_seen > ? ORDER BY last_seen DESC LIMIT 100'
      ).bind(now - 90 * 24 * 60 * 60 * 1000).all();

      let best = null;
      let bestScore = 0;

      for (const row of (recent.results || [])) {
        if (!row.components) continue;
        let rowComp;
        try { rowComp = JSON.parse(row.components); } catch (e) { continue; }
        const score = componentScore(components, rowComp);
        if (score > bestScore) {
          bestScore = score;
          best = row;
        }
      }

      // Threshold: 70% kemiripan → consider same device
      if (best && bestScore >= 70) {
        console.log('[IDENTIFY] Fuzzy match:', fp, '→', best.user_id, 'score:', bestScore);
        // Update fp_hash dengan yang baru (supaya next time exact match)
        await db.prepare(
          'INSERT INTO fingerprints (fp_hash, user_id, components, created_at, last_seen) VALUES (?, ?, ?, ?, ?) ON CONFLICT(fp_hash) DO UPDATE SET user_id = excluded.user_id, components = excluded.components, last_seen = excluded.last_seen'
        ).bind(fp, best.user_id, JSON.stringify(components), now, now).run();

        await ensureUser(db, best.user_id, now);
        return json({ ok: true, uid: best.user_id, is_new: false, matched_via: 'fuzzy', score: bestScore });
      }
    }

    // ==== 3. Bikin user baru ====
    let uid = genUserId();
    let attempts = 0;
    while (attempts < 5) {
      const dup = await db.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first();
      if (!dup) break;
      uid = genUserId();
      attempts++;
    }

    await db.prepare(
      'INSERT INTO fingerprints (fp_hash, user_id, components, created_at, last_seen) VALUES (?, ?, ?, ?, ?)'
    ).bind(fp, uid, components ? JSON.stringify(components) : null, now, now).run();

    await db.prepare(
      'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, 0, ?, ?, 0)'
    ).bind(uid, now, now).run();

    return json({ ok: true, uid: uid, is_new: true, matched_via: 'new' });

  } catch (e) {
    console.error('[IDENTIFY] Error:', e.message);
    return json({ ok: false, message: 'DB error: ' + e.message }, 500);
  }
}

async function ensureUser(db, uid, now) {
  const u = await db.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first();
  if (!u) {
    await db.prepare(
      'INSERT INTO users (id, extra_limit, created_at, last_seen, total_request) VALUES (?, 0, ?, ?, 0)'
    ).bind(uid, now, now).run();
  } else {
    await db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(now, uid).run();
  }
}
