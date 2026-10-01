// GET /api/auth/debug-cookie — buat cek cookie yang diterima server
export async function onRequestGet({ request }) {
  const cookie = request.headers.get('Cookie') || '';
  const cookies = {};
  cookie.split(';').forEach(function(c) {
    const parts = c.trim().split('=');
    if (parts[0]) cookies[parts[0]] = parts[1] ? parts[1].slice(0, 12) + '...' : '';
  });
  return new Response(JSON.stringify({
    ok: true,
    raw: cookie ? '(ada ' + cookie.split(';').length + ' cookie)' : '(kosong)',
    cookies: cookies
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
