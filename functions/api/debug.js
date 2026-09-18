export async function onRequest({ env }) {
  const result = {
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      has_DB: !!env.JAVIN_DB,
      has_ADMIN_USERNAME: !!env.ADMIN_USERNAME,
      has_ADMIN_SESSION_SECRET: !!env.ADMIN_SESSION_SECRET
    }
  };

  if (env.JAVIN_DB) {
    try {
      const r = await env.JAVIN_DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
      result.db_tables = (r.results || []).map(x => x.name);
    } catch (e) {
      result.db_tables_error = e.message;
    }

    try {
      const c = await env.JAVIN_DB.prepare("SELECT COUNT(*) as c FROM premium_keys").first();
      result.premium_keys_count = c.c;
    } catch (e) {
      result.premium_keys_error = e.message;
    }
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
