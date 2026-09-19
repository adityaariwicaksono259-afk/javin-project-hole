// GET  /api/admin/config - lihat config
// POST /api/admin/config - set config (body: {key, value})
import { verifyAdmin } from './auth.js';

export async function onRequestGet({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  try {
    const r = await db.prepare('SELECT key, value, updated_at FROM config ORDER BY key').all();
    return json({ ok: true, config: r.results || [] });
  } catch (e) {
    console.error('[DB ERROR]', e.message);
    return json({ ok: false, message: 'Terjadi kesalahan internal.' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return auth.response;

  const db = env.JAVIN_DB;
  if (!db) return json({ ok: false, message: 'DB belum di-bind.' }, 503);

  try {
    const body = await request.json();
    const key = String(body.key || '').trim();
    const value = String(body.value == null ? '' : body.value);

    if (!key || !/^[A-Za-z0-9_.-]{1,60}$/.test(key)) {
      return json({ ok: false, message: 'Key tidak valid.' }, 400);
    }
    if (value.length > 5000) {
      return json({ ok: false, message: 'Value terlalu panjang.' }, 400);
    }

    await db.prepare(
      'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    ).bind(key, value, Date.now()).run();

    return json({ ok: true, message: 'Config disimpan.' });
  } catch (e) {
    console.error('[ERROR]', e.message);
    return json({ ok: false, message: 'Terjadi kesalahan internal.' }, 500);
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
