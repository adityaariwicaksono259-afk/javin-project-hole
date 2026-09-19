export async function onRequest({ env }) {
  var u = env.ADMIN_USERNAME || '';
  return new Response(JSON.stringify({
    ok: true,
    has_username: u.length > 0,
    length: u.length,
    first_char_code: u.length > 0 ? u.charCodeAt(0) : 0,
    charcodes: u.split('').map(function(c){ return c.charCodeAt(0); })
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
