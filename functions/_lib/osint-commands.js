// ===== OSINT Commands untuk Bot Telegram =====
// Semua pakai API gratis, no-key, legal.

function esc(s) {
  return String(s || '').replace(/[&<>]/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
  });
}

function fmt(label, value) {
  if (value === null || value === undefined || value === '') value = '-';
  return '• <b>' + esc(label) + ':</b> <code>' + esc(value) + '</code>\n';
}

function flag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint.apply(null, code.toUpperCase().split('').map(function(c) {
    return 127397 + c.charCodeAt(0);
  }));
}

// ===== [1] /ip =====
export async function cmdOsintIp(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/ip &lt;ip-atau-domain&gt;</code>'); return; }
  try {
    const fields = 'status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query';
    const url = 'http://ip-api.com/json/' + encodeURIComponent(target) + '?fields=' + fields;
    const d = await (await fetch(url)).json();
    if (d.status !== 'success') { await reply(env, chatId, '❌ Gagal: ' + esc(d.message || 'unknown')); return; }
    let h = '🌐 <b>IP LOOKUP</b>\n\n';
    h += fmt('IP', d.query);
    h += fmt('Reverse DNS', d.reverse);
    h += fmt('Negara', flag(d.countryCode) + ' ' + d.country + ' (' + d.countryCode + ')');
    h += fmt('Region', d.regionName + ' · ' + d.region);
    h += fmt('Kota', d.city + (d.district ? ' · ' + d.district : ''));
    h += fmt('Kode Pos', d.zip);
    h += fmt('Koordinat', d.lat + ', ' + d.lon);
    h += fmt('Timezone', d.timezone + ' UTC' + (d.offset >= 0 ? '+' : '') + (d.offset / 3600));
    h += fmt('ISP', d.isp);
    h += fmt('Organisasi', d.org);
    h += fmt('AS', d.as);
    h += fmt('Mobile', d.mobile ? '✓ Ya' : '✗ Tidak');
    h += fmt('Proxy/VPN', d.proxy ? '⚠ Ya' : '✓ Tidak');
    h += fmt('Hosting', d.hosting ? '⚠ Ya' : '✓ Tidak');
    await reply(env, chatId, h);
  } catch(e) { await reply(env, chatId, '❌ Error: ' + esc(e.message)); }
}

// ===== [2] /ipinfo =====
export async function cmdOsintIpInfo(env, chatId, args, reply) {
  await cmdOsintIp(env, chatId, '', reply);
}

// ===== [3] /dns =====
export async function cmdOsintDns(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/dns &lt;domain&gt;</code>'); return; }
  try {
    const types = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME'];
    let h = '🔍 <b>DNS LOOKUP</b>\n<code>' + esc(target) + '</code>\n\n';
    let found = false;
    for (const t of types) {
      try {
        const res = await fetch('https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(target) + '&type=' + t, { headers: { 'Accept': 'application/dns-json' } });
        const d = await res.json();
        if (d.Answer && d.Answer.length) {
          found = true;
          h += '<b>── ' + t + ' ──</b>\n';
          d.Answer.slice(0, 5).forEach(function(a) {
            h += '<code>' + esc(String(a.data).slice(0, 100)) + '</code>\n';
          });
          if (d.Answer.length > 5) h += '<i>...+' + (d.Answer.length - 5) + ' lagi</i>\n';
          h += '\n';
        }
      } catch(e) {}
    }
    if (!found) h += '<i>Tidak ada record ditemukan.</i>';
    if (h.length > 4000) h = h.slice(0, 3990) + '\n<i>...truncated</i>';
    await reply(env, chatId, h);
  } catch(e) { await reply(env, chatId, '❌ Error: ' + esc(e.message)); }
}

// ===== [4] /reverse =====
export async function cmdOsintReverse(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/reverse &lt;ip&gt;</code>'); return; }
  try {
    const res = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(target) + '&type=PTR');
    const d = await res.json();
    let h = '🔍 <b>REVERSE DNS</b>\n\n';
    h += fmt('IP', target);
    if (d.Answer && d.Answer.length) {
      h += fmt('Domain', d.Answer[0].data);
    } else {
      h += '<i>Tidak ada reverse DNS.</i>';
    }
    await reply(env, chatId, h);
  } catch(e) { await reply(env, chatId, '❌ Error: ' + esc(e.message)); }
}

// ===== [5] /whois =====
export async function cmdOsintWhois(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/whois &lt;domain&gt;</code>'); return; }
  try {
    const res = await fetch('https://api.whoisjson.com/v1/whois?domain=' + encodeURIComponent(target));
    const d = await res.json();
    const w = d.whois || d;
    let h = '🔍 <b>WHOIS</b>\n<code>' + esc(target) + '</code>\n\n';
    h += fmt('Domain', w.domain_name || target);
    h += fmt('Registrar', w.registrar || w.registrar_name || '-');
    h += fmt('Dibuat', w.creation_date || w.created);
    h += fmt('Expired', w.expiration_date || w.expires);
    h += fmt('Update', w.updated_date || w.updated);
    if (w.name_servers) {
      const ns = Array.isArray(w.name_servers) ? w.name_servers.slice(0, 3).join(', ') : w.name_servers;
      h += fmt('NS', ns);
    }
    await reply(env, chatId, h);
  } catch(e) {
    await reply(env, chatId, '⚠️ WHOIS API limit. Coba lagi nanti.\n\nAlternatif: https://who.is/whois/' + esc(target));
  }
}

// ===== [6] /subdomain =====
export async function cmdOsintSubdomain(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/subdomain &lt;domain&gt;</code>'); return; }
  try {
    const res = await fetch('https://crt.sh/?q=%25.' + encodeURIComponent(target) + '&output=json');
    const data = await res.json();
    const set = new Set();
    data.forEach(function(d) {
      (d.name_value || '').split('\n').forEach(function(n) {
        n = n.trim();
        if (n && n.indexOf('*') === -1 && n.indexOf(target) !== -1) set.add(n);
      });
    });
    const list = Array.from(set).sort();
    let h = '🌳 <b>SUBDOMAIN ENUM</b>\n<code>' + esc(target) + '</code>\n\n';
    h += '<b>Total:</b> ' + list.length + '\n\n';
    list.slice(0, 30).forEach(function(s) { h += '<code>' + esc(s) + '</code>\n'; });
    if (list.length > 30) h += '\n<i>...+' + (list.length - 30) + ' lagi</i>';
    if (!list.length) h += '<i>Tidak ada subdomain ditemukan.</i>';
    await reply(env, chatId, h);
  } catch(e) { await reply(env, chatId, '❌ Error: ' + esc(e.message)); }
}

// ===== [7] /cve =====
export async function cmdOsintCve(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/cve &lt;keyword&gt;</code>'); return; }
  try {
    const res = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=' + encodeURIComponent(target) + '&resultsPerPage=5');
    const d = await res.json();
    if (!d.vulnerabilities || !d.vulnerabilities.length) {
      await reply(env, chatId, '🔍 <b>CVE FINDER</b>\n\nTidak ada CVE untuk: <code>' + esc(target) + '</code>');
      return;
    }
    let h = '⚠️ <b>CVE FINDER</b>\n<code>' + esc(target) + '</code>\n';
    h += '<b>Total:</b> ' + d.totalResults + '\n\n';
    d.vulnerabilities.slice(0, 5).forEach(function(v) {
      const c = v.cve;
      const desc = (c.descriptions.find(function(x) { return x.lang === 'en'; }) || {}).value || '';
      let sev = 'N/A';
      try {
        if (c.metrics && c.metrics.cvssMetricV31 && c.metrics.cvssMetricV31[0]) sev = c.metrics.cvssMetricV31[0].cvssData.baseSeverity;
      } catch(e) {}
      h += '<b>' + esc(c.id) + '</b> [' + sev + ']\n';
      h += esc(desc.slice(0, 150)) + (desc.length > 150 ? '...' : '') + '\n\n';
    });
    await reply(env, chatId, h);
  } catch(e) { await reply(env, chatId, '❌ Error: ' + esc(e.message)); }
}

// ===== [8] /headers =====
export async function cmdOsintHeaders(env, chatId, args, reply) {
  let target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/headers &lt;url&gt;</code>'); return; }
  if (target.indexOf('http') !== 0) target = 'https://' + target;
  try {
    const res = await fetch(target, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
    let h = '📡 <b>HTTP HEADERS</b>\n<code>' + esc(target) + '</code>\n\n';
    h += fmt('Status', res.status + ' ' + res.statusText);
    h += '\n<b>── Security Headers ──</b>\n';
    const sec = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
    sec.forEach(function(k) {
      const v = res.headers.get(k);
      h += (v ? '✅' : '❌') + ' <b>' + k + '</b>\n';
      if (v) h += '<code>' + esc(v.slice(0, 80)) + '</code>\n';
    });
    await reply(env, chatId, h);
  } catch(e) { await reply(env, chatId, '❌ Gagal fetch: ' + esc(e.message)); }
}

// ===== [9] /ssl =====
export async function cmdOsintSsl(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/ssl &lt;domain&gt;</code>'); return; }
  try {
    const res = await fetch('https://ssl-checker.io/api/v1/check/' + encodeURIComponent(target));
    const d = await res.json();
    let h = '🔐 <b>SSL CHECK</b>\n<code>' + esc(target) + '</code>\n\n';
    h += fmt('Issuer', d.issuer || d.issuer_o);
    h += fmt('Valid From', d.valid_from);
    h += fmt('Valid To', d.valid_to);
    h += fmt('Days Left', d.days_remaining);
    h += fmt('Protokol', d.protocol);
    await reply(env, chatId, h);
  } catch(e) {
    await reply(env, chatId, '⚠️ SSL API tidak tersedia.\n\nAlternatif: https://www.ssllabs.com/ssltest/analyze.html?d=' + esc(target));
  }
}

// ===== [10] /phone =====
export async function cmdOsintPhone(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/phone &lt;nomor&gt;</code>'); return; }
  const c = target.replace(/[\s\-()]/g, '');
  const isIntl = /^\+\d{10,15}$/.test(c);
  const isIndo = /^(\+62|62|0)8\d{7,12}$/.test(c);
  let h = '📱 <b>PHONE VALIDATOR</b>\n<code>' + esc(target) + '</code>\n\n';
  h += fmt('Format', isIntl ? 'Valid internasional' : (isIndo ? 'Valid Indonesia' : 'Format tidak dikenali'));
  h += fmt('Panjang', c.length + ' digit');
  if (isIndo) h += fmt('Negara', '🇮🇩 Indonesia (+62)');
  h += '\n<i>Catatan: Cuma validasi FORMAT, bukan pemilik nomor.</i>';
  await reply(env, chatId, h);
}

// ===== [11] /qr =====
export async function cmdOsintQr(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/qr &lt;teks&gt;</code>'); return; }
  const url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(target);
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', new Blob([buf], { type: 'image/png' }), 'qr.png');
    form.append('caption', '📷 QR Code: <code>' + esc(target.slice(0, 50)) + '</code>');
    form.append('parse_mode', 'HTML');
    await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendPhoto', { method: 'POST', body: form });
  } catch(e) {
    await reply(env, chatId, '📷 QR: <a href="' + url + '">Klik untuk lihat</a>');
  }
}

// ===== [12] /hash =====
export async function cmdOsintHash(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/hash &lt;teks&gt;</code>'); return; }
  try {
    const enc = new TextEncoder().encode(target);
    let h = '🔐 <b>HASH GENERATOR</b>\n\n';
    for (const a of ['SHA-1', 'SHA-256', 'SHA-512']) {
      const buf = await crypto.subtle.digest(a, enc);
      const hex = Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
      h += '<b>' + a + ':</b>\n<code>' + hex + '</code>\n\n';
    }
    await reply(env, chatId, h);
  } catch(e) { await reply(env, chatId, '❌ Error: ' + esc(e.message)); }
}

// ===== [13] /password =====
export async function cmdOsintPassword(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/password &lt;teks&gt;</code>'); return; }
  let score = 0;
  const checks = [];
  if (target.length >= 12) { score++; checks.push('✅ ≥ 12 karakter'); } else { checks.push('❌ < 12 karakter'); }
  if (/[a-z]/.test(target)) { score++; checks.push('✅ Huruf kecil'); } else { checks.push('❌ Tidak ada huruf kecil'); }
  if (/[A-Z]/.test(target)) { score++; checks.push('✅ Huruf besar'); } else { checks.push('❌ Tidak ada huruf besar'); }
  if (/[0-9]/.test(target)) { score++; checks.push('✅ Angka'); } else { checks.push('❌ Tidak ada angka'); }
  if (/[^a-zA-Z0-9]/.test(target)) { score++; checks.push('✅ Simbol'); } else { checks.push('❌ Tidak ada simbol'); }
  const labels = ['❌ Sangat Lemah', '⚠️ Lemah', '⚠️ Sedang', '✅ Kuat', '✅ Sangat Kuat', '🏆 Luar Biasa'];
  let h = '🔒 <b>PASSWORD STRENGTH</b>\n\n';
  checks.forEach(function(c) { h += c + '\n'; });
  h += '\n<b>Skor:</b> ' + (labels[score] || 'Tidak Valid');
  await reply(env, chatId, h);
}

// ===== [14] /username =====
export async function cmdOsintUsername(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/username &lt;username&gt;</code>'); return; }
  const sites = [
    ['GitHub', 'https://github.com/' + target],
    ['Instagram', 'https://instagram.com/' + target],
    ['Twitter/X', 'https://x.com/' + target],
    ['TikTok', 'https://tiktok.com/@' + target],
    ['Reddit', 'https://reddit.com/user/' + target],
    ['YouTube', 'https://youtube.com/@' + target],
    ['Pinterest', 'https://pinterest.com/' + target],
    ['Medium', 'https://medium.com/@' + target],
    ['Dev.to', 'https://dev.to/' + target],
    ['GitLab', 'https://gitlab.com/' + target]
  ];
  let h = '👤 <b>USERNAME SEARCH</b>\n<code>' + esc(target) + '</code>\n\n';
  sites.forEach(function(s) { h += '• <a href="' + s[1] + '">' + s[0] + '</a>\n'; });
  await reply(env, chatId, h);
}

// ===== [15] /portscan =====
export async function cmdOsintPortscan(env, chatId, args, reply) {
  const target = (args || '').trim();
  if (!target) { await reply(env, chatId, '❓ Format: <code>/portscan &lt;ip-atau-domain&gt;</code>\n⚠️ Cuma scan IP sendiri!'); return; }
  const ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 5432, 6379, 8080, 8443];
  let h = '🔌 <b>PORT SCAN</b>\n<code>' + esc(target) + '</code>\n\n';
  let openCount = 0;
  for (const p of ports) {
    try {
      const res = await fetch('https://' + target + ':' + p, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(2000) });
      h += '✅ <b>' + p + '</b> — OPEN\n';
      openCount++;
    } catch(e) {
      // closed atau timeout
    }
  }
  if (openCount === 0) {
    h += '<i>Tidak ada port umum yang terdeteksi terbuka (via browser).</i>\n\n';
    h += '<i>Catatan: scan port dari browser terbatas. Untuk hasil akurat, pakai nmap di Termux.</i>';
  }
  h += '\n\n⚠️ <i>Hanya scan IP/domain milik sendiri!</i>';
  await reply(env, chatId, h);
}
