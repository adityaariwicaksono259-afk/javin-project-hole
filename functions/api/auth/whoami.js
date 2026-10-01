export async function onRequestGet({ request, env }) {
  const cookie = request.headers.get('Cookie') || '';
  const db = env.JAVIN_DB;

  // Extract token
  const demoMatch = cookie.match(/(?:^|;\s*)javin_demo=([^;]+)/);
  const sessMatch = cookie.match(/(?:^|;\s*)javin_session=([^;]+)/);

  let demoResult = null;
  let sessionResult = null;

  if (demoMatch && db) {
    const token = decodeURIComponent(demoMatch[1]);
    try {
      const sess = await db.prepare(
        'SELECT user_id, expires_at FROM auth_sessions WHERE token = ?'
      ).bind(token).first();
      demoResult = {
        token_len: token.length,
        token_first_16: token.slice(0, 16),
        session_found: !!sess,
        user_id: sess ? sess.user_id : null,
        expired: sess ? (sess.expires_at < Date.now()) : null
      };
    } catch(e) {
      demoResult = { error: e.message };
    }
  }

  if (sessMatch && db) {
    const token = decodeURIComponent(sessMatch[1]);
    try {
      const sess = await db.prepare(
        'SELECT user_id, expires_at FROM auth_sessions WHERE token = ?'
      ).bind(token).first();
      sessionResult = {
        token_len: token.length,
        token_first_16: token.slice(0, 16),
        session_found: !!sess,
        user_id: sess ? sess.user_id : null
      };
    } catch(e) {
      sessionResult = { error: e.message };
    }
  }

  return new Response(JSON.stringify({
    has_cookie_header: cookie.length > 0,
    demo: demoResult,
    session: sessionResult
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
