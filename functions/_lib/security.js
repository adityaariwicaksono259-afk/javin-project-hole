// Helper keamanan: error response yang aman (nggak bocorin detail DB)

// Log detail ke console (ke Render/CF logs), return generic ke user
export function safeError(e, context) {
  const msg = (e && e.message) ? e.message : 'unknown';
  console.error('[SECURITY ERROR]', context || '', msg);

  // Kalau DEVELOPMENT, bocorin detail
  // Kalau PRODUCTION, generic aja
  return {
    ok: false,
    message: 'Terjadi kesalahan internal. Coba lagi nanti.'
  };
}

// Response JSON standar
export function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

// Origin check untuk endpoint admin (CSRF protection)
export function checkOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';
  const host = request.headers.get('Host') || '';

  // Kalau nggak ada Origin/Referer → kemungkinan bukan dari browser → tolak
  if (!origin && !referer) return false;

  // Allowed origin
  const allowedHosts = [
    'jvin.pages.dev',
    'localhost',
    '127.0.0.1'
  ];

  const checkHost = (url) => {
    try {
      const u = new URL(url);
      return allowedHosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
    } catch (e) {
      return false;
    }
  };

  if (origin && checkHost(origin)) return true;
  if (referer && checkHost(referer)) return true;

  return false;
}


// ============ CSRF GUARD ============
// Cek Origin/Referer untuk request yang modify state (POST/PUT/DELETE)
// Return null kalau OK, atau Response 403 kalau gagal
export function csrfGuard(request, env) {
  const method = (request.method || 'GET').toUpperCase();

  // Cuma cek method yang modify state
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip CSRF check untuk:
  // 1. Bot Telegram (server-to-server, no Origin)
  // 2. Webhook dari luar (Stripe, dll) - mereka punya signature sendiri
  // 3. Honeypot & public endpoints
  const skipPaths = ['/api/bot/', '/api/shop/webhook', '/api/verify-turnstile', '/.well-known/'];
  if (skipPaths.some(p => pathname.startsWith(p))) {
    return null;
  }

  const origin = request.headers.get('Origin') || '';
  const referer = request.headers.get('Referer') || '';

  // Kalau nggak ada Origin/Referer SAMA SEKALI:
  // - Curl, Postman, bot scraper → suspicious
  // - Test lokal → exception
  if (!origin && !referer) {
    // Cek Sec-Fetch-Site header (modern browser selalu kirim ini)
    const secFetch = request.headers.get('Sec-Fetch-Site') || '';
    if (secFetch === 'same-origin' || secFetch === 'same-site') {
      return null; // OK
    }
    // Nggak ada header sama sekali → tolak (kemungkinan curl/bot)
    return new Response(JSON.stringify({
      ok: false,
      message: 'Request tidak valid (no origin).'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  // Allowed hosts
  const allowedHosts = [
    'jvin.pages.dev',
    'localhost',
    '127.0.0.1'
  ];

  const checkUrl = (u) => {
    try {
      const parsed = new URL(u);
      return allowedHosts.some(h =>
        parsed.hostname === h || parsed.hostname.endsWith('.' + h)
      );
    } catch (e) {
      return false;
    }
  };

  // Cek origin ATAU referer (browser ada yang cuma kirim salah satu)
  const originOk = origin ? checkUrl(origin) : false;
  const refererOk = referer ? checkUrl(referer) : false;

  if (!originOk && !refererOk) {
    console.warn('[CSRF] Block origin:', origin, 'referer:', referer, 'path:', pathname);
    return new Response(JSON.stringify({
      ok: false,
      message: 'Origin tidak diizinkan.'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  return null;
}
