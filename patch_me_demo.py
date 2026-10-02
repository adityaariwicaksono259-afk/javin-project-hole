with open('functions/api/auth/me.js', 'r') as f:
    code = f.read()

old = """  var cookie = request.headers.get('Cookie') || '';
  var match = cookie.match(/(?:^|;\\s*)javin_session=([^;]+)/);
  if (!match) return json({ ok: false, logged_in: false });

  var token = decodeURIComponent(match[1]);
  var now = Date.now();

  var session = await db.prepare(
    'SELECT * FROM auth_sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();

  if (!session) return json({ ok: false, logged_in: false });"""

new = """  var cookie = request.headers.get('Cookie') || '';
  var now = Date.now();

  // Prioritas: cek javin_demo dulu (mode demo)
  var demoMatch = cookie.match(/(?:^|;\\s*)javin_demo=([^;]+)/);
  var match = demoMatch || cookie.match(/(?:^|;\\s*)javin_session=([^;]+)/);
  if (!match) return json({ ok: false, logged_in: false });

  var token = decodeURIComponent(match[1]);
  var isDemo = !!demoMatch;

  var session = await db.prepare(
    'SELECT * FROM auth_sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();

  if (!session) return json({ ok: false, logged_in: false });"""

if old not in code:
    print("ERROR: blok session tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)
print("OK: me.js cek javin_demo + javin_session")

# Update response biar flag demo
old2 = """  return json({
    ok: true,
    logged_in: true,
    user: {"""

new2 = """  return json({
    ok: true,
    logged_in: true,
    is_demo: isDemo,
    user: {"""

if old2 in code:
    code = code.replace(old2, new2, 1)
    print("OK: flag is_demo ditambahkan")

with open('functions/api/auth/me.js', 'w') as f:
    f.write(code)

print("SELESAI")
