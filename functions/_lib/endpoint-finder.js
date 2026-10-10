// ============================================
// ENDPOINT FINDER — cari endpoint dari website
// ============================================

import { browserHeaders } from './ua-pool.js';

const EXCLUDE_DOMAINS = [
  'google-analytics.com', 'googletagmanager.com', 'googleadservices.com',
  'doubleclick.net', 'facebook.com', 'fbcdn.net', 'connect.facebook.net',
  'twitter.com', 'tiktok.com', 'youtube.com', 'ytimg.com',
  'cloudflare.com', 'cloudflareinsights.com', 'cdnjs.com', 'jsdelivr.net',
  'unpkg.com', 'jquery.com', 'bootstrapcdn.com', 'fontawesome.com',
  'fonts.googleapis.com', 'fonts.gstatic.com',
  'hotjar.com', 'mixpanel.com', 'segment.com', 'amplitude.com',
  'sentry.io', 'bugsnag.com', 'newrelic.com', 'datadog.com',
  'disqus.com', 'gravatar.com', 'stripe.com', 'paypal.com',
  'whatsapp.com', 'instagram.com', 'linkedin.com', 'pinterest.com',
  'schema.org', 'w3.org', 'gstatic.com',
  'bundleunum.com', 'chalazataverns.com', 'min.js',
  'googlesyndication.com', 'adservice.google.com'
];

// Path yang menandakan API endpoint (looser)
const API_PATH_PATTERNS = [
  /\/api(\/|$|\?)/i,
  /\/v\d+(\/|$)/i,
  /\/graphql/i,
  /\/rpc(\/|$)/i,
  /\/ajax(\/|$)/i,
  /\/rest(\/|$)/i,
  /\/json(\/|$)/i,
  /\/endpoint/i,
  /\/wp-json/i,
  /\/xmlrpc/i,
  /\/feed(\/|$)/i
];

// File JS/CSS/image assets — bukan endpoint
const ASSET_EXT = ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'mp4', 'webm', 'mp3', 'pdf', 'map'];

function isExcluded(url) {
  const u = url.toLowerCase();
  return EXCLUDE_DOMAINS.some(d => u.includes(d));
}

function isAsset(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const ext = path.split('.').pop().toLowerCase();
    // Kalau ada query string, ambil path aja
    if (ext.includes('?')) return ASSET_EXT.includes(ext.split('?')[0]);
    return ASSET_EXT.includes(ext);
  } catch (e) {
    return false;
  }
}

function isLikelyEndpoint(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;

    // Kalau asset, skip
    if (isAsset(url)) return false;

    // Kalau path match API pattern, ini endpoint
    if (API_PATH_PATTERNS.some(p => p.test(path))) return true;

    // Kalau subdomain api*
    if (/^api\./i.test(u.hostname) || /^api-/i.test(u.hostname)) return true;

    // Skip root / homepage
    if (path === '/' || path === '') return false;

    return false;
  } catch (e) {
    return false;
  }
}

// Ekstrak URL dari text — regex fix
function extractUrls(text, baseUrl) {
  const urls = new Set();
  if (!text) return [];

  // ==== A. Absolute URL (dari HTML src/href) ====
  // Match: https://... atau http://...
  const absRegex = /https?:\/\/[^\s"'<>()]+/g;
  let m;
  while ((m = absRegex.exec(text)) !== null) {
    const cleaned = m[0].replace(/[;,.]+$/, '').replace(/["']$/, '');
    if (cleaned.length > 10 && cleaned.length < 500) urls.add(cleaned);
  }

  // ==== B. Relative path (dari JS string) ====
  // Match: "/path/to/thing" atau '/path' atau `/path`
  const relRegex = /["'`](\/[a-zA-Z0-9_\-./?=&%:]+)["'`]/g;
  while ((m = relRegex.exec(text)) !== null) {
    const path = m[1];
    if (path.length < 4 || path.length > 200) continue;
    try { urls.add(new URL(path, baseUrl).toString()); } catch (e) {}
  }

  // ==== C. fetch("url") / axios.get("url") ====
  const fetchRegex = /(?:fetch|axios\.(?:get|post|put|delete)|\.ajax|\.getJSON)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  while ((m = fetchRegex.exec(text)) !== null) {
    try { urls.add(new URL(m[1], baseUrl).toString()); } catch (e) {}
  }

  // ==== D. Path tanpa quote (kayak di HTML attributes) ====
  // Match: /wp-content/plugins/... dalam bentuk href=/path
  const hrefRegex = /(?:href|src|action|data-url)=["']?(\/[a-zA-Z0-9_\-./?=&%:]+)["']?/g;
  while ((m = hrefRegex.exec(text)) !== null) {
    const path = m[1];
    if (path.length < 4 || path.length > 200) continue;
    try { urls.add(new URL(path, baseUrl).toString()); } catch (e) {}
  }

  return Array.from(urls);
}

function extractScriptSrcs(html, baseUrl) {
  const srcs = [];
  // Match src dengan atau tanpa quote, dan protokol // (protocol-relative)
  const regex = /<script[^>]+src\s*=\s*["']?([^"'\s>]+)["']?/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    let src = m[1].trim();
    if (!src) continue;
    // Skip google analytics dan tracking
    if (isExcluded(src)) continue;
    try {
      // Protocol-relative URL
      if (src.startsWith('//')) src = 'https:' + src;
      srcs.push(new URL(src, baseUrl).toString());
    } catch (e) {}
  }
  return srcs;
}

const COMMON_PATHS = [
  '/api', '/api/v1', '/api/v2',
  '/api/health', '/api/status',
  '/graphql', '/graphql/',
  '/wp-json', '/wp-json/wp/v2',
  '/xmlrpc.php',
  '/swagger.json', '/openapi.json',
  '/.well-known/ai-plugin.json'
];

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
  } catch (e) {
    return null;
  }
}

export async function findEndpoints(websiteUrl, onProgress) {
  const result = {
    ok: false,
    website: websiteUrl,
    homepage_status: 0,
    js_files_count: 0,
    endpoints: [],
    errors: [],
    elapsed_ms: 0,
    is_wordpress: false,
    is_js_heavy: false
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

  if (onProgress) onProgress('Fetch homepage');
  const homeRes = await safeFetch(baseUrl);
  if (!homeRes || !homeRes.ok) {
    result.errors.push('Homepage gagal (' + (homeRes ? homeRes.status : 'no response') + ')');
    result.elapsed_ms = Date.now() - started;
    return result;
  }

  result.homepage_status = homeRes.status;
  const homeHtml = await homeRes.text();

  // Detect WordPress
  if (/wp-content|wp-includes|wordpress/i.test(homeHtml)) {
    result.is_wordpress = true;
  }

  // Detect JS-heavy (React/Vue/Next)
  if (/__NEXT_DATA__|_nuxt|react-dom|vue\.runtime|_app-/i.test(homeHtml)) {
    result.is_js_heavy = true;
  }

  const homeUrls = extractUrls(homeHtml, baseUrl);

  if (onProgress) onProgress('Cari JS');
  const scriptSrcs = extractScriptSrcs(homeHtml, baseUrl).slice(0, 5);
  result.js_files_count = scriptSrcs.length;

  const jsUrls = [];
  let totalSize = 0;
  const MAX_TOTAL = 500 * 1024;

  for (const src of scriptSrcs) {
    if (totalSize > MAX_TOTAL) break;
    if (isExcluded(src)) continue;
    if (onProgress) onProgress('Fetch JS: ' + src.split('/').pop());
    const jsRes = await safeFetch(src, 8000);
    if (jsRes && jsRes.ok) {
      const jsText = await jsRes.text();
      totalSize += jsText.length;
      jsUrls.push(...extractUrls(jsText, baseUrl));
    }
  }

  if (onProgress) onProgress('Probe common paths');
  const commonResults = [];
  for (const path of COMMON_PATHS) {
    const testUrl = baseUrl + path;
    const r = await safeFetch(testUrl, 5000);
    if (r && r.status < 400) {
      const ct = r.headers.get('Content-Type') || '';
      if (ct.includes('json') || ct.includes('xml') || ct.includes('text/plain')) {
        commonResults.push({
          url: testUrl,
          status: r.status,
          content_type: ct
        });
      }
    }
  }

  const allUrls = new Set([...homeUrls, ...jsUrls]);
  const filtered = [];
  for (const u of allUrls) {
    if (isExcluded(u)) continue;
    if (!isLikelyEndpoint(u)) continue;
    filtered.push(u);
  }

  const uniqueEndpoints = Array.from(new Set(filtered));
  const commonUrls = new Set(commonResults.map(r => r.url));
  const finalEndpoints = [];

  commonResults.forEach(r => {
    finalEndpoints.push({
      url: r.url,
      source: 'probe',
      status: r.status,
      content_type: r.content_type
    });
  });

  uniqueEndpoints.forEach(u => {
    if (commonUrls.has(u)) return;
    finalEndpoints.push({
      url: u,
      source: 'scrape',
      status: 0,
      content_type: ''
    });
  });

  result.endpoints = finalEndpoints;
  result.ok = finalEndpoints.length > 0;
  result.elapsed_ms = Date.now() - started;

  if (!result.ok) {
    if (result.is_wordpress) {
      result.errors.push('Website WordPress — nggak expose API publik');
    } else if (result.is_js_heavy) {
      result.errors.push('Website JS-heavy (React/Vue) — endpoint dirender di browser');
    } else {
      result.errors.push('Nggak ada endpoint terdeteksi di HTML/JS');
    }
  }

  return result;
}

export function formatFinderResult(result, maxShow = 50) {
  const l = [];
  l.push('🔍 <b>CARI ENDPOINT</b>');
  l.push('🌐 <code>' + escapeHtml(result.website) + '</code>');
  l.push('─────────────────');
  l.push('📡 Homepage: ' + (result.homepage_status || '-'));
  l.push('📦 JS files: ' + result.js_files_count);
  l.push('⚡ Waktu: ' + (result.elapsed_ms / 1000).toFixed(1) + 's');

  if (result.is_wordpress) l.push('🔧 CMS: <b>WordPress</b>');
  if (result.is_js_heavy) l.push('⚛️ Framework: <b>JS-heavy</b>');

  l.push('─────────────────');

  if (!result.ok) {
    l.push('');
    l.push('❌ <b>Tidak ada endpoint terdeteksi</b>');
    l.push('');
    if (result.errors.length) {
      l.push('<b>Alasan:</b>');
      result.errors.forEach(e => l.push('• ' + escapeHtml(e)));
    }
    l.push('');
    l.push('<b>Saran:</b>');
    if (result.is_wordpress) {
      l.push('• Website WordPress — cek <code>/wp-json/</code> atau <code>/wp-json/wp/v2/posts</code>');
      l.push('• Kalau mau scrape, host Node.js di Render (bot bisa generate template)');
    } else if (result.is_js_heavy) {
      l.push('• Website React/Vue — endpoint ada di browser, nggak keliatan dari HTML');
      l.push('• Buka Chrome DevTools → Network tab → refresh halaman');
      l.push('• Cari request XHR/fetch ke <code>/api/*</code>');
    } else {
      l.push('• Cek dokumentasi API website-nya langsung');
      l.push('• Coba inspect manual via Chrome DevTools');
    }
    return l.join('\n');
  }

  l.push('');
  l.push('🎯 <b>ENDPOINT DITEMUKAN (' + result.endpoints.length + ')</b>');
  l.push('');

  const show = result.endpoints.slice(0, maxShow);
  show.forEach((ep, i) => {
    const icon = ep.source === 'probe' ? '🔬' : '🔗';
    const status = ep.status ? ' <code>[' + ep.status + ']</code>' : '';
    l.push((i + 1) + '. ' + icon + ' <code>' + escapeHtml(ep.url) + '</code>' + status);
  });

  if (result.endpoints.length > maxShow) {
    l.push('');
    l.push('<i>... dan ' + (result.endpoints.length - maxShow) + ' lainnya</i>');
  }

  l.push('');
  l.push('📊 <b>Status: PENDING</b> — belum diverifikasi');
  l.push('');
  l.push('🔬 = dari probe (status HTTP beneran)');
  l.push('🔗 = dari scraping HTML/JS (belum di-test)');

  return l.join('\n');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
