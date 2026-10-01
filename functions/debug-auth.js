// GET /debug-auth — debug middleware auth gate (bypass whitelist)
export async function onRequestGet({ request, env }) {
  const cookie = request.headers.get('Cookie') || '';
  const db = env.JAVIN_DB;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Simulasi logic auth gate
  const demoMatch = cookie.match(/(?:^|;\s*)javin_demo=([^;]+)/);
  const sessMatch = cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);

  let demoResult = { found: false };
  let sessResult = { found: false };

  if (demoMatch && db) {
    const token = decodeURIComponent(demoMatch[1]);
    const sess = await db.prepare(
      'SELECT token, user_id FROM auth_sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Date.now()).first();
    demoResult = {
      found: true,
      token_len: token.length,
      token_prefix: token.slice(0, 16),
      session_valid: !!sess,
      user_id: sess ? sess.user_id : null
    };
  }

  if (sessMatch && db) {
    const token = decodeURIComponent(sessMatch[1]);
    const sess = await db.prepare(
      'SELECT token, user_id FROM auth_sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Date.now()).first();
    sessResult = {
      found: true,
      token_len: token.length,
      token_prefix: token.slice(0, 16),
      session_valid: !!sess,
      user_id: sess ? sess.user_id : null
    };
  }

  // Simulasi auth gate
  const isStatic = ['js','css','png','jpg'].indexOf(pathname.split('.').pop().toLowerCase()) !== -1;
  const isApi = pathname.indexOf('/api/') === 0;
  const isWellKnown = pathname.indexOf('/.well-known/') === 0;
  const publicPages = ['/login', '/login.html', '/maintenance', '/maintenance.html', '/buy', '/buy.html', '/debug-auth'];
  const isPublic = publicPages.indexOf(pathname) !== -1;

  const authGatePassed = isStatic || isApi || isWellKnown || isPublic || demoResult.session_valid || sessResult.session_valid;

  return new Response(JSON.stringify({
    ok: true,
    pathname: pathname,
    method: method,
    user_agent: (request.headers.get('User-Agent') || '').slice(0, 80),
    referer: (request.headers.get('Referer') || '').slice(0, 80),
    cookie_count: cookie.split(';').length,
    demo_cookie: demoResult,
    session_cookie: sessResult,
    gate_check: {
      isStatic: isStatic,
      isApi: isApi,
      isWellKnown: isWellKnown,
      isPublicPage: isPublic,
      authGatePassed: authGatePassed
    }
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
