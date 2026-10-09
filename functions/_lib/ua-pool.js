// ============================================
// USER-AGENT POOL — biar nggak gampang diblokir
// ============================================

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36'
];

const ACCEPT_LANGS = [
  'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'id-ID,id;q=0.9,en;q=0.8',
  'en-US,en;q=0.9,id;q=0.8'
];

// Ambil UA random dari pool
export function pickUA() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

export function pickLang() {
  return ACCEPT_LANGS[Math.floor(Math.random() * ACCEPT_LANGS.length)];
}

// Generate headers lengkap kayak browser asli
export function browserHeaders(upstreamUrl, extra) {
  let referer = '';
  try {
    const u = new URL(upstreamUrl);
    referer = u.origin + '/';
  } catch (e) {}

  const h = {
    'User-Agent': pickUA(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': pickLang(),
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1'
  };

  if (referer) h['Referer'] = referer;

  // Merge extra headers kalau ada
  if (extra && typeof extra === 'object') {
    for (const k of Object.keys(extra)) {
      if (extra[k]) h[k] = extra[k];
    }
  }

  return h;
}

// Headers khusus JSON request (buat auto-detect param)
export function jsonHeaders(upstreamUrl) {
  const h = browserHeaders(upstreamUrl);
  h['Accept'] = 'application/json, text/plain, */*';
  h['Sec-Fetch-Dest'] = 'empty';
  h['Sec-Fetch-Mode'] = 'cors';
  h['Sec-Fetch-Site'] = 'same-origin';
  delete h['Upgrade-Insecure-Requests'];
  delete h['Sec-Fetch-User'];
  return h;
}

// List UA buat test (biar bisa rotasi kalau kena block)
export function allUAs() {
  return UA_POOL.slice();
}
