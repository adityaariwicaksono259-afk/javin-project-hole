// ============================================
// ENDPOINTS EDITOR — manage endpoints.json
// ============================================

import { getFile, putFile, updateJsonFile } from './github.js';
import { browserHeaders, jsonHeaders, pickUA } from './ua-pool.js';

const FILE_PATH = 'public/endpoints.json';

// Generate catalogId unik dengan prefix bot-
function genBotId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'bot-' + s;
}

// Cari endpoint by name atau catalogId
function findEndpoint(data, query) {
  if (!query) return null;
  const q = String(query).toLowerCase().trim();
  for (let i = 0; i < data.length; i++) {
    const ep = data[i];
    if (!ep || typeof ep !== 'object') continue;
    if ((ep.catalogId || '').toLowerCase() === q) return { index: i, ep };
    if ((ep.name || '').toLowerCase() === q) return { index: i, ep };
  }
  return null;
}

// Cek nama udah ada (case-insensitive)
function nameExists(data, name) {
  const n = String(name).toLowerCase().trim();
  return data.some(ep => ep && typeof ep === 'object' && (ep.name || '').toLowerCase().trim() === n);
}

// ============================================
// TAMBAH ENDPOINT
// ============================================
export async function addEndpoint(env, cfg) {
  const {
    url, name, folder, desc, params, method
  } = cfg;

  if (!url || !name || !folder) {
    return { ok: false, message: 'URL, nama, dan folder wajib.' };
  }

  // Parse params: "query|limit|lang" -> array
  const paramList = [];
  if (params && params !== '-') {
    const arr = String(params).split('|').map(s => s.trim()).filter(Boolean);
    arr.forEach(p => {
      paramList.push({
        n: p,
        t: 'string',
        r: 1,
        d: 'Input ' + p
      });
    });
  }

  const newEp = {
    catalogId: genBotId(),
    name: String(name).trim(),
    desc: String(desc || name).trim(),
    folder: String(folder).trim().toLowerCase(),
    subfolder: '',
    m: (method || 'GET').toUpperCase(),
    needKey: false,
    upstream: String(url).trim(),
    params: paramList
  };

  // Cek duplikat nama
  let dup = false;
  const result = await updateJsonFile(env, FILE_PATH, (data) => {
    if (!Array.isArray(data)) return { error: 'endpoints.json bukan array.' };
    if (nameExists(data, newEp.name)) {
      dup = true;
      return { error: 'Nama "' + newEp.name + '" sudah ada.' };
    }
    data.push(newEp);
    return { ok: true };
  }, `bot: add endpoint "${newEp.name}"`);

  if (dup) return { ok: false, message: 'Nama "' + newEp.name + '" sudah ada. Pakai nama lain.' };
  if (!result.ok) return result;

  return {
    ok: true,
    endpoint: newEp,
    commit_url: result.commit_url
  };
}

// ============================================
// EDIT ENDPOINT
// ============================================
export async function editEndpoint(env, name, fields) {
  let found = false;
  const result = await updateJsonFile(env, FILE_PATH, (data) => {
    if (!Array.isArray(data)) return { error: 'endpoints.json bukan array.' };
    const f = findEndpoint(data, name);
    if (!f) return { error: 'Endpoint "' + name + '" tidak ditemukan.' };

    const ep = f.ep;
    if (fields.name) ep.name = String(fields.name).trim();
    if (fields.desc !== undefined) ep.desc = String(fields.desc).trim();
    if (fields.folder) ep.folder = String(fields.folder).trim().toLowerCase();
    if (fields.url) ep.upstream = String(fields.url).trim();
    if (fields.params !== undefined) {
      const arr = String(fields.params).split('|').map(s => s.trim()).filter(Boolean);
      ep.params = arr.map(p => ({ n: p, t: 'string', r: 1, d: 'Input ' + p }));
    }
    found = true;
    return { ok: true };
  }, `bot: edit endpoint "${name}"`);

  if (!found) return { ok: false, message: 'Endpoint "' + name + '" tidak ditemukan.' };
  return result;
}

// ============================================
// HIDE ENDPOINT (soft delete)
// ============================================
export async function hideEndpoint(env, name) {
  let found = false;
  const result = await updateJsonFile(env, FILE_PATH, (data) => {
    if (!Array.isArray(data)) return { error: 'endpoints.json bukan array.' };
    const f = findEndpoint(data, name);
    if (!f) return { error: 'Endpoint "' + name + '" tidak ditemukan.' };
    f.ep.hidden = true;
    found = true;
    return { ok: true };
  }, `bot: hide endpoint "${name}"`);

  if (!found) return { ok: false, message: 'Endpoint "' + name + '" tidak ditemukan.' };
  return result;
}

// ============================================
// RESTORE ENDPOINT (unhide)
// ============================================
export async function restoreEndpoint(env, name) {
  let found = false;
  let wasHidden = false;
  const result = await updateJsonFile(env, FILE_PATH, (data) => {
    if (!Array.isArray(data)) return { error: 'endpoints.json bukan array.' };
    const f = findEndpoint(data, name);
    if (!f) return { error: 'Endpoint "' + name + '" tidak ditemukan.' };
    wasHidden = !!f.ep.hidden;
    delete f.ep.hidden;
    found = true;
    return { ok: true };
  }, `bot: restore endpoint "${name}"`);

  if (!found) return { ok: false, message: 'Endpoint "' + name + '" tidak ditemukan.' };
  return { ok: result.ok, was_hidden: wasHidden, commit_url: result.commit_url };
}

// ============================================
// LIST ENDPOINTS (dari bot saja)
// ============================================
export async function listBotEndpoints(env) {
  const file = await getFile(env, FILE_PATH);
  if (!file.ok) return file;

  let data;
  try { data = JSON.parse(file.content); } catch(e) {
    return { ok: false, message: 'JSON parse error' };
  }

  const botEps = data.filter(ep => ep && typeof ep === 'object' && (ep.catalogId || '').startsWith('bot-'));
  return { ok: true, endpoints: botEps };
}

// ============================================
// AUTO-DETECT PARAMS — coba beberapa nama param
// ============================================
export async function autoDetectParams(url) {
  // Wrapper lama — sekarang pakai scanEndpoint
  const result = await scanEndpoint(url);
  if (result.ok && result.detected_param !== undefined) {
    return {
      ok: true,
      param: result.detected_param || '',
      url_tested: url + (result.detected_param ? '?' + result.detected_param + '=test' : ''),
      status: result.status,
      response_preview: (result.response_preview || '').slice(0, 200)
    };
  }
  return {
    ok: false,
    message: result.message || 'Nggak bisa auto-detect.'
  };
}

// ============================================
// SCAN ENDPOINT — comprehensive check
// ============================================
export async function scanEndpoint(url) {
  const result = {
    ok: false,
    checks: {},
    warnings: [],
    errors: [],
    detected_param: '',
    status: 0,
    elapsed_ms: 0,
    content_type: '',
    response_preview: '',
    response_shape: '',
    is_umbrella: false
  };

  if (!url || !/^https?:\/\//i.test(url)) {
    result.errors.push('URL tidak valid (harus http/https)');
    return result;
  }

  const started = Date.now();

  // ==== 1. Reachable check (no param) ====
  let baseRes;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    baseRes = await fetch(url, {
      method: 'GET',
      headers: browserHeaders(url),
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timer);
  } catch (e) {
    result.errors.push('Reachable: GAGAL (' + (e.message || 'timeout') + ')');
    result.elapsed_ms = Date.now() - started;
    return result;
  }

  result.elapsed_ms = Date.now() - started;
  result.status = baseRes.status;
  result.checks.reachable = baseRes.status < 500;

  // ==== 2. SSL check ====
  // Kalau fetch sukses lewat HTTPS tanpa error certificate → SSL valid
  result.checks.ssl = url.startsWith('https://');

  // ==== 3. Response time ====
  result.checks.fast = result.elapsed_ms < 5000;
  if (result.elapsed_ms > 10000) {
    result.warnings.push('Response time lambat (>10s)');
  }

  // ==== 4. Content-Type ====
  const ct = baseRes.headers.get('Content-Type') || '';
  result.content_type = ct;

  // ==== 5. Auth check (401/403) ====
  if (baseRes.status === 401 || baseRes.status === 403) {
    result.checks.auth = true;
    result.is_umbrella = true;
    result.warnings.push('Upstream butuh auth (HTTP ' + baseRes.status + ')');
  } else {
    result.checks.auth = false;
  }

  // ==== 6. Cloudflare challenge detection ====
  const serverHdr = baseRes.headers.get('Server') || '';
  if (/cloudflare/i.test(serverHdr) && baseRes.status === 503) {
    result.warnings.push('Kemungkinan Cloudflare challenge aktif di upstream');
    result.is_umbrella = true;
  }

  // ==== 7. Ambil response body (cuma 100KB max) ====
  let bodyText = '';
  try {
    const reader = baseRes.body.getReader();
    const chunks = [];
    let total = 0;
    while (total < 100 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { buf.set(c, off); off += c.length; }
    bodyText = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  } catch (e) {
    bodyText = '';
  }

  result.response_preview = bodyText.slice(0, 500);

  // ==== 8. Response shape detection ====
  let parsedJson = null;
  if (ct.includes('json')) {
    try { parsedJson = JSON.parse(bodyText); } catch (e) {}
  }

  // Auto-try parse kalau content-type salah tapi isi kayak JSON
  if (!parsedJson && bodyText.trim().startsWith('{')) {
    try { parsedJson = JSON.parse(bodyText); } catch (e) {}
  }

  if (parsedJson) {
    result.response_shape = 'json';
    result.checks.json = true;

    // Cek apakah ini error message
    const lower = JSON.stringify(parsedJson).toLowerCase().slice(0, 1000);
    if (/"error"|"success"\s*:\s*false|"status"\s*:\s*"error"|not found|invalid|missing|required/i.test(lower)) {
      // Kemungkinan butuh param
    }
  } else if (ct.startsWith('image/')) {
    result.response_shape = 'image';
  } else if (ct.startsWith('video/')) {
    result.response_shape = 'video';
  } else if (ct.startsWith('audio/')) {
    result.response_shape = 'audio';
  } else if (ct.includes('html')) {
    result.response_shape = 'html';
    result.warnings.push('Response HTML (mungkin bukan API murni)');
  } else {
    result.response_shape = 'text';
  }

  // ==== 9. Auto-detect param ====
  const candidates = ['', '?q=test', '?query=test', '?prompt=test', '?url=test', '?text=test', '?search=test', '?keyword=test'];
  const paramNames = ['', 'q', 'query', 'prompt', 'url', 'text', 'search', 'keyword'];

  for (let i = 1; i < candidates.length; i++) {
    const testUrl = url + candidates[i];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const r = await fetch(testUrl, {
        method: 'GET',
        headers: jsonHeaders(url),
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timer);

      if (r.status >= 200 && r.status < 300) {
        const txt = await r.text();
        const lower = txt.toLowerCase().slice(0, 500);
        const isErr = /"error"|"success"\s*:\s*false|"status"\s*:\s*"error"|not found|invalid|missing|required/i.test(lower);
        if (!isErr) {
          result.detected_param = paramNames[i];
          result.checks.param_detected = true;
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (!result.detected_param) {
    result.checks.param_detected = false;
  }

  // ==== 10. Kesimpulan (FIXED) ====
  result.checks.reachable = baseRes.status >= 200 && baseRes.status < 400;

  const isJson = result.response_shape === 'json';
  const isHtml = result.response_shape === 'html';
  const isImage = result.response_shape === 'image';
  const isVideo = result.response_shape === 'video';
  const isAudio = result.response_shape === 'audio';

  const isApiLike = isJson || isImage || isVideo || isAudio;

  if (baseRes.status === 404) {
    result.errors.push('HTTP 404 — endpoint tidak ditemukan di root');
  } else if (baseRes.status >= 500) {
    result.errors.push('HTTP ' + baseRes.status + ' — server error');
  }

  if (isHtml) {
    result.errors.push('Response HTML — ini website, bukan API');
    result.suggestion = 'Butuh scraping via Node.js (host di Render)';
    result.type = 'website';
  }

  if (result.is_umbrella) {
    result.errors.push('Endpoint umbrella (butuh auth/API key)');
    result.suggestion = 'Butuh API key. Kalau punya, lanjut + simpan key di env CF.';
    result.type = 'umbrella';
  }

  result.ok = result.checks.reachable && !result.is_umbrella && isApiLike;

  if (result.ok) {
    result.type = 'api';
  } else if (!result.type) {
    result.type = 'unknown';
    result.suggestion = 'Cek dokumentasi endpoint atau pakai URL spesifik.';
  }

  return result;
}

// ============================================
// FORMAT HASIL SCAN buat bot
// ============================================
export function formatScanResult(scan) {
  const lines = [];
  lines.push('🔍 *HASIL SCAN*');
  lines.push('─────────────────');

  const check = (icon, label, val) => {
    lines.push(icon + ' ' + label + ': ' + val);
  };

  check(scan.checks.reachable ? '✅' : '❌', 'Reachable', scan.status || '-');
  check(scan.checks.ssl ? '✅' : '⚠️', 'SSL', scan.checks.ssl ? 'Valid' : 'HTTP');
  check(scan.checks.fast ? '✅' : '⚠️', 'Speed', (scan.elapsed_ms || 0) + 'ms');
  check(scan.checks.auth ? '⚠️' : '✅', 'Auth', scan.checks.auth ? 'BUTUH' : 'Tidak butuh');
  check('📄', 'Content', scan.content_type || '-');
  check('🎯', 'Shape', scan.response_shape || '-');
  check('📋', 'Param', scan.detected_param || '(tidak butuh / tidak terdeteksi)');

  lines.push('─────────────────');

  if (scan.warnings.length) {
    lines.push('⚠️ *WARNINGS:*');
    scan.warnings.forEach(w => lines.push('• ' + w));
  }

  if (scan.errors.length) {
    lines.push('❌ *ERRORS:*');
    scan.errors.forEach(e => lines.push('• ' + e));
  }

  lines.push('');
  if (scan.ok) {
    lines.push('✅ *Bisa di-proxy dari CF*');
  } else if (scan.is_umbrella) {
    lines.push('❌ *Umbrella* — butuh API key / auth. Bisa lanjut kalau kalian punya key-nya.');
  } else {
    lines.push('❌ *Nggak bisa otomatis* — perlu cek manual');
  }

  return lines.join('\n');
}
