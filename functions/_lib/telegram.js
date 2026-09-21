// Telegram helper + security alert formatter
const API = 'https://api.telegram.org/bot';
const lastSent = new Map();

export async function tgCall(env, method, body) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, reason: 'no_token' };
  try {
    const r = await fetch(API + token + '/' + method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) {
    console.error('[TELEGRAM]', method, e.message);
    return { ok: false, reason: e.message };
  }
}

export async function sendTelegram(env, message, options) {
  options = options || {};
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, reason: 'not-configured' };

  const type = options.type || 'default';
  const throttleMs = options.throttleMs || 10000;
  const now = Date.now();
  const last = lastSent.get(type) || 0;
  if (now - last < throttleMs) return { ok: false, reason: 'throttled' };
  lastSent.set(type, now);

  const text = String(message || '').slice(0, 4000);

  try {
    const r = await fetch(API + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    if (!r.ok) {
      const err = await r.text();
      console.error('[TELEGRAM] Send failed:', r.status, err.slice(0, 200));
      return { ok: false, reason: 'http-' + r.status };
    }
    return { ok: true };
  } catch (e) {
    console.error('[TELEGRAM] Error:', e.message);
    return { ok: false, reason: e.message };
  }
}

export function escapeHtml(s) {
  return String(s || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

// ==== Deteksi bot vs manusia dari User-Agent ====
export function detectBotType(ua) {
  if (!ua || ua.length < 5) return { type: '❓ UNKNOWN', detail: 'UA kosong' };
  var u = ua.toLowerCase();
  // Bot signature
  var botSig = ['bot', 'crawl', 'spider', 'scraper', 'curl', 'wget', 'python', 'go-http', 'java/', 'okhttp', 'axios', 'node-fetch', 'postman', 'insomnia', 'httpie', 'libwww', 'http-client', 'headless', 'phantom', 'puppeteer', 'selenium', 'playwright', 'sqlmap', 'nikto', 'nmap', 'masscan', 'nessus', 'acunetix', 'dirbuster', 'gobuster', 'hydra', 'zap', 'w3af'];
  for (var i = 0; i < botSig.length; i++) {
    if (u.indexOf(botSig[i]) !== -1) {
      return { type: '🤖 BOT/TOOL', detail: botSig[i] };
    }
  }
  // Browser signature
  var browsers = ['chrome', 'firefox', 'safari', 'edge', 'opera', 'samsung'];
  for (var j = 0; j < browsers.length; j++) {
    if (u.indexOf(browsers[j]) !== -1) {
      return { type: '👤 MANUSIA', detail: browsers[j] };
    }
  }
  return { type: '❓ UNKNOWN', detail: 'UA tidak dikenal' };
}

// ==== Lookup lokasi dari IP (pakai ip-api.com gratis) ====
export async function lookupGeoIP(ip) {
  if (!ip || ip === 'unknown' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip)) {
    return null;
  }
  try {
    var r = await fetch('http://ip-api.com/json/' + ip + '?fields=status,country,regionName,city,district,isp,org,as,timezone,query', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    var j = await r.json();
    if (j.status !== 'success') return null;
    return {
      country: j.country || '',
      region: j.regionName || '',
      city: j.city || '',
      district: j.district || '',
      isp: j.isp || '',
      org: j.org || '',
      as: j.as || '',
      timezone: j.timezone || ''
    };
  } catch (e) {
    return null;
  }
}

// ==== Format lokasi lengkap ====
export function formatLocation(geo) {
  if (!geo) return '🌍 Tidak diketahui';
  var parts = [];
  if (geo.country) parts.push(geo.country);
  if (geo.region && geo.region !== geo.country) parts.push(geo.region);
  if (geo.city) parts.push(geo.city);
  if (geo.district) parts.push(geo.district);
  return '📍 ' + (parts.join(', ') || 'Tidak diketahui');
}

// ==== Format alert serangan lengkap ====
export async function formatSecurityAlert(env, opts) {
  var ip = opts.ip || 'unknown';
  var ua = opts.ua || '';
  var attackType = opts.attackType || 'Tidak diketahui';
  var target = opts.target || '';
  var isBanned = opts.isBanned || false;
  var banDuration = opts.banDuration || '';
  var extra = opts.extra || null;

  // Deteksi bot/manusia
  var botInfo = detectBotType(ua);

  // Lookup geo
  var geo = await lookupGeoIP(ip);
  var locStr = formatLocation(geo);

  // Bikin pesan
  var lines = [];
  lines.push('☠️ <b>TERDETEKSI SERANGAN</b>');
  lines.push('');
  lines.push('🤖 <b>Tipe:</b> ' + botInfo.type + ' <i>(' + escapeHtml(botInfo.detail) + ')</i>');
  lines.push('🎯 <b>Serangan:</b> ' + escapeHtml(attackType));
  lines.push('🌐 <b>IP:</b> <code>' + escapeHtml(ip) + '</code>');
  if (ua) {
    lines.push('📱 <b>UA:</b> <code>' + escapeHtml(ua.slice(0, 100)) + '</code>');
  }
  lines.push(locStr);
  if (geo && geo.isp) {
    lines.push('🏢 <b>ISP:</b> ' + escapeHtml(geo.isp));
  }
  lines.push('');
  if (isBanned) {
    lines.push('🚫 <b>Status:</b> <b>DIBLOKIR</b>' + (banDuration ? ' (' + escapeHtml(banDuration) + ')' : ''));
  } else {
    lines.push('✅ <b>Status:</b> Terdeteksi (belum diblok)');
  }
  if (extra && extra.identity) {
    lines.push('👤 <b>Identitas:</b> ' + escapeHtml(extra.identity));
  }
  if (target) {
    lines.push('⚔️ <b>Target:</b> <code>' + escapeHtml(target.slice(0, 150)) + '</code>');
  }
  lines.push('');
  lines.push('🕐 ' + new Date().toISOString().replace('T', ' ').slice(0, 19));

  return lines.join('\n');
}
