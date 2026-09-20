export async function onRequest({ request }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/javin_admin=([^;]+)/);
  return new Response(JSON.stringify({
    ok: true,
    has_cookie_header: !!cookieHeader,
    cookie_length: cookieHeader.length,
    has_javin_admin: !!match,
    token_parts_count: match ? match[1].split('.').length : 0,
    token_first20: match ? match[1].slice(0, 20) : null,
    all_cookies: cookieHeader.slice(0, 200)
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
