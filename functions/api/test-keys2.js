export async function onRequestGet({ env }) {
  try {
    const db = env.JAVIN_DB;
    const rows = await db.prepare('SELECT * FROM premium_keys ORDER BY created_at DESC LIMIT 10').all();
    return new Response(JSON.stringify({ ok: true, count: (rows.results||[]).length, rows: rows.results || [] }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
