// GET /api/sound/current
// Return info sound aktif (JSON)

export async function onRequestGet({ env }) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=30',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const db = env.JAVIN_DB;
    const row = await db.prepare(
      "SELECT id, name, mime, size, duration, created_at FROM sounds WHERE is_active = 1 LIMIT 1"
    ).first();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, reason: 'no_active_sound' }), { headers });
    }

    return new Response(JSON.stringify({
      ok: true,
      sound: {
        id: row.id,
        name: row.name,
        mime: row.mime,
        size: row.size,
        duration: row.duration,
        url: '/api/sound/file?id=' + encodeURIComponent(row.id),
        updated_at: row.created_at
      }
    }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: e.message }), { status: 500, headers });
  }
}
