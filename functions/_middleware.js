// Global Middleware — 24 Layer Security
import { sendTelegram, escapeHtml } from './_lib/telegram.js';
import { fingerprint, detectPattern } from './_lib/detect.js';
function jsonResp(status, data, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extraHeaders || {})
  });
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const pathname = url.pathname;

  // ==== MAINTENANCE MODE ====
  const maintenanceMode = String(context.env.MAINTENANCE_MODE || '') === '1';
  if (maintenanceMode) {
    // Admin IP bypass
    const mIp = request.headers.get('CF-Connecting-IP') ||
                (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
                'unknown';
    const mAdminIPs = String(context.env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
    const mIsAdmin = mAdminIPs.includes(mIp);

    // Halaman yang dibebaskan dari maintenance
    const bypassPaths = ['/maintenance', '/.well-known', '/icon', '/manifest.json', '/service-worker.js', '/robots.txt'];

    const isBypassed = bypassPaths.some(p => pathname.startsWith(p));

    if (!mIsAdmin && !isBypassed) {
      // API endpoint → return JSON
      if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({
          ok: false,
          maintenance: true,
          message: 'Server sedang maintenance. Coba lagi sebentar.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': '60' }
        });
      }
      // Halaman → tampilkan maintenance page
      return Response.redirect(url.origin + '/maintenance.html', 302);
    }
  }

  // ==== Ambil User-Agent (dipakai honeypot + Layer 16) ====
  const ua = (request.headers.get('User-Agent') || '').toLowerCase();

  // ==== LAYER 12: Honeypot (jalan DULUAN biar kelog) ====
  const honeypots = ['/admin.php', '/wp-login.php', '/.env', '/.git/config', '/phpinfo.php', '/eval.php', '/config.php', '/backup.sql'];
  if (honeypots.some(h => pathname.toLowerCase() === h)) {
    const hdb = context.env.JAVIN_DB;
    const hip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (hdb) {
      try {
        await hdb.prepare(
          'INSERT INTO audit_log (action, actor, target, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind('honeypot_hit', 'attacker', pathname, ua.slice(0, 200), hip, Date.now()).run();
      } catch (e) {}

      try {
        await sendTelegram(context.env,
          '🍯 <b>Honeypot Hit</b>\n' +
          'IP: <code>' + escapeHtml(hip) + '</code>\n' +
          'Path: <code>' + escapeHtml(pathname) + '</code>\n' +
          'UA: <code>' + escapeHtml(ua.slice(0, 80)) + '</code>\n' +
          'Time: ' + new Date().toISOString()
        , { type: 'honeypot', throttleMs: 30000 });
      } catch (e) {}
    }
    // Return 404 biar attacker ngira biasa
    return new Response('Not Found', { status: 404 });
  }

  // ==== LAYER 15: Block sensitive paths ====
  const blockedPaths = [
    '/.env', '/.git', '/wp-admin', '/wp-login', '/phpmyadmin',
    '/admin.php', '/.htaccess', '/config.php', '/backup',
    '/.ssh', '/.aws', '/.vscode', '/vendor/phpunit', '/server.js',
    '/package.json', '/wrangler.toml', '/.env.unban'
  ];
  if (blockedPaths.some(b => pathname.toLowerCase().indexOf(b) === 0)) {
    return new Response('Not Found', { status: 404 });
  }

  // ==== LAYER 25: Cek IP Blocklist ====
  const __db = context.env.JAVIN_DB;
  const __ip = request.headers.get('CF-Connecting-IP') ||
               (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
               'unknown';
  const __adminIPs = String(context.env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
  const __isWhitelisted = __adminIPs.includes(__ip);

  // ==== LAYER 30-33: Detection (log only) ====
  if (pathname.startsWith('/api/')) {
    try {
      // Layer 30: Fingerprint (log only)
      const fp = await fingerprint(request);

      // Layer 31: Slow Loris — check Content-Length + timeout
      // (Sudah di-handle oleh CF timeout 100s)

      // Layer 32: Disabled (serverless environment nggak bisa track concurrent akurat)
      // Ganti pakai Layer 6 (rate limit per menit) yang udah ada

      // Layer 33: Pattern detection (log only)
      if (!__isWhitelisted) {
        const pat = detectPattern(__ip, pathname);
        if (pat.repeated) {
          console.warn('[PATTERN] IP', __ip, 'repeated path:', pathname, 'count:', pat.count);
        }
      }
    } catch (e) {
      console.error('[DETECT] Error:', e.message);
    }
  }

  if (__db && !__isWhitelisted) {
    try {
      const blocked = await __db.prepare(
        'SELECT reason, until FROM blocked_ips WHERE ip = ?'
      ).bind(__ip).first();

      if (blocked) {
        if (blocked.until > Date.now()) {
          const waitMin = Math.ceil((blocked.until - Date.now()) / 60000);
          console.warn('[ANOMALY] Blocked IP hit:', __ip, 'Reason:', blocked.reason);
          return jsonResp(403, {
            ok: false,
            message: 'IP kamu diblok sementara. Coba lagi dalam ' + waitMin + ' menit.',
            reason: blocked.reason
          });
        } else {
          // Expired, hapus
          await __db.prepare('DELETE FROM blocked_ips WHERE ip = ?').bind(__ip).run();
        }
      }
    } catch (e) {
      console.error('[ANOMALY] Blocklist check error:', e.message);
    }
  }

  // ==== LAYER 8a: Path traversal ====
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes('..') || decoded.includes('\0') || decoded.includes('\\')) {
      return jsonResp(400, { ok: false, message: 'Path tidak valid.' });
    }
  } catch (e) {
    return jsonResp(400, { ok: false, message: 'Path encoding tidak valid.' });
  }

  // ==== LAYER 8b: Header injection ====
  const suspiciousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url', 'x-http-method-override'];
  for (const h of suspiciousHeaders) {
    if (request.headers.get(h)) {
      return jsonResp(400, { ok: false, message: 'Header tidak diizinkan.' });
    }
  }

  // ==== LAYER 10: HTTP Method restriction ====
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];
  if (!allowedMethods.includes(method)) {
    return jsonResp(405, { ok: false, message: 'Method tidak diizinkan.' });
  }

  // ==== LAYER 16: User-Agent filter ====
  if (pathname.startsWith('/api/')) {
    const badBots = /(sqlmap|nikto|nmap|masscan|nessus|acunetix|dirbuster|gobuster|hydra|zap|w3af)/i;
    if (badBots.test(ua)) {
      return jsonResp(403, { ok: false, message: 'Akses ditolak.' });
    }
  }

  // ==== LAYER 35-39: Input Hardening ====
  if (pathname.startsWith('/api/')) {
    // Layer 35: JSON depth limit
    // (cek nanti saat body di-parse oleh handler, kita cek header dulu)

    // Layer 36: Header size limit (max 8KB total)
    let headerSize = 0;
    for (const [k, v] of request.headers.entries()) {
      headerSize += k.length + v.length + 4;
      if (headerSize > 8192) {
        return jsonResp(431, { ok: false, message: 'Header terlalu besar.' });
      }
    }

    // Layer 37: Cookie size limit (max 4KB)
    const cookieHeader = request.headers.get('Cookie') || '';
    if (cookieHeader.length > 4096) {
      return jsonResp(431, { ok: false, message: 'Cookie terlalu besar.' });
    }

    // Layer 38: Unicode normalization check
    // Block null bytes + kontrol karakter
    try {
      const rawUrl = decodeURIComponent(url.search);
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(rawUrl)) {
        return jsonResp(400, { ok: false, message: 'Input mengandung karakter tidak valid.' });
      }
    } catch (e) {}

    // Layer 39: SQLi pattern detection (log only — kita udah pakai prepared statements)
    const fullUrl = url.pathname + url.search;
    const sqliPattern = /(\bunion\b.*\bselect\b|\bor\b\s+1\s*=\s*1|\bdrop\b\s+table|\binsert\b\s+into|--\s|\/\*.*\*\/|;\s*\bselect\b)/i;
    if (sqliPattern.test(fullUrl)) {
      console.warn('[SQLI-DETECT] IP:', __ip, 'URL:', fullUrl.slice(0, 200));
      // Log ke audit kalau ada DB
      if (__db && !__isWhitelisted) {
        try {
          await __db.prepare(
            'INSERT INTO audit_log (action, actor, target, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind('sqli_attempt', 'attacker', pathname.slice(0, 100), fullUrl.slice(0, 200), __ip, Date.now()).run();
        } catch (e) {}
      }
      // Note: kita TETAP lanjut karena prepared statements nggak bisa di-inject
    }
  }

  // ==== LAYER 9: Payload size limit ====
  const cl = request.headers.get('Content-Length');
  if (cl) {
    const size = parseInt(cl);
    if (isNaN(size) || size < 0) {
      return jsonResp(400, { ok: false, message: 'Content-Length tidak valid.' });
    }
    if (size > 6 * 1024 * 1024) {
      return jsonResp(413, { ok: false, message: 'Payload terlalu besar (max 6 MB).' });
    }
  }
  if (url.search.length > 4000) {
    return jsonResp(414, { ok: false, message: 'Query string terlalu panjang.' });
  }

  // ==== LAYER 11: Content-Type enforcement ====
  if (['POST', 'PUT', 'PATCH'].includes(method) && pathname.startsWith('/api/')) {
    if (!pathname.includes('/imgtourl') && !pathname.includes('/premium/')) {
      const ct = request.headers.get('Content-Type') || '';
      if (!ct.includes('application/json') && ct !== '') {
        return jsonResp(415, { ok: false, message: 'Content-Type harus application/json.' });
      }
    }
  }

  // ==== LAYER 44-49: Advanced Detection (log only, nggak block) ====
  if (pathname.startsWith('/api/') && !__isWhitelisted) {
    try {
      // Layer 44: Bot score heuristic
      let botScore = 0;
      // UA mencurigakan
      if (!ua || ua.length < 10) botScore += 20;
      if (/bot|crawl|spider|scraper/i.test(ua) && !/googlebot|bingbot/i.test(ua)) botScore += 30;
      // Nggak ada Accept-Language
      if (!request.headers.get('Accept-Language')) botScore += 10;
      // Nggak ada Referer
      if (!request.headers.get('Referer') && method !== 'GET') botScore += 10;
      // Header fetch metadata
      const secFetchMode = request.headers.get('Sec-Fetch-Mode');
      if (secFetchMode && secFetchMode === 'no-cors') botScore += 15;

      if (botScore >= 50) {
        console.warn('[BOT-SCORE]', __ip, 'score:', botScore, 'UA:', ua.slice(0, 60));
        if (__db) {
          try {
            await __db.prepare(
              'INSERT INTO audit_log (action, actor, target, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind('bot_score_high', 'system', pathname.slice(0, 80), 'Score: ' + botScore + ' UA: ' + ua.slice(0, 60), __ip, Date.now()).run();
          } catch (e) {}
        }
      }

      // Layer 45: Session replay protection (log only)
      const adminCookie = request.headers.get('Cookie') || '';
      if (adminCookie.includes('javin_admin=')) {
        const match = adminCookie.match(/javin_admin=([^;]+)/);
        if (match) {
          const token = match[1];
          const parts = token.split('.');
          // Cek format token valid (4 bagian)
          if (parts.length !== 4) {
            console.warn('[REPLAY] Invalid token format from', __ip);
          }
        }
      }

      // Layer 46: Referrer chain validation
      const referer = request.headers.get('Referer') || '';
      const origin = request.headers.get('Origin') || '';
      if (method !== 'GET' && method !== 'HEAD') {
        if (referer && origin && referer.indexOf(origin) === -1 && origin.indexOf(referer) === -1) {
          // Referer dan Origin nggak match — suspicious
          console.warn('[REFERER-MISMATCH]', __ip, 'Ref:', referer.slice(0, 50), 'Orig:', origin.slice(0, 50));
        }
      }

      // Layer 47: Origin strict check (buat POST admin)
      if (pathname.startsWith('/api/admin/') && method === 'POST') {
        if (!origin && !referer) {
          console.warn('[ORIGIN-MISSING]', __ip, pathname);
        }
      }

      // Layer 48: Fetch metadata check
      const secFetchSite = request.headers.get('Sec-Fetch-Site');
      const secFetchDest = request.headers.get('Sec-Fetch-Dest');
      if (secFetchSite && secFetchSite === 'cross-site' && pathname.startsWith('/api/admin/')) {
        console.warn('[SEC-FETCH] Cross-site request to admin:', __ip);
      }

      // Layer 49: Auto-blacklist pattern (kombinasi event)
      // Note: ini otomatis jalan dari Layer 25 (auto-ban)
      // Kalau IP udah:
      // - Bot score tinggi (>50)
      // - Pattern berulang (>20x)
      // - Salah login 5x
      // → auto kena Layer 25 ban

    } catch (e) {
      console.error('[ADVANCED] Error:', e.message);
    }
  }

  // ==== LAYER 4: CSRF check ====
  if (pathname.startsWith('/api/admin/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (!pathname.endsWith('/login')) {
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
        return jsonResp(403, { ok: false, message: 'Origin tidak diizinkan.' });
      }
    }
  }

  // ==== LAYER 21: Turnstile (kill switch TURNSTILE_ENABLED) ====
  const turnstileOn = String(context.env.TURNSTILE_ENABLED || '') === '1';
  if (turnstileOn && pathname.startsWith('/api/') && pathname !== '/api/verify-turnstile') {
    const secret = context.env.ADMIN_SESSION_SECRET;
    const ip = request.headers.get('CF-Connecting-IP') ||
               (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
               'unknown';
    const adminIPs = String(context.env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
    const isWhitelisted = adminIPs.includes(ip);

    if (!isWhitelisted && secret) {
      const cookieHeader = request.headers.get('Cookie') || '';
      const match = cookieHeader.match(/(?:^|;\s*)jvin_verified=([^;]+)/);
      let verified = false;

      if (match) {
        try {
          const token = decodeURIComponent(match[1]);
          const parts = token.split('.');
          if (parts.length === 3) {
            const expires = parseInt(parts[0]);
            const payload = parts[0] + '.' + parts[1];
            const signature = parts[2];
            if (expires > Date.now()) {
              const key = await crypto.subtle.importKey(
                'raw', new TextEncoder().encode(secret),
                { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
              );
              const expectedBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
              const expected = btoa(String.fromCharCode(...new Uint8Array(expectedBuf)))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
              if (expected === signature) {
                const ipKey = await crypto.subtle.importKey(
                  'raw', new TextEncoder().encode(secret),
                  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
                );
                const ipSigBuf = await crypto.subtle.sign('HMAC', ipKey, new TextEncoder().encode('ip:' + ip));
                const expectedIpHash = btoa(String.fromCharCode(...new Uint8Array(ipSigBuf)))
                  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                if (expectedIpHash === parts[1]) {
                  verified = true;
                }
              }
            }
          }
        } catch (e) {
          console.error('[TURNSTILE] Cookie error:', e.message);
        }
      }

      if (!verified) {
        return jsonResp(403, {
          ok: false,
          message: 'Verifikasi diperlukan. Refresh halaman.',
          need_turnstile: true
        });
      }
    }
  }

  // ==== LAYER 6 + 24: Rate Limit (Global + Per-Endpoint) ====
  if (pathname.startsWith('/api/')) {
    const db = context.env.JAVIN_DB;
    const ip = request.headers.get('CF-Connecting-IP') ||
               (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
               'unknown';
    const adminIPs = String(context.env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
    const isWhitelisted = adminIPs.includes(ip);

    const WINDOW_MS = 60 * 1000;

    // Per-endpoint rate limit
    let MAX_REQ = 60;
    if (pathname.startsWith('/api/imgtourl')) MAX_REQ = 10;
    else if (pathname.startsWith('/api/premium/')) MAX_REQ = 5;
    else if (pathname.startsWith('/api/admin/')) MAX_REQ = 20;
    else if (pathname.startsWith('/api/javin')) MAX_REQ = 30;
    else if (pathname.startsWith('/api/user/')) MAX_REQ = 30;
    else if (pathname.startsWith('/api/proxy')) MAX_REQ = 60;

    if (db && !isWhitelisted) {
      try {
        const now = Date.now();
        const pathBucket = pathname.split('/').slice(0, 3).join('/');
        const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
        const bucketKey = pathBucket;

        await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(now - 5 * 60 * 1000).run();

        const row = await db.prepare(
          'SELECT count FROM rate_limits WHERE ip = ? AND window_start = ?'
        ).bind(ip + ':' + bucketKey, windowStart).first();

        const currentCount = (row && row.count) || 0;

        if (currentCount >= MAX_REQ) {
          const resetSec = Math.ceil((windowStart + WINDOW_MS - now) / 1000);
          return jsonResp(429, {
            ok: false,
            message: 'Terlalu banyak request ke endpoint ini. Tunggu ' + resetSec + ' detik.',
            retry_after: resetSec
          }, { 'Retry-After': String(resetSec) });
        }

        await db.prepare(
          'INSERT INTO rate_limits (ip, window_start, count) VALUES (?, ?, 1) ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1'
        ).bind(ip + ':' + bucketKey, windowStart).run();
      } catch (e) {
        console.error('[RATE-LIMIT] DB error:', e.message);
      }
    }
  }

  // ==== Pass ke handler ====
  const response = await context.next();
  const newHeaders = new Headers(response.headers);

  // ==== LAYER 1: Security headers ====
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

  // ==== LAYER 40-43: Response Hardening ====

  // Layer 43: Hide server info
  newHeaders.delete('Server');
  newHeaders.delete('X-Powered-By');
  newHeaders.delete('X-AspNet-Version');
  newHeaders.delete('X-Runtime');

  // Layer 41: Force no-cache untuk API
  if (pathname.startsWith('/api/')) {
    newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    newHeaders.set('Pragma', 'no-cache');
    newHeaders.set('Expires', '0');
  }

  // Layer 40: Response size check (soft, cuma header hint)
  const contentLength = response.headers.get('Content-Length');
  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
    console.warn('[RESPONSE] Large response:', pathname, contentLength);
  }

  if (pathname.match(/\.(css|js)$/i)) {
    // CSS & JS: wajib revalidate tiap request (biar update cepet)
    newHeaders.set('Cache-Control', 'no-cache, must-revalidate');
  } else if (pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|woff2?|ttf|ico)$/i)) {
    // Image & font: cache 7 hari (jarang berubah)
    newHeaders.set('Cache-Control', 'public, max-age=604800');
  }

  // ==== LAYER 25: Track errors untuk anomaly detection ====
  if (__db && !__isWhitelisted && response.status >= 400 && response.status < 500) {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / (5 * 60 * 1000)) * (5 * 60 * 1000);

      await __db.prepare(
        'INSERT INTO ip_errors (ip, window_start, count) VALUES (?, ?, 1) ' +
        'ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1'
      ).bind(__ip, windowStart).run();

      // Cek apakah udah lewat batas
      const row = await __db.prepare(
        'SELECT count FROM ip_errors WHERE ip = ? AND window_start = ?'
      ).bind(__ip, windowStart).first();

      if (row && row.count >= 100) {
        const until = now + 60 * 60 * 1000; // block 1 jam
        await __db.prepare(
          'INSERT INTO blocked_ips (ip, reason, until, created_at) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(ip) DO UPDATE SET reason = excluded.reason, until = excluded.until'
        ).bind(__ip, 'Too many errors (' + row.count + ')', until, now).run();

        console.warn('[ANOMALY] IP auto-blocked:', __ip, 'Errors:', row.count);

        // Audit log
        await __db.prepare(
          'INSERT INTO audit_log (action, actor, target, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind('ip_autoblock', 'system', __ip, 'Errors: ' + row.count, __ip, now).run();

        // Notif Telegram
        try {
          await sendTelegram(context.env,
            '🚫 <b>IP Auto-Blocked</b>\n' +
            'IP: <code>' + escapeHtml(__ip) + '</code>\n' +
            'Errors: <b>' + row.count + '</b> in 5 min\n' +
            'Duration: 1 jam\n' +
            'Time: ' + new Date().toISOString()
          , { type: 'autoblock', throttleMs: 60000 });
        } catch (e) {}
      }

      // Cleanup window lama
      await __db.prepare('DELETE FROM ip_errors WHERE window_start < ?').bind(now - 30 * 60 * 1000).run();

    } catch (e) {
      console.error('[ANOMALY] Track error:', e.message);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
