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

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return json({
      ok: false,
      message: "Admin authentication belum dikonfigurasi."
    }, 503);
  }

  if (!env.ADMIN_SESSION_SECRET) {
    return json({
      ok: false,
      message: "ADMIN_SESSION_SECRET belum dikonfigurasi."
    }, 503);
  }

  try {
    const body = await request.json();

    const username = String(body.username || "");
    const password = String(body.password || "");

    if (
      username !== env.ADMIN_USERNAME ||
      password !== env.ADMIN_PASSWORD
    ) {
      return json({
        ok: false,
        message: "Username atau password salah."
      }, 401);
    }

    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
    const payload = `${username}.${expires}`;
    const signature = await hmac(
      env.ADMIN_SESSION_SECRET,
      payload
    );

    const token = `${payload}.${signature}`;

    return json(
      {
        ok: true,
        message: "Login berhasil."
      },
      200,
      {
        "Set-Cookie":
          `javin_admin=${token}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict`
      }
    );
  } catch {
    return json({
      ok: false,
      message: "Request tidak valid."
    }, 400);
  }
}
