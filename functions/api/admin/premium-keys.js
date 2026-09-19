// Admin API untuk manage premium keys
import { verifyAdmin } from './auth.js';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function genKey() {
  const n = Math.floor(Math.random() * 10000);
  return 'JV-' + String(n).padStart(4, '0');
}

// GET /api/admin/premium-keys
export async function onRequestGet({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  try {
    const rows = await db.prepare(
      'SELECT * FROM premium_keys ORDER BY created_at DESC LIMIT 500'
    ).all();
    return json({ ok: true, keys: rows.results || [] });
  } catch (e) {
    console.error('[DB ERROR]', e.message);
    return json({ ok: false, message: 'Terjadi kesalahan internal.' }, 500);
  }
}

// POST /api/admin/premium-keys
// Body: { label, max_uses, quantity }
export async function onRequestPost({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  try {
    const body = await request.json();
    const label = String(body.label || '').trim().slice(0, 60) || 'Tanpa label';
    const maxUses = Math.max(1, Math.min(100, parseInt(body.max_uses) || 5));
    const qty = Math.max(1, Math.min(20, parseInt(body.quantity) || 1));

    const created = [];
    const now = Date.now();

    for (let i = 0; i < qty; i++) {
      let key = null;
      // Coba generate sampai dapet yang unik (max 30x)
      for (let attempt = 0; attempt < 30; attempt++) {
        const candidate = genKey();
        const exists = await db.prepare('SELECT key FROM premium_keys WHERE key = ?').bind(candidate).first();
        if (!exists) { key = candidate; break; }
      }
      if (!key) continue;

      await db.prepare(
        'INSERT INTO premium_keys (key, label, owner_id, max_uses, used_count, status, created_at, last_used) VALUES (?, ?, NULL, ?, 0, "active", ?, NULL)'
      ).bind(key, label, maxUses, now).run();

      created.push(key);
    }

    return json({ ok: true, keys: created, message: created.length + ' key dibikin.' });
  } catch (e) {
    console.error('[ERROR]', e.message);
    return json({ ok: false, message: 'Terjadi kesalahan internal.' }, 500);
  }
}

// DELETE /api/admin/premium-keys?key=JV-XXXX
// Body opsional: { action: "revoke" | "delete" }
export async function onRequestDelete({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  try {
    const url = new URL(request.url);
    const key = String(url.searchParams.get('key') || '').trim();
    const mode = String(url.searchParams.get('mode') || 'revoke').toLowerCase();

    if (!key) return json({ ok: false, message: 'Key wajib.' }, 400);

    if (mode === 'delete') {
      await db.prepare('DELETE FROM premium_keys WHERE key = ?').bind(key).run();
      return json({ ok: true, message: 'Key dihapus.' });
    }

    await db.prepare('UPDATE premium_keys SET status = "revoked" WHERE key = ?').bind(key).run();
    return json({ ok: true, message: 'Key di-revoke.' });
  } catch (e) {
    console.error('[ERROR]', e.message);
    return json({ ok: false, message: 'Terjadi kesalahan internal.' }, 500);
  }
}
