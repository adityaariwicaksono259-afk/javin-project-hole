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
  const throttleMs = (typeof options.throttleMs === 'number') ? options.throttleMs : 10000;
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
    var r = await fetch('http://ip-api.com/json/' + ip + '?fields=status,country,regionName,city,district,zip,lat,lon,isp,org,as,timezone,query,proxy,hosting,mobile', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    var j = await r.json();
    if (j.status !== 'success') return null;
    return {
      country: j.country || '',
      region: j.regionName || '',
      city: j.city || '',
      district: j.district || '',
      zip: j.zip || '',
      lat: j.lat || null,
      lon: j.lon || null,
      isp: j.isp || '',
      org: j.org || '',
      as: j.as || '',
      timezone: j.timezone || '',
      isProxy: !!j.proxy,
      isHosting: !!j.hosting,
      isMobile: !!j.mobile
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


// ==== Deteksi tipe device (HP/Laptop/Server) ====
export function detectDeviceType(ua) {
  if (!ua) return { type: '❓ Tidak diketahui', device: 'Tidak diketahui', category: 'unknown' };
  var u = ua;

  // ==== SERVER / BOT ====
  if (/curl|wget|python|go-http|java\/|okhttp|axios|node-fetch|postman|insomnia|httpie|libwww|scrapy|httpx|aiohttp/i.test(u)) {
    var tool = 'Bot';
    var m = u.match(/^(curl|wget|python|go-http-client|axios|okhttp|node-fetch|postman|insomnia|httpx|aiohttp|scrapy)\S*/i);
    if (m) tool = m[1];
    return { type: '🖥️ Server / Bot VPS', device: tool, category: 'server' };
  }
  if (/sqlmap|nikto|nmap|masscan|nessus|acunetix|dirbuster|gobuster|hydra|zap|w3af/i.test(u)) {
    var t2 = u.match(/(sqlmap|nikto|nmap|masscan|nessus|acunetix|dirbuster|gobuster|hydra|zap|w3af)/i);
    return { type: '🖥️ Hacking Tool', device: t2 ? t2[1] : 'Unknown Tool', category: 'server' };
  }

  // ==== MOBILE ====
  if (/Android/i.test(u)) {
    // Parse model code dari UA: "(Linux; Android 13; SM-A515F)"
    var m2 = u.match(/Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build|\s*\)|;)/i);
    var model = m2 ? m2[1].trim() : '';
    var brand = 'Android';
    if (/^SM-|^SAMSUNG/i.test(model)) brand = 'Samsung';
    else if (/^vivo/i.test(model)) brand = 'Vivo';
    else if (/^CPH|^OPPO|^P[A-Z]{2}\d/i.test(model) && /oppo/i.test(u)) brand = 'OPPO';
    else if (/^M\d{4}|^Redmi|^POCO|^Xiaomi/i.test(model)) brand = 'Xiaomi';
    else if (/^RMX|^realme/i.test(model)) brand = 'Realme';
    else if (/^HUAWEI|^HONOR/i.test(model)) brand = 'Huawei/Honor';
    else if (/^Infinix/i.test(model)) brand = 'Infinix';
    else if (/^TECNO/i.test(model)) brand = 'Tecno';
    else if (/^itel/i.test(model)) brand = 'iTel';
    else if (/^ASUS/i.test(model)) brand = 'Asus';
    else if (/^Nokia/i.test(model)) brand = 'Nokia';
    else if (/^OnePlus|^ONEPLUS/i.test(model)) brand = 'OnePlus';
    else if (/^motorola|^moto/i.test(model)) brand = 'Motorola';
    else if (model) brand = model.split(/[-\s]/)[0];
    return {
      type: '📱 HP Android',
      device: brand + (model ? ' (' + model + ')' : ''),
      category: 'mobile'
    };
  }
  if (/iPhone/i.test(u)) {
    var miphone = u.match(/iPhone[^;)]*/i);
    return { type: '📱 iPhone', device: miphone ? miphone[0] : 'iPhone', category: 'mobile' };
  }
  if (/iPad/i.test(u)) return { type: '📱 iPad', device: 'Apple iPad', category: 'mobile' };
  if (/Mobile|Tablet/i.test(u)) return { type: '📱 Mobile Device', device: 'Unknown Mobile', category: 'mobile' };

  // ==== DESKTOP ====
  if (/Windows NT 10/i.test(u)) {
    var w = /Windows NT 10.0/i.test(u) ? 'Windows 10/11' : 'Windows';
    return { type: '💻 Laptop/PC', device: w, category: 'desktop' };
  }
  if (/Windows NT 6\.1/i.test(u)) return { type: '💻 Laptop/PC', device: 'Windows 7', category: 'desktop' };
  if (/Windows/i.test(u)) return { type: '💻 Laptop/PC', device: 'Windows', category: 'desktop' };
  if (/Macintosh|Mac OS X/i.test(u)) {
    var mac = u.match(/Mac OS X [\d_.]+/i);
    return { type: '💻 Mac', device: 'macOS ' + (mac ? mac[0].replace('Mac OS X ', '') : ''), category: 'desktop' };
  }
  if (/Linux/i.test(u)) return { type: '🖥️ Linux', device: 'Linux Desktop', category: 'desktop' };

  return { type: '❓ Tidak diketahui', device: 'Unknown', category: 'unknown' };
}

// ==== Klasifikasi jenis serangan ====
export function detectAttackType(pathname, ua, extra) {
  var u = (ua || '').toLowerCase();
  var p = (pathname || '').toLowerCase();

  if (/sqlmap|sql injection|sqli/i.test(u)) return '💉 SQL Injection (SQLMap)';
  if (/\.env|\.git|wp-admin|wp-login|phpmyadmin|admin\.php|config\.php|backup/i.test(p)) return '🔍 Path Scanner (Honeypot)';
  if (/nikto|acunetix|nessus|dirbuster|gobuster/i.test(u)) return '🔍 Vulnerability Scanner';
  if (/nmap|masscan/i.test(u)) return '🌐 Port Scanner';
  if (/hydra/i.test(u)) return '🔑 Brute Force Attack';
  if (/union.*select|or\s+1\s*=\s*1|drop\s+table|insert\s+into/i.test(p)) return '💉 SQL Injection';
  if (extra && extra.reason) {
    if (/too many errors/i.test(extra.reason)) return '🚫 Auto-Block (Error Storm)';
    if (/password/i.test(extra.reason)) return '🔑 Brute Force Login';
    if (/2fa/i.test(extra.reason)) return '🔐 2FA Brute Force';
  }
  if (/curl|wget|python|go-http|axios|postman/i.test(u)) return '🤖 Bot Access (Honeypot)';
  return '⚠️ Suspicious Activity';
}

// ==== Bikin link Google Maps ====
export function buildMapLink(geo) {
  if (!geo || geo.lat === null || geo.lon === null) return null;
  return 'https://www.google.com/maps?q=' + geo.lat + ',' + geo.lon;
}

// ==== Format alert serangan lengkap ====
export async function formatSecurityAlert(env, opts) {
  var ip = opts.ip || 'unknown';
  var ua = opts.ua || '';
  var target = opts.target || '';
  var isBanned = opts.isBanned || false;
  var banDuration = opts.banDuration || '';
  var extra = opts.extra || null;
  var customAttack = opts.attackType || '';

  // Deteksi
  var dev = detectDeviceType(ua);
  var attackType = customAttack || detectAttackType(target, ua, extra);
  var botInfo = detectBotType(ua);

  // Lookup geo
  var geo = await lookupGeoIP(ip);
  var locStr = formatLocation(geo);
  var mapLink = buildMapLink(geo);

  var lines = [];
  lines.push('☠️ <b>TERDETEKSI SERANGAN</b>');
  lines.push('');
  lines.push('👤 <b>Type:</b> ' + dev.type);
  lines.push('📟 <b>Device:</b> ' + escapeHtml(dev.device));
  lines.push('🎯 <b>Serangan:</b> ' + escapeHtml(attackType));
  lines.push('');
  lines.push('🌐 <b>IP:</b> <code>' + escapeHtml(ip) + '</code>');

  if (geo) {
    var locParts = [];
    if (geo.country) locParts.push(geo.country);
    if (geo.region) locParts.push(geo.region);
    if (geo.city) locParts.push(geo.city);
    if (geo.district) locParts.push(geo.district);
    lines.push('📍 <b>Lokasi:</b> Asia, ' + escapeHtml(locParts.join(', ')));
    if (geo.zip) lines.push('📮 <b>Kode Pos:</b> ' + escapeHtml(geo.zip));
    if (mapLink) lines.push('🗺️ <b>Peta:</b> <a href="' + mapLink + '">Lihat di Google Maps</a>');
    if (geo.isp) lines.push('🏢 <b>ISP:</b> ' + escapeHtml(geo.isp));
    if (geo.timezone) lines.push('🕐 <b>Timezone:</b> ' + escapeHtml(geo.timezone));
    if (geo.isProxy) lines.push('⚠️ <b>PROXY/VPN TERDETEKSI</b>');
    if (geo.isHosting) lines.push('⚠️ <b>HOSTING/DATACENTER</b>');
  } else {
    lines.push('📍 <b>Lokasi:</b> Tidak diketahui');
  }

  if (ua) {
    lines.push('');
    lines.push('📱 <b>UA:</b> <code>' + escapeHtml(ua.slice(0, 130)) + '</code>');
  }

  lines.push('');
  if (isBanned) {
    lines.push('🚫 <b>Status:</b> <b>DIBLOKIR</b>' + (banDuration ? ' (' + escapeHtml(banDuration) + ')' : ''));
  } else {
    lines.push('✅ <b>Status:</b> Terdeteksi (belum diblok)');
  }

  if (extra && extra.identity) {
    lines.push('📋 <b>Detail:</b> ' + escapeHtml(extra.identity));
  }

  if (target) {
    lines.push('');
    lines.push('⚔️ <b>Target:</b> <code>' + escapeHtml(target.slice(0, 200)) + '</code>');
  }

  lines.push('');
  lines.push('🕐 ' + new Date().toISOString().replace('T', ' ').slice(0, 19));

  return lines.join('\n');
}
