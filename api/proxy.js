const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CATALOG = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "endpoints.json"), "utf8"));
const ALLOWED_HOSTS = new Set(["api.nexadev.my.id", "apii.nexadev.my.id", "api.nexaadev.my.id", "clooud.my.id"]);
const MAX_BODY = 6 * 1024 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

// Best-effort in-memory limiter for a single Vercel instance.
// For durable enforcement, use the admin/user API backed by a database/Redis.
const buckets = globalThis.__JAVIN_BUCKETS || (globalThis.__JAVIN_BUCKETS = new Map());

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return crypto.createHash("sha256").update(forwarded || "unknown").digest("hex").slice(0, 32);
}
function limited(key) {
  const now = Date.now();
  const b = buckets.get(key) || { start: now, count: 0 };
  if (now - b.start >= WINDOW_MS) { b.start = now; b.count = 0; }
  b.count++;
  buckets.set(key, b);
  return b.count > MAX_REQUESTS_PER_WINDOW;
}
function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");

  if (req.method !== "GET") return json(res, 405, { ok:false, message:"Method not allowed" });
  if (limited(clientKey(req))) return json(res, 429, { ok:false, message:"Terlalu banyak request. Coba lagi sebentar." });

  const id = String(req.query.id || "");
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) return json(res, 400, { ok:false, message:"Endpoint tidak valid." });
  const ep = CATALOG.find(x => x.catalogId === id);
  if (!ep) return json(res, 404, { ok:false, message:"Endpoint tidak ditemukan." });

  try {
    const base = new URL(ep.m || "https://api.nexadev.my.id");
    if (!ALLOWED_HOSTS.has(base.hostname)) return json(res, 403, { ok:false, message:"Upstream diblokir." });
    const target = new URL(ep.path || "/", base);

    const params = req.query || {};
    for (const p of (ep.params || [])) {
      const name = String(p.n || "");
      if (!name || name === "key") continue;
      const value = params[name];
      if (value === undefined || value === "") {
        if (p.r) return json(res, 400, { ok:false, message:`Parameter ${name} wajib diisi.` });
        continue;
      }
      if (String(value).length > 2000) return json(res, 413, { ok:false, message:`Parameter ${name} terlalu panjang.` });
      target.searchParams.set(name, String(value));
    }

    const upstream = await fetch(target, {
      method: "GET",
      redirect: "error",
      headers: { "User-Agent": "Javin-Project-Hole/1.0", "Accept": "*/*" },
      signal: AbortSignal.timeout(12000)
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > MAX_BODY) return json(res, 502, { ok:false, message:"Response upstream terlalu besar." });

    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    res.status(upstream.status);
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(buf);
  } catch (e) {
    return json(res, 502, { ok:false, message:"Upstream tidak dapat diakses." });
  }
};
