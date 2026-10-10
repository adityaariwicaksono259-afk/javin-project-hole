// ============================================
// ENDPOINT FINDER v2 — deep + sharp scan
// ============================================
// Fitur:
// - Multi-source: homepage, JS bundle, sitemap, robots, inline scripts
// - Recursive JS scan (2 level)
// - Deep probe 30+ common paths
// - Framework detection (WP, Next, Nuxt, Laravel, Django, Rails, dll)
// - Smart dedup + verdict endpoint
// - Filter noise (tracking, analytics, CDN, ads)
// ============================================

import { browserHeaders } from './ua-pool.js';

// ============================================
// BLACKLIST — domain yang di-exclude
// ============================================
const EXCLUDE_DOMAINS = [
  // Analytics & tracking
  'google-analytics.com', 'googletagmanager.com', 'googlesyndication.com',
  'googleadservices.com', 'doubleclick.net', 'adservice.google.com',
  'hotjar.com', 'mixpanel.com', 'segment.com', 'amplitude.com',
  'heap.io', 'fullstory.com', 'logrocket.com', 'mouseflow.com',
  // Social
  'facebook.com', 'fbcdn.net', 'connect.facebook.net',
  'twitter.com', 'x.com', 'tiktok.com',
  'linkedin.com', 'pinterest.com', 'instagram.com', 'whatsapp.com',
  // Video/Image platform (kecuali yg jadi target)
  'youtube.com', 'ytimg.com', 'googlevideo.com', 'vimeo.com',
  // CDN/library
  'cloudflare.com', 'cloudflareinsights.com', 'cdnjs.com', 'jsdelivr.net',
  'unpkg.com', 'jquery.com', 'bootstrapcdn.com', 'fontawesome.com',
  'fonts.googleapis.com', 'fonts.gstatic.com', 'gstatic.com',
  'bundleunum.com', 'chalazataverns.com',
  // Tools
  'sentry.io', 'bugsnag.com', 'newrelic.com', 'datadog.com',
  'disqus.com', 'gravatar.com', 'w3.org', 'schema.org',
  // Payment
  'stripe.com', 'paypal.com', 'midtrans.com', 'xendit.co',
  // Misc
  'api.w.org', 'wordpress.org', 'wordpress.com', 'wp.com'
];

// ============================================
// FRAMEWORK SIGNATURES — deteksi
// ============================================
const FRAMEWORKS = [
  { name: 'WordPress', sig: /wp-content|wp-includes|wordpress/i, api: '/wp-json/wp/v2' },
  { name: 'Next.js', sig: /__NEXT_DATA__|_next\/static|__next/i, api: '/api/' },
  { name: 'Nuxt.js', sig: /__NUXT__|_nuxt\//i, api: '/api/' },
  { name: 'Gatsby', sig: /___gatsby|gatsby-/i, api: '/graphql' },
  { name: 'React SPA', sig: /react(?:-dom)?\.(?:production|development)/i, api: '' },
  { name: 'Vue SPA', sig: /vue\.(?:runtime|global)/i, api: '' },
  { name: 'Angular', sig: /angular(?:\.min)?\.js|ng-version/i, api: '' },
  { name: 'Laravel', sig: /laravel_session|XSRF-TOKEN/i, api: '/api/' },
  { name: 'Django', sig: /csrfmiddlewaretoken|django/i, api: '/api/' },
  { name: 'Rails', sig: /rails-ujs|authenticity_token/i, api: '/api/' },
  { name: 'Express', sig: /express-session|x-powered-by:\s*Express/i, api: '/api/' },
  { name: 'Drupal', sig: /drupal-settings-json|Drupal\.settings/i, api: '/jsonapi/' },
  { name: 'Joomla', sig: /joomla|com_content/i, api: '/api/index.php' },
  { name: 'Shopify', sig: /shopify|cdn\.shopify/i, api: '/admin/api/' },
  { name: 'Ghost', sig: /ghost\/|ghost-url/i, api: '/ghost/api/' },
  { name: 'Strapi', sig: /strapi/i, api: '/api/' }
];

// ============================================
// API PATH PATTERNS — endpoint yang menandakan API
// ============================================
const API_PATH_PATTERNS = [
  { re: /\/api(\/|$|\?)/i, score: 10, label: '/api' },
  { re: /\/wp-json(\/|$)/i, score: 10, label: 'WordPress REST' },
  { re: /\/wp\/v\d+/i, score: 10, label: 'WP API v2' },
  { re: /\/jsonapi/i, score: 10, label: 'Drupal JSON:API' },
  { re: /\/v\d+\/[\w-]+/i, score: 8, label: 'Versioned API' },
  { re: /\/graphql(\/|$|\?)/i, score: 10, label: 'GraphQL' },
  { re: /\/rpc(\/|$)/i, score: 7, label: 'RPC' },
  { re: /\/rest(\/|$)/i, score: 7, label: 'REST' },
  { re: /\/json(\/|$)/i, score: 6, label: 'JSON' },
  { re: /\/ajax(\/|$)/i, score: 7, label: 'AJAX' },
  { re: /\/xmlrpc/i, score: 6, label: 'XML-RPC' },
  { re: /\/feed(\/|$)/i, score: 4, label: 'Feed' },
  { re: /\/endpoint/i, score: 8, label: 'Endpoint' },
  { re: /\/backend(\/|$)/i, score: 6, label: 'Backend' },
  { re: /\/service(\/|$)/i, score: 6, label: 'Service' },
  { re: /\/search(\/|$|\?)/i, score: 5, label: 'Search' },
  { re: /\/query/i, score: 5, label: 'Query' },
  { re: /\/fetch/i, score: 5, label: 'Fetch' },
  { re: /\/get[\w-]+/i, score: 3, label: 'Getter' },
  { re: /\/data(\/|$)/i, score: 4, label: 'Data' }
];

// File extensions yang BUKAN endpoint (asset)
const ASSET_EXT = new Set(['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico',
  'woff', 'woff2', 'ttf', 'eot', 'otf', 'mp4', 'webm', 'mp3', 'wav', 'ogg',
  'pdf', 'zip', 'rar', '7z', 'tar', 'gz', 'map', 'webp', 'avif']);

// ============================================
// UTILS
// ============================================
function isExcluded(url) {
  const u = String(url).toLowerCase();
  return EXCLUDE_DOMAINS.some(d => u.includes(d));
}

function isAsset(url) {
  try {
    const u = new URL(url);
    let path = u.pathname.split('?')[0];
    const ext = path.split('.').pop().toLowerCase();
    return ASSET_EXT.has(ext);
  } catch (e) { return false; }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // Hapus trailing slash
    let path = u.pathname.replace(/\/+$/, '');
    // Hapus query tracking
    const skipParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
    skipParams.forEach(p => u.searchParams.delete(p));
    // Rebuild
    return u.origin + path + (u.search || '');
  } catch (e) { return url; }
}

function scoreEndpoint(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    let score = 0;
    let labels = [];

    for (const p of API_PATH_PATTERNS) {
      if (p.re.test(path)) {
        score += p.score;
        labels.push(p.label);
      }
    }

    // Bonus kalau subdomain api*
    if (/^api[.-]/i.test(u.hostname)) {
      score += 5;
      labels.push('api-subdomain');
    }

    // Penalti kalau asset
    if (isAsset(url)) score -= 20;

    // Bonus kalau status 200 (dari probe)
    return { score, labels };
  } catch (e) {
    return { score: 0, labels: [] };
  }
}

// ============================================
// EXTRACTORS — ekstrak URL dari berbagai source
// ============================================
function extractUrls(text, baseUrl) {
  const urls = new Set();
  if (!text) return [];

  // A. Absolute URL
  const absRe = /https?:\/\/[^\s"'<>()\\]+/g;
  let m;
  while ((m = absRe.exec(text)) !== null) {
    let u = m[0].replace(/[;,.!?)'"\]]+$/, '').replace(/\\+$/, '');
    if (u.length > 12 && u.length < 500) urls.add(u);
  }

  // B. Protocol-relative
  const prRe = /["'`](\/\/[^\s"'`<>]+)["'`]/g;
  while ((m = prRe.exec(text)) !== null) {
    const u = 'https:' + m[1];
    if (u.length > 12 && u.length < 500) urls.add(u);
  }

  // C. Relative path dengan quote
  const relRe = /["'`](\/[a-zA-Z0-9_\-./?=&%:]+)["'`]/g;
  while ((m = relRe.exec(text)) !== null) {
    const p = m[1];
    if (p.length < 4 || p.length > 300) continue;
    try { urls.add(new URL(p, baseUrl).toString()); } catch (e) {}
  }

  // D. fetch/axios/ajax
  const fetchRe = /(?:fetch|axios\.(?:get|post|put|delete|patch)|\.ajax|\.getJSON|\.get|\.post)\s*\(\s*["'`]([^"'`]{4,300})["'`]/g;
  while ((m = fetchRe.exec(text)) !== null) {
    try { urls.add(new URL(m[1], baseUrl).toString()); } catch (e) {}
  }

  // E. href/src/action tanpa quote
  const attrRe = /(?:href|src|action|data-url|data-api|data-endpoint|data-href)=["']?(\/[a-zA-Z0-9_\-./?=&%:]+)["']?/g;
  while ((m = attrRe.exec(text)) !== null) {
    const p = m[1];
    if (p.length < 4 || p.length > 300) continue;
    try { urls.add(new URL(p, baseUrl).toString()); } catch (e) {}
  }

  // F. String literal di JS: "GET /api/xxx", "POST /api/xxx"
  const methodRe = /["'`](GET|POST|PUT|DELETE|PATCH)\s+(\/[a-zA-Z0-9_\-./?=&%:]+)["'`]/g;
  while ((m = methodRe.exec(text)) !== null) {
    try { urls.add(new URL(m[2], baseUrl).toString()); } catch (e) {}
  }

  return Array.from(urls);
}

function extractScriptSrcs(html, baseUrl) {
  const srcs = new Set();
  const re = /<script[^>]+src\s*=\s*["']?([^"'\s>]+)["']?/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let src = m[1].trim();
    if (!src || isExcluded(src)) continue;
    if (src.startsWith('//')) src = 'https:' + src;
    try { srcs.add(new URL(src, baseUrl).toString()); } catch (e) {}
  }
  return Array.from(srcs);
}

function extractInlineScripts(html) {
  const inline = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const code = m[1];
    if (code.length > 50 && code.length < 500000) {
      inline.push(code);
    }
  }
  return inline.join('\n');
}

function extractSitemaps(html) {
  const sitemaps = new Set();
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = re.exec(html)) !== null) sitemaps.add(m[1].trim());
  return Array.from(sitemaps);
}

// ============================================
// SAFE FETCH
// ============================================
async function safeFetch(url, timeoutMs = 10000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(url, {
      method: 'GET',
      headers: browserHeaders(url),
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timer);
    return r;
  } catch (e) { return null; }
}

// ============================================
// DEEP PROBE — coba banyak paths
// ============================================
const COMMON_PATHS = [
  // API umum
  '/api', '/api/v1', '/api/v2', '/api/v3',
  '/api/health', '/api/status', '/api/version',
  '/api/docs', '/api/users', '/api/data',
  '/graphql', '/graphql/playground',
  // WordPress
  '/wp-json', '/wp-json/wp/v2', '/wp-json/wp/v2/posts',
  '/xmlrpc.php',
  // Drupal
  '/jsonapi', '/jsonapi/node',
  // Laravel
  '/api/user', '/api/login',
  // Rails
  '/api/v1/users', '/api/v1/status',
  // Django
  '/api/schema', '/api/docs',
  // Docs
  '/swagger.json', '/swagger.yaml', '/openapi.json', '/api-docs',
  '/.well-known/ai-plugin.json',
  // Misc
  '/health', '/status', '/version', '/metrics'
];

// ============================================
// MAIN FUNCTION
// ============================================
export async function findEndpoints(websiteUrl, onProgress) {
  const result = {
    ok: false,
    website: websiteUrl,
    homepage_status: 0,
    js_files_count: 0,
    frameworks: [],
    endpoints: [],
    errors: [],
    warnings: [],
    elapsed_ms: 0,
    stats: {
      html_urls: 0,
      js_urls: 0,
      probe_urls: 0,
      sitemap_urls: 0
    }
  };

  const started = Date.now();
  let baseUrl = websiteUrl.trim();
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = 'https://' + baseUrl;
  try {
    const u = new URL(baseUrl);
    baseUrl = u.origin;
  } catch (e) {
    result.errors.push('URL tidak valid');
    return result;
  }

  // ==== 1. HOMEPAGE ====
  if (onProgress) onProgress('📡 Fetch homepage...');
  const homeRes = await safeFetch(baseUrl);
  if (!homeRes || !homeRes.ok) {
    result.errors.push('Homepage gagal (' + (homeRes ? homeRes.status : 'no response') + ')');
    result.elapsed_ms = Date.now() - started;
    return result;
  }
  result.homepage_status = homeRes.status;
  const homeHtml = await homeRes.text();

  // ==== 2. DETECT FRAMEWORK ====
  if (onProgress) onProgress('🔍 Deteksi framework...');
  for (const fw of FRAMEWORKS) {
    if (fw.sig.test(homeHtml)) {
      result.frameworks.push({ name: fw.name, api: fw.api });
    }
  }

  // ==== 3. EXTRACT FROM HTML ====
  if (onProgress) onProgress('📄 Parse HTML...');
  const homeUrls = extractUrls(homeHtml, baseUrl);
  result.stats.html_urls = homeUrls.length;

  const inlineJs = extractInlineScripts(homeHtml);
  const inlineUrls = inlineJs ? extractUrls(inlineJs, baseUrl) : [];
  result.stats.html_urls += inlineUrls.length;

  // ==== 4. FETCH JS BUNDLES ====
  if (onProgress) onProgress('📦 Fetch JS bundles...');
  const scriptSrcs = extractScriptSrcs(homeHtml, baseUrl).slice(0, 15);
  result.js_files_count = scriptSrcs.length;

  const jsUrls = [];
  let totalSize = 0;
  const MAX_TOTAL = 1500 * 1024; // 1.5 MB max
  const fetchedJs = new Set();

  // Level 1: JS dari homepage
  const toFetch = [...scriptSrcs];

  // Level 2: JS tambahan yang ditemukan di JS (recursive)
  for (let level = 0; level < 2; level++) {
    const currentBatch = toFetch.splice(0, 8);
    for (const src of currentBatch) {
      if (fetchedJs.has(src)) continue;
      if (totalSize > MAX_TOTAL) break;
      fetchedJs.add(src);
      if (onProgress) onProgress('📦 ' + src.split('/').pop().slice(0, 30));

      const jsRes = await safeFetch(src, 8000);
      if (jsRes && jsRes.ok) {
        const jsText = await jsRes.text();
        totalSize += jsText.length;
        const urls = extractUrls(jsText, baseUrl);
        jsUrls.push(...urls);
        result.stats.js_urls += urls.length;

        // Cari import/require JS lain (level 2)
        if (level === 0) {
          const importRe = /(?:import|from|require)\s*\(?["'`]([^"'`]+\.js(?:\?[^"'`]*)?)["'`]/g;
          let m;
          while ((m = importRe.exec(jsText)) !== null) {
            try {
              const newUrl = new URL(m[1], src).toString();
              if (!fetchedJs.has(newUrl) && toFetch.length < 10) toFetch.push(newUrl);
            } catch (e) {}
          }
        }
      }
    }
  }

  // ==== 5. SITEMAP + ROBOTS ====
  if (onProgress) onProgress('🗺️ Sitemap + robots...');
  const sitemapUrls = [];

  // robots.txt
  const robotsRes = await safeFetch(baseUrl + '/robots.txt', 5000);
  if (robotsRes && robotsRes.ok) {
    const robotsTxt = await robotsRes.text();
    const sitemapMatches = robotsTxt.match(/Sitemap:\s*(\S+)/gi) || [];
    sitemapMatches.forEach(sm => {
      const url = sm.replace(/^Sitemap:\s*/i, '').trim();
      if (url) sitemapUrls.push(url);
    });
  }

  // sitemap.xml default
  sitemapUrls.push(baseUrl + '/sitemap.xml');
  sitemapUrls.push(baseUrl + '/sitemap_index.xml');

  const sitemapEndpoints = [];
  for (const smUrl of sitemapUrls.slice(0, 3)) {
    const smRes = await safeFetch(smUrl, 8000);
    if (smRes && smRes.ok) {
      const smText = await smRes.text();
      // Cek apakah sitemap index atau sitemap biasa
      const locs = extractSitemaps(smText);
      locs.slice(0, 30).forEach(loc => {
        if (isExcluded(loc)) return;
        try {
          const u = new URL(loc);
          // Kalau ini sitemap lain, cek juga (max 2)
          if (/\.xml$/i.test(u.pathname) && sitemapUrls.length < 5) {
            sitemapUrls.push(loc);
          }
          sitemapEndpoints.push(loc);
        } catch (e) {}
      });
      result.stats.sitemap_urls = sitemapEndpoints.length;
    }
  }

  // ==== 6. DEEP PROBE ====
  if (onProgress) onProgress('🔬 Deep probe common paths...');
  const probeResults = [];
  for (const path of COMMON_PATHS) {
    const testUrl = baseUrl + path;
    const r = await safeFetch(testUrl, 5000);
    if (!r || r.status >= 400) continue;

    const ct = (r.headers.get('Content-Type') || '').toLowerCase();

    // Skip asset
    if (ct.includes('image/') || ct.includes('video/') || ct.includes('audio/') || ct.includes('font/')) continue;

    // Untuk HTML — cek body apakah beneran JSON atau HTML
    if (ct.includes('text/html')) {
      try {
        const text = await r.text();
        const trimmed = text.trim();
        // HTML yang balikin status 200 tapi isinya HTML = SPA catch-all (false positive)
        // Accept hanya kalau jelas JSON/XML (bukan tag <html>)
        const isHtmlDoc = /^<!doctype html|^<html|^<!DOCTYPE/i.test(trimmed);
        const isJsonLike = trimmed.startsWith('{') || trimmed.startsWith('[');
        const isXmlLike = trimmed.startsWith('<?xml');
        if (isHtmlDoc && !isJsonLike && !isXmlLike) {
          // Ini HTML document — bukan API. Skip.
          continue;
        }
        // Kalau JSON/XML, tetap masuk
        probeResults.push({
          url: testUrl,
          status: r.status,
          content_type: ct,
          size: String(text.length)
        });
      } catch (e) {
        continue;
      }
    } else if (ct.includes('json') || ct.includes('xml') || ct.includes('text/plain') || ct.includes('javascript')) {
      probeResults.push({
        url: testUrl,
        status: r.status,
        content_type: ct,
        size: r.headers.get('Content-Length') || '0'
      });
    }
  }
  result.stats.probe_urls = probeResults.length;

  // ==== 7. MERGE & SCORE ====
  if (onProgress) onProgress('🎯 Scoring & filter...');
  const allUrls = new Set([...homeUrls, ...inlineUrls, ...jsUrls, ...sitemapEndpoints]);

  // Filter + score
  const scored = [];
  for (const u of allUrls) {
    if (isExcluded(u)) continue;
    if (isAsset(u)) continue;
    const { score, labels } = scoreEndpoint(u);
    if (score < 3) continue; // min score
    scored.push({ url: normalizeUrl(u), score, labels, source: 'scrape', status: 0 });
  }

  // Dedup by normalized URL, ambil score tertinggi
  const dedupMap = new Map();
  for (const item of scored) {
    const existing = dedupMap.get(item.url);
    if (!existing || existing.score < item.score) {
      dedupMap.set(item.url, item);
    }
  }

  // Tambah hasil probe (paling relevan, kasih score tinggi)
  for (const p of probeResults) {
    const norm = normalizeUrl(p.url);
    const { score, labels } = scoreEndpoint(p.url);
    dedupMap.set(norm, {
      url: norm,
      score: score + 15, // bonus karena udah diverifikasi
      labels,
      source: 'probe',
      status: p.status,
      content_type: p.content_type,
      size: p.size
    });
  }

  // Sort by score descending
  const finalEndpoints = Array.from(dedupMap.values()).sort((a, b) => b.score - a.score);

  // Limit 100 max
  result.endpoints = finalEndpoints.slice(0, 100);
  result.ok = result.endpoints.length > 0;
  result.elapsed_ms = Date.now() - started;

  // Warnings
  if (result.frameworks.some(f => f.name === 'WordPress')) {
    result.warnings.push('WordPress terdeteksi — cek /wp-json/wp/v2/');
  }
  if (result.frameworks.some(f => ['React SPA', 'Vue SPA', 'Next.js', 'Nuxt.js', 'Angular'].includes(f.name))) {
    result.warnings.push('SPA framework — endpoint mungkin di-render dinamis di browser');
  }

  if (!result.ok) {
    if (result.frameworks.length) {
      result.errors.push('Framework terdeteksi tapi nggak ada API publik');
    } else {
      result.errors.push('Nggak ada endpoint terdeteksi');
    }
  }

  return result;
}

// ============================================
// FORMAT HASIL
// ============================================
export function formatFinderResult(result, maxShow = 30) {
  const l = [];
  l.push('🔍 <b>CARI ENDPOINT</b>');
  l.push('🌐 <code>' + escapeHtml(result.website) + '</code>');
  l.push('─────────────────');
  l.push('📡 Homepage: ' + (result.homepage_status || '-'));
  l.push('📦 JS: ' + result.js_files_count + ' · 🗺️ Sitemap: ' + (result.stats.sitemap_urls || 0) + ' · 🔬 Probe: ' + (result.stats.probe_urls || 0));
  l.push('⚡ ' + (result.elapsed_ms / 1000).toFixed(1) + 's');

  if (result.frameworks.length) {
    const fwList = result.frameworks.map(f => f.name).join(', ');
    l.push('🎨 Framework: <b>' + escapeHtml(fwList) + '</b>');
  }

  l.push('─────────────────');

  if (!result.ok) {
    l.push('');
    l.push('❌ <b>Tidak ada endpoint terdeteksi</b>');
    if (result.errors.length) {
      l.push('');
      result.errors.forEach(e => l.push('• ' + escapeHtml(e)));
    }
    l.push('');
    l.push('<b>Saran:</b>');
    if (result.frameworks.some(f => f.name === 'WordPress')) {
      l.push('• Coba: <code>/wp-json/wp/v2/posts</code>');
    }
    if (result.frameworks.some(f => ['React SPA', 'Vue SPA', 'Next.js'].includes(f.name))) {
      l.push('• SPA — cek manual via Chrome DevTools → Network tab');
    }
    return l.join('\n');
  }

  l.push('');
  l.push('🎯 <b>' + result.endpoints.length + ' ENDPOINT DITEMUKAN</b>');
  l.push('');

  const show = result.endpoints.slice(0, maxShow);
  show.forEach((ep, i) => {
    const icon = ep.source === 'probe' ? '✅' : '🔗';
    const status = ep.status ? ' <code>[' + ep.status + ']</code>' : '';
    const score = '<i>(' + ep.score + ')</i>';
    const labels = ep.labels && ep.labels.length ? ' ' + ep.labels.slice(0, 2).join(',') : '';
    l.push((i + 1) + '. ' + icon + ' <code>' + escapeHtml(ep.url) + '</code>' + status + ' ' + score);
    if (labels) l.push('    <i>' + escapeHtml(labels) + '</i>');
  });

  if (result.endpoints.length > maxShow) {
    l.push('');
    l.push('<i>... dan ' + (result.endpoints.length - maxShow) + ' lainnya</i>');
  }

  l.push('');
  l.push('📊 <b>Status: PENDING</b>');
  l.push('✅ = terverifikasi (status HTTP real)');
  l.push('🔗 = dari scraping (belum di-test)');
  l.push('<i>(score) = relevansi sebagai API</i>');

  return l.join('\n');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
