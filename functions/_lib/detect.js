// Detection helpers — Layer 30-33
export async function fingerprint(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const enc = request.headers.get('Accept-Encoding') || '';
  const raw = ip + '|' + ua + '|' + lang + '|' + enc;
  const buf = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

const concurrentMap = new Map();
const MAX_CONCURRENT = 15;

export function concurrentStart(ip) {
  const now = Date.now();
  let entry = concurrentMap.get(ip);
  if (entry && now - entry.lastSeen > 60000) {
    concurrentMap.delete(ip);
    entry = null;
  }
  if (!entry) entry = { count: 0, lastSeen: now };
  entry.count++;
  entry.lastSeen = now;
  concurrentMap.set(ip, entry);
  return { ok: entry.count <= MAX_CONCURRENT, current: entry.count, max: MAX_CONCURRENT };
}

export function concurrentEnd(ip) {
  const entry = concurrentMap.get(ip);
  if (entry && entry.count > 0) {
    entry.count--;
    entry.lastSeen = Date.now();
  }
}

const patternMap = new Map();

export function detectPattern(ip, path) {
  const key = ip + ':' + path;
  const now = Date.now();
  let entry = patternMap.get(key);
  if (!entry || now - entry.firstSeen > 10000) {
    entry = { count: 0, firstSeen: now };
  }
  entry.count++;
  patternMap.set(key, entry);
  if (patternMap.size > 500) {
    for (const [k, v] of patternMap.entries()) {
      if (now - v.firstSeen > 60000) patternMap.delete(k);
    }
  }
  return { repeated: entry.count >= 20, count: entry.count };
}
