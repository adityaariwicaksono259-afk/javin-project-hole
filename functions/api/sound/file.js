const TG_API = 'https://api.telegram.org/bot';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response('missing id', { status: 400 });

  try {
    const db = env.JAVIN_DB;
    const row = await db.prepare(
      "SELECT file_id, mime, name FROM sounds WHERE id = ? LIMIT 1"
    ).bind(id).first();

    if (!row || !row.file_id) {
      return new Response('sound not found', { status: 404 });
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) return new Response('bot token missing', { status: 500 });

    const gfRes = await fetch(TG_API + token + '/getFile?file_id=' + encodeURIComponent(row.file_id));
    const gf = await gfRes.json();
    if (!gf.ok || !gf.result || !gf.result.file_path) {
      return new Response('telegram getFile failed', { status: 502 });
    }

    const fileUrl = TG_API + token + '/' + gf.result.file_path;
    const audioRes = await fetch(fileUrl, {
      cf: { cacheEverything: true, cacheTtl: 604800 }
    });

    if (!audioRes.ok) {
      return new Response('telegram fetch failed: ' + audioRes.status, { status: 502 });
    }

    return new Response(audioRes.body, {
      status: 200,
      headers: {
        'Content-Type': row.mime || 'audio/mpeg',
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes'
      }
    });
  } catch (e) {
    return new Response('error: ' + e.message, { status: 500 });
  }
}
