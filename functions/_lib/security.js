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
