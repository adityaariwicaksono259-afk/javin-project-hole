// ============================================
// ENDPOINTS EDITOR — manage endpoints.json
// ============================================

import { getFile, putFile, updateJsonFile } from './github.js';

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
  const candidates = ['', '?q=test', '?query=test', '?prompt=test', '?url=test', '?text=test', '?search=test', '?keyword=test'];
  const paramNames = ['(tanpa param)', 'q', 'query', 'prompt', 'url', 'text', 'search', 'keyword'];

  for (let i = 0; i < candidates.length; i++) {
    const testUrl = url + candidates[i];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch(testUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      // Cek response
      if (r.status >= 200 && r.status < 300) {
        const text = await r.text();
        // Cek apakah response keliatan valid (bukan error message)
        const lower = text.toLowerCase().slice(0, 500);
        const isError = /"error"|"success"\s*:\s*false|"status"\s*:\s*"error"|not found|invalid|missing|required/i.test(lower);

        if (!isError) {
          return {
            ok: true,
            param: paramNames[i] === '(tanpa param)' ? '' : paramNames[i],
            url_tested: testUrl,
            status: r.status,
            response_preview: text.slice(0, 200)
          };
        }
      }
    } catch (e) {
      // Timeout atau error, lanjut ke candidate berikutnya
      continue;
    }
  }

  return {
    ok: false,
    message: 'Nggak bisa auto-detect. Semua percobaan gagal.'
  };
}
