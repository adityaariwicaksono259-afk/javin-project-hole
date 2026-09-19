async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unauthorized(message = "Admin belum login.") {
  return new Response(
    JSON.stringify({ ok: false, message }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function verifyAdmin(request, env) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_SESSION_SECRET) {
    return { ok: false, response: new Response(
      JSON.stringify({
        ok: false,
        message: "Konfigurasi admin belum lengkap."
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    )};
  }

  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)javin_admin=([^;]+)/);

  if (!match) {
    return { ok: false, response: unauthorized() };
  }

  const token = decodeURIComponent(match[1]);
  const parts = token.split(".");

  if (parts.length !== 4) {
    return { ok: false, response: unauthorized() };
  }

  const username = parts[0];
  const expires = Number(parts[1]);
  const tokenIpHash = parts[2];
  const signature = parts[3];

  if (
    !username ||
    username !== env.ADMIN_USERNAME ||
    !Number.isFinite(expires) ||
    expires < Math.floor(Date.now() / 1000) ||
    !signature ||
    !tokenIpHash
  ) {
    return { ok: false, response: unauthorized("Session admin tidak valid atau sudah expired.") };
  }

  const payload = `${username}.${expires}.${tokenIpHash}`;
  const expected = await hmac(env.ADMIN_SESSION_SECRET, payload);

  if (signature !== expected) {
    return { ok: false, response: unauthorized("Session admin tidak valid.") };
  }

  // ==== Cek IP bind ====
  const ip = request.headers.get('CF-Connecting-IP') ||
             (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
             'unknown';
  const currentIpHash = await hmac(env.ADMIN_SESSION_SECRET, 'ip:' + ip);

  if (currentIpHash !== tokenIpHash) {
    console.warn('[AUTH] IP mismatch. Token IP:', tokenIpHash, 'Current IP:', ip);
    return { ok: false, response: unauthorized("Session tidak valid untuk IP ini. Login ulang.") };
  }

  return {
    ok: true,
    username
  };
}
