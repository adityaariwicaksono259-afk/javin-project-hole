with open('functions/api/proxy.js', 'r') as f:
    code = f.read()

old = """async function getSessionUserId(db, request) {
  if (!db || !request) return null;
  try {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/(?:^|;\\s*)javin_session=([^;]+)/);
    if (!match) return null;
    const token = decodeURIComponent(match[1]);
    const sess = await db.prepare(
      'SELECT user_id FROM auth_sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Date.now()).first();
    return sess ? sess.user_id : null;
  } catch(e) {
    return null;
  }
}"""

new = """async function getSessionUserId(db, request) {
  if (!db || !request) return null;
  try {
    const cookie = request.headers.get('Cookie') || '';

    // 1. Cek javin_demo dulu (prioritas demo mode)
    let match = cookie.match(/(?:^|;\\s*)javin_demo=([^;]+)/);
    if (match) {
      const token = decodeURIComponent(match[1]);
      const sess = await db.prepare(
        'SELECT user_id FROM auth_sessions WHERE token = ? AND expires_at > ?'
      ).bind(token, Date.now()).first();
      if (sess) return sess.user_id;
    }

    // 2. Fallback ke javin_session (user Google/email)
    match = cookie.match(/(?:^|;\\s*)javin_session=([^;]+)/);
    if (match) {
      const token = decodeURIComponent(match[1]);
      const sess = await db.prepare(
        'SELECT user_id FROM auth_sessions WHERE token = ? AND expires_at > ?'
      ).bind(token, Date.now()).first();
      if (sess) return sess.user_id;
    }

    return null;
  } catch(e) {
    return null;
  }
}"""

if old not in code:
    print("ERROR: fungsi getSessionUserId tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)

with open('functions/api/proxy.js', 'w') as f:
    f.write(code)

print("OK: getSessionUserId baca javin_demo + javin_session")
