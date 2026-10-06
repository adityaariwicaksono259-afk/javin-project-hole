// POST /api/premium/bind-key  body: { key }
// GET  /api/premium/bind-key?key=JV-XXXX → cek status

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

async function getKeyRow(db, key) {
  if (!db) return { ok: false, code: 503, message: 'DB belum di-bind.' };
  if (!key) return { ok: false, code: 401, message: 'API Key wajib.' };

  const row = await db.prepare(
    'SELECT * FROM premium_keys WHERE key = ? LIMIT 1'
  ).bind(key).first();

  if (!row) {
    return { ok: false, code: 404, message: 'API Key tidak ditemukan.' };
  }

  if (row.status === 'revoked') {
    return { ok: false, code: 403, message: 'API Key sudah di-revoke admin.' };
  }

  const remaining = Math.max(
    0,
    (row.max_uses || 0) - (row.used_count || 0)
  );

  if (row.status === 'exhausted' || remaining <= 0) {
    return {
      ok: false,
      code: 403,
      message: 'API Key sudah habis.'
    };
  }

  return {
    ok: true,
    row,
    remaining
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = String(url.searchParams.get('key') || '')
    .trim()
    .toUpperCase();

  const v = await getKeyRow(env.JAVIN_DB, key);

  if (!v.ok) {
    return json({
      ok: false,
      message: v.message
    }, v.code);
  }

  const row = v.row;

  return json({
    ok: true,
    has_key: true,
    key: row.key,
    label: row.label,
    max_uses: row.max_uses,
    used_count: row.used_count,
    remaining: v.remaining,
    status: row.status
  });
}

export async function onRequestPost({ request, env }) {
  const db = env.JAVIN_DB;

  if (!db) {
    return json({
      ok: false,
      message: 'DB belum di-bind.'
    }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({
      ok: false,
      message: 'Body invalid.'
    }, 400);
  }

  const key = String(body.key || '')
    .trim()
    .toUpperCase();

  if (!/^JV-\d{4}$/.test(key)) {
    return json({
      ok: false,
      message: 'Format API Key tidak valid (contoh: JV-1918).'
    }, 400);
  }

  try {
    const v = await getKeyRow(db, key);

    if (!v.ok) {
      return json({
        ok: false,
        message: v.message
      }, v.code);
    }

    const row = v.row;

    return json({
      ok: true,
      key: row.key,
      label: row.label,
      max_uses: row.max_uses,
      used_count: row.used_count,
      remaining: v.remaining,
      status: row.status,
      message: 'API Key berhasil diverifikasi.'
    });
  } catch (e) {
    return json({
      ok: false,
      message: 'DB error: ' + e.message
    }, 500);
  }
}
