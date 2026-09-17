const ALLOWED_HOSTS = new Set([
  "api.nexadev.my.id",
  "apii.nexadev.my.id",
  "api.nexaadev.my.id",
  "clooud.my.id"
]);

const MAX_BODY = 6 * 1024 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

const buckets =
  globalThis.__JAVIN_BUCKETS ||
  (globalThis.__JAVIN_BUCKETS = new Map());

function clientKey(request) {
  const forwarded =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";

  return forwarded.split(",")[0].trim().slice(0, 100);
}

function limited(key) {
  const now = Date.now();
  const b = buckets.get(key) || { start: now, count: 0 };

  if (now - b.start >= WINDOW_MS) {
    b.start = now;
    b.count = 0;
  }

  b.count++;
  buckets.set(key, b);

  return b.count > MAX_REQUESTS_PER_WINDOW;
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function securityHeaders(headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  );
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method !== "GET") {
    return json(405, {
      ok: false,
      message: "Method not allowed"
    });
  }

  if (limited(clientKey(request))) {
    return json(429, {
      ok: false,
      message: "Terlalu banyak request. Coba lagi sebentar."
    });
  }

  const requestUrl = new URL(request.url);
  const id = String(requestUrl.searchParams.get("id") || "");

  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) {
    return json(400, {
      ok: false,
      message: "Endpoint tidak valid."
    });
  }

  let catalog;

  try {
    const catalogResponse = await fetch(
      new URL("/endpoints.json", request.url)
    );

    if (!catalogResponse.ok) {
      return json(500, {
        ok: false,
        message: "Katalog endpoint tidak dapat dibaca."
      });
    }

    catalog = await catalogResponse.json();
  } catch {
    return json(500, {
      ok: false,
      message: "Katalog endpoint tidak dapat dibaca."
    });
  }

  const ep = catalog.find(x => x.catalogId === id);

  if (!ep) {
    return json(404, {
      ok: false,
      message: "Endpoint tidak ditemukan."
    });
  }

  try {
    const exampleUrl = new URL(String(ep.ex || ""));

    if (!ALLOWED_HOSTS.has(exampleUrl.hostname)) {
      return json(403, {
        ok: false,
        message: "Upstream diblokir."
      });
    }

    const target = new URL(
      ep.path || exampleUrl.pathname || "/",
      exampleUrl.origin
    );

    for (const p of ep.params || []) {
      const name = String(p.n || "");

      if (!name || name === "key") continue;

      const value = requestUrl.searchParams.get(name);

      if (value === null || value === "") {
        if (p.r) {
          return json(400, {
            ok: false,
            message: `Parameter ${name} wajib diisi.`
          });
        }

        continue;
      }

      if (value.length > 2000) {
        return json(413, {
          ok: false,
          message: `Parameter ${name} terlalu panjang.`
        });
      }

      target.searchParams.set(name, value);
    }

    const upstream = await fetch(target.toString(), {
      method: "GET",
      redirect: "error",
      headers: {
        "User-Agent": "Javin-Project-Hole/1.0",
        "Accept": "*/*"
      },
      signal: AbortSignal.timeout(12000)
    });

    const buffer = await upstream.arrayBuffer();

    if (buffer.byteLength > MAX_BODY) {
      return json(502, {
        ok: false,
        message: "Response upstream terlalu besar."
      });
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") ||
        "application/octet-stream"
    );

    headers.set("Cache-Control", "no-store");
    securityHeaders(headers);

    return new Response(buffer, {
      status: upstream.status,
      headers
    });
  } catch {
    return json(502, {
      ok: false,
      message: "Upstream tidak dapat diakses."
    });
  }
}
