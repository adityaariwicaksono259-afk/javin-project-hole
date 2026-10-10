// ========================================
// ENDPOINT FINDER — cari endpoint dari website
// ========================================

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
  'schema.org', 'w3.org', 'wordpress.org', 'gstatic.com',
  'cloudinary.com', 'imgur.com', 'imgbb.com'
];

const API_PATHERN = /\/api\/|\/v\d+\/|\/graphql|\/rpc\/|\/ajax\/|\/rest\/|\/json\/|\/data\/|\/fetch|\/search|\/query|\/list|\/get[a-z]+|\/service\/|\/endpoint|\/backend\//i;

function isExcluded(url) {
  const u = url.toLowerCase();
  return EXCLUDE_DOMAINS.some(d => u.includes(d));
}

function isLikelyEndpoint(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;

    if (API_PATHPATTERN.test(path)) return true;
    if (/^api\./i.test(u.hostname) || /^api-/i.test(u.hostname)) return true;

    const ext = path.split('.').pop().toLowerCase();
    const assetExt = ['js', 'css', 'png', 'jpg', 'ico', 'svg', 'woff', 'woff2', 'ttf', 'mp4', 'webm', 'mp3'];
    if (assetExt.includes(ext)) return false;

    return false;
  } catch (e) { return false; }
}

function extractUrls(text, baseUrl) {
  const urls = new Set();
  const absRegex = /https?:\/\/[a-zA-Z0-9_\-\.\/:?#%&\x27]+/g;
  let m;
  while ((m = absRegex.exec(text))) urls.add(m[0].replace(/['"]+$/, ''));
  const relRegex = /["'`](\/[a-zA-Z0-9_\-\.\/?=&a%:]+)['"`]/g;
  while ((m = relRegex.exec(text))) {
    try { urls.add(new URL(m[1], baseUrl).toString()); } catch (e) {}
  }
  return Array.from(urls);
}

function extractScriptSrcs(html, baseUrl) {
  const srcs = [];
  const regex = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = regex.exec(html))) {
    try { srcs.push(new URL(m[1], baseUrl).toString()); } catch (e) {}
  }
  return srcs;
}

const COMMON_PATHS = [
  '/api', '/api/v1', '/api/v2',
  '/api/health', '/api/status',
  '/graphql', '/rpc',
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
  } catch (e) { return null; }
}

export async function findEndpoints(websiteUrl, onProgress) {
  const result = { ok: false, website: websiteUrl, homepage_status: 0, js_files_count: 0, endpoints: [], errors: [], elapsed_ms: 0 };
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
  const homeUrls = extractUrls(homeHtml, baseUrl);

  const scriptSrcs = extractScriptSrcs(homeHtml, baseUrl).slice(0, 5);
  result.js_files_count = scriptSrcs.length;

  const jsUrls = [];
  let totalSize = 0;
  const MAX_TOTAL = 500 * 1024;

  for (const src of scriptSrcs) {
    if (totalSize > MAX_TOTAL) break;
    if (onProgress) onProgress('Fetch JS:' + src.split('/').pop());
    const jsRes = await safeFetch(src, 8000);
    if (jsRes && jsRes.ok) {
      const jsText = await jsRes.text();
      totalSize += jsText.length;
      jsUrls.push(...extractUrls(jsText, baseUrl));
    }
  }

  const commonResults = [];
  for (const path of COMMON_PATHS) {
    const testUrl = baseUrl + path;
    const r = await safeFetch(testUrl, 5000);
    if (r && r.status < 400) {
      const ct = r.headers.get('Content-Type') || '';
      if (ct.includes('json') || ct.includes('xml') || ct.includes('text/plain')) {
        commonResults.push({ url: testUrl, status: r.status, content_type: ct });
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

  commonResults.forEach(r => finalEndpoints.push({ url: r.url, source: 'probe', status: r.status, content_type: r.content_type }));
  uniqueEndpoints.forEach(u => {
    if (commonUrls.has(u)) return;
    finalEndpoints.push({ url: u, source: 'scrape', status: 0, content_type: '' });
  });

  result.endpoints = finalEndpoints;
  result.ok = finalEndpoints.length > 0;
  result.elapsed_ms = Date.now() - started;

  if (!result.ok) result.errors.push('Nggak ada endpoint terdeteksi');

  return result;
}

export function formatFinderResult(result, maxShow = 50) {
  const l = [];
  l.push('🔍 <b>CARI ENDPOINT</b>');
  l.push('🌐 <code>' + escapeHtml(result.website) + '</code>');
  l.push('—————————————————“');
  l.push('📡 Homepage: ' + (result.homepage_status || '-'));
  l.push('📦 JS files: ' + result.js_files_count);
  l.push('⚡ Waktu: ' + (result.elapsed_ms / 1000).toFixed(1) + 's');
  l.push('—————————————————“');

  if (!result.ok) {
    l.push('');
    l.push('❌ B<b>Tidak ada endpoint terdeteksi</b>');
    l.push('');
    if (result.errors.length) {
      l.push('<b>Errors:</b>');
      result.errors.forEach(e => l.push('‟ ' + escapeHtml(e)));
    }
    l.push('');
    l.push('<b>Kemungkinan:</b>');
    l.push('• Website pakai JS framework (React/Vue) tanpa SSR');
    l.push('• Endpoint di-render dinamis');
    l.push('• Website pakai Cloudflare challenge');
    return l.join('\n');
  }

  l.push('');
  l.push('🎯 <b>ENDPOINT DITEMUKAN (' + result.endpoints.length + ')</b>');
  l.push('');

  const show = result.endpoints.slice(0, maxShow);
  show.forEach((ep, i) => {
    const icon = ep.source === 'probe' ? '🔬' : '🔗';
    const status = ep.status ? ' <code>[' + ep.status + ']</code>' : '';
    l.push((i+1) + '. ' + icon + ' <code>' + escapeHtml(ep.url) + '</code>' + status);
  });

  if (result.endpoints.length > maxShow) {
    l.push('');
    l.push('<i>... dan ' + (result.endpoints.length - maxShow) + ' lainnya</i>');
  }

  l.push('');
  l.push('📊 <b>Status: PENDING</b> — belum diverifikasi');
  l.push('');
  l.push('🔬 = dari probe common paths');
  l.push('🔗 = dari scraping HTML/JS');
  return l.join('\n');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
