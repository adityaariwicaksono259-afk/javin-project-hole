// POST /api/verify-turnstile — verify CF Turnstile token, set cookie

function jsonRes(status, data, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extraHeaders || {})
  });
}

async function hmacSign(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequestPost({ request, env }) {
  if (!env.TURNSTILE_SECRET) {
    return jsonRes(503, { ok: false, message: 'Turnstile belum dikonfigurasi.' });
  }

  const ip = request.headers.get('CF-Connecting-IP') ||
             (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
             'unknown';

  // Whitelist admin IP → auto-pass
  const adminIPs = String(env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (adminIPs.includes(ip)) {
    return setVerifiedCookie(env, ip, jsonRes);
  }

  let body;
  try { body = await request.json(); }
  catch (e) { return jsonRes(400, { ok: false, message: 'Body invalid.' }); }

  const token = String(body.token || '').trim();
  if (!token || token.length > 3000) {
    return jsonRes(400, { ok: false, message: 'Token Turnstile tidak valid.' });
  }

  // Verify ke Cloudflare API
  try {
    const formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET);
    formData.append('response', token);
    formData.append('remoteip', ip);

    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });

    const result = await r.json();

    if (!result.success) {
      console.warn('[TURNSTILE] Failed:', result['error-codes'], 'IP:', ip);
      return jsonRes(403, {
        ok: false,
        message: 'Verifikasi gagal. Coba refresh halaman.',
        errors: result['error-codes'] || []
      });
    }

    console.log('[TURNSTILE] Success for IP:', ip);
    return setVerifiedCookie(env, ip, jsonRes);

  } catch (e) {
    console.error('[TURNSTILE] Error:', e.message);
    return jsonRes(502, { ok: false, message: 'Gagal verifikasi. Coba lagi.' });
  }
}

async function setVerifiedCookie(env, ip, jsonRes) {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return jsonRes(503, { ok: false, message: 'Server belum siap.' });

  const expires = Date.now() + 30 * 60 * 1000; // 30 menit
  // Sign payload: timestamp + IP hash
  const ipHash = await hmacSign(secret, 'ip:' + ip);
  const payload = expires + '.' + ipHash;
  const signature = await hmacSign(secret, payload);
  const cookieValue = payload + '.' + signature;

  return jsonRes(200, { ok: true, expires: expires }, {
    'Set-Cookie': 'jvin_verified=' + cookieValue + '; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax'
  });
}

export async function onRequestGet() {
  return jsonRes(405, { ok: false, message: 'Gunakan POST.' });
}
