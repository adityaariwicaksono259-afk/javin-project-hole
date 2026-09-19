// Global middleware — security headers + CSRF check
export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // ==== LAYER 4: CSRF check untuk endpoint admin ====
  // Block method non-GET ke /api/admin/* kalau Origin/Referer bukan dari domain sendiri
  if (url.pathname.startsWith('/api/admin/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Endpoint login dibebaskan (karena user belum auth, butuh submit pertama)
    if (!url.pathname.endsWith('/login')) {
      const origin = request.headers.get('Origin') || '';
      const referer = request.headers.get('Referer') || '';
      const allowedHosts = ['jvin.pages.dev', 'localhost', '127.0.0.1'];

      const isAllowed = (u) => {
        try {
          const parsed = new URL(u);
          return allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
        } catch (e) { return false; }
      };

      const ok = (origin && isAllowed(origin)) || (referer && isAllowed(referer));
      if (!ok) {
        console.warn('[CSRF] Blocked:', method, url.pathname, 'Origin:', origin.slice(0,50));
        return new Response(JSON.stringify({ ok: false, message: 'Origin tidak diizinkan.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    }
  }

  // ==== LAYER 6: Rate Limit Global (60 req/menit per IP) ====
  // Hanya untuk endpoint /api/* (static files dibebaskan)
  if (url.pathname.startsWith('/api/')) {
    const db = context.env.JAVIN_DB;
    const ip = request.headers.get('CF-Connecting-IP') ||
               (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
               'unknown';
    const adminIPs = String(context.env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
    const isWhitelisted = adminIPs.includes(ip);

    const WINDOW_MS = 60 * 1000;
    const MAX_REQ = 60;

    if (db && !isWhitelisted) {
      try {
        const now = Date.now();
        const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;

        // Bersihin window lama (lebih dari 5 menit)
        await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(now - 5 * 60 * 1000).run();

        // Get current count
        const row = await db.prepare(
          'SELECT count FROM rate_limits WHERE ip = ? AND window_start = ?'
        ).bind(ip, windowStart).first();

        const currentCount = (row && row.count) || 0;

        if (currentCount >= MAX_REQ) {
          const resetSec = Math.ceil((windowStart + WINDOW_MS - now) / 1000);
          console.warn('[RATE-LIMIT] IP:', ip, 'count:', currentCount, 'path:', url.pathname);
          return new Response(JSON.stringify({
            ok: false,
            message: 'Terlalu banyak request. Tunggu ' + resetSec + ' detik lagi.',
            retry_after: resetSec
          }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Retry-After': String(resetSec)
            }
          });
        }

        // Increment
        await db.prepare(
          'INSERT INTO rate_limits (ip, window_start, count) VALUES (?, ?, 1) ' +
          'ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1'
        ).bind(ip, windowStart).run();
      } catch (e) {
        // Kalau DB error, jangan block request (fail-open)
        console.error('[RATE-LIMIT] DB error:', e.message);
      }
    }
  }

  // ==== LAYER 1: Security headers ====
  const response = await context.next();
  const newHeaders = new Headers(response.headers);

  newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-XSS-Protection', '1; mode=block');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  newHeaders.set('X-DNS-Prefetch-Control', 'off');
  newHeaders.set('X-Permitted-Cross-Domain-Policies', 'none');
  newHeaders.set('X-Download-Options', 'noopen');
  newHeaders.set('Cross-Origin-Resource-Policy', 'same-origin');
  newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://api.nexadev.my.id https://apii.nexadev.my.id https://api.siputzx.my.id https://api.qrserver.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  newHeaders.set('Content-Security-Policy', csp);

  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|webp|gif|svg|woff2?|ttf|ico)$/i)) {
    newHeaders.set('Cache-Control', 'public, max-age=86400');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
