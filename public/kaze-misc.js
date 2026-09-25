(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

// Arti nama
function isArtiNama(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  return !!(dd && dd.nama && dd.arti && typeof dd.arti === 'string');
}

// Drama list (dramabox, reelshort)
function isDramaList(d){
  if (!d || typeof d !== 'object') return false;
  // Handle service dramabox / reelshort (langsung)
  if (d.service === 'dramabox' || d.service === 'reelshort') return true;
  var arr = d.books || d.data;
  if (!Array.isArray(arr) || arr.length === 0) return false;
  var f = arr[0];
  return !!(f && f.title && f.cover && (f.category || f.intro || f.chapterCount));
}

// Quotes (otakotaku)
// Deteksi Translate
function isTranslate(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  return !!(dd && typeof dd.translatedText === 'string' && dd.translatedText.length > 0 && !dd.name);
}

function renderTranslate(d){
  var dd = d.data || d;
  var txt = dd.translatedText || '';
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden">';
  h += '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(34,211,238,.04);border-bottom:1px solid rgba(34,211,238,.08)">';
  h += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-size:16px;color:#06111f;font-weight:800">文</div>';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Hasil Terjemahan</div>';
  h += '</div>';
  h += '<div style="padding:16px">';
  h += '<div style="font-size:15px;color:#e0f2fe;line-height:1.7;font-weight:500">' + esc(txt) + '</div>';
  h += '</div>';
  h += '<div style="padding:10px 16px;border-top:1px solid rgba(34,211,238,.06);background:rgba(0,0,0,.15)">';
  h += '<button class="kz-copy-btn" data-copy="' + encodeURIComponent(txt) + '" style="padding:7px 14px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);color:#7dd3fc;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Copy</button>';
  h += '</div></div>';
  return h;
}

// Deteksi Country Info
function isCountryInfo(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  return !!(dd && dd.name && dd.capital && dd.flag && dd.phoneCode);
}

function renderCountry(d){
  var dd = d.data || d;
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden;margin-bottom:12px">';

  // Header dengan flag
  h += '<div style="display:flex;align-items:center;gap:14px;padding:16px;background:linear-gradient(135deg,rgba(34,211,238,.08),rgba(14,165,233,.04));border-bottom:1px solid rgba(34,211,238,.1)">';
  if (dd.flag) {
    h += '<img src="' + esc(dd.flag) + '" style="width:64px;height:auto;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.3)">';
  }
  h += '<div>';
  h += '<div style="font-size:18px;font-weight:700;color:#e0f2fe">' + esc(dd.name) + '</div>';
  if (dd.continent && dd.continent.name) {
    h += '<div style="font-size:12px;color:#94a3b8;margin-top:4px">' + esc(dd.continent.emoji || '') + ' ' + esc(dd.continent.name) + '</div>';
  }
  h += '</div></div>';

  h += '<div style="padding:16px">';
  var rows = [];
  if (dd.capital) rows.push({label:'🏛️ Ibu Kota', val: dd.capital});
  if (dd.phoneCode) rows.push({label:'📞 Kode Telp', val: dd.phoneCode});
  if (dd.area && dd.area.squareKilometers) rows.push({label:'📐 Luas', val: dd.area.squareKilometers.toLocaleString() + ' km²'});
  if (dd.coordinates) rows.push({label:'📍 Koordinat', val: dd.coordinates.latitude + ', ' + dd.coordinates.longitude});

  rows.forEach(function(r){
    h += '<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(34,211,238,.08)">';
    h += '<div style="font-size:12px;color:#94a3b8">' + r.label + '</div>';
    h += '<div style="font-size:12px;color:#e0f2fe;font-weight:600;text-align:right;word-break:break-word">' + esc(String(r.val)) + '</div>';
    h += '</div>';
  });

  // Languages
  if (dd.languages && dd.languages.native && dd.languages.native.length) {
    h += '<div style="margin-top:12px"><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:6px">Bahasa</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:5px">';
    dd.languages.native.forEach(function(l){
      h += '<span style="padding:3px 9px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.2);border-radius:6px;color:#7dd3fc;font-size:11px;font-weight:500">' + esc(l) + '</span>';
    });
    h += '</div></div>';
  }

  // Famous
  if (dd.famousFor) {
    h += '<div style="margin-top:12px;padding:10px 12px;background:rgba(34,211,238,.05);border-radius:8px"><div style="font-size:10px;color:#22d3ee;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:4px">Terkenal dengan</div><div style="font-size:12px;color:#cbd5e1;line-height:1.5">' + esc(dd.famousFor) + '</div></div>';
  }

  h += '</div>';

  if (dd.googleMapsLink) {
    h += '<div style="padding:10px 16px;border-top:1px solid rgba(34,211,238,.06)">';
    h += '<a href="' + esc(dd.googleMapsLink) + '" target="_blank" rel="noopener" style="display:block;padding:10px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);border-radius:8px;color:#22d3ee;text-align:center;font-size:12px;font-weight:600;text-decoration:none">🗺️ Buka di Google Maps</a>';
    h += '</div>';
  }

  h += '</div>';
  return h;
}

// Deteksi Kodepos
function isKodepos(d){
  if (!d || typeof d !== 'object') return false;
  if (!Array.isArray(d.data) || d.data.length === 0) return false;
  var f = d.data[0];
  return !!(f && f.kodepos && f.kota && f.provinsi);
}

function renderKodepos(d){
  var arr = d.data || [];
  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">📮 Kode Pos</div>';
  h += '<div style="font-size:11px;color:#64748b">' + arr.length + ' hasil</div>';
  h += '</div>';

  arr.forEach(function(item){
    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:12px;padding:12px 14px;margin-bottom:8px">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += '<div style="font-family:ui-monospace,monospace;font-size:15px;font-weight:700;color:#22d3ee;letter-spacing:.5px">' + esc(item.kodepos) + '</div>';
    h += '</div>';
    h += '<div style="font-size:12px;color:#e0f2fe;line-height:1.5">' + esc(item.desa) + '</div>';
    h += '<div style="font-size:11px;color:#94a3b8;margin-top:3px">' + esc(item.kecamatan) + '</div>';
    h += '<div style="font-size:10.5px;color:#64748b;margin-top:3px">' + esc(item.kota) + ' · ' + esc(item.provinsi) + '</div>';
    h += '</div>';
  });
  return h;
}

// Deteksi ramalan jodoh
function isRamalanJodoh(d){
  if (!d || typeof d !== 'object') return false;
  if (!d.status || !d.data) return false;
  var dd = d.data;
  return !!(dd.result && dd.result.orang_pertama && dd.result.orang_kedua && dd.result.hasil_ramalan);
}

function renderRamalan(d){
  var dd = d.data.result;
  var p1 = dd.orang_pertama || {};
  var p2 = dd.orang_kedua || {};
  var list = dd.hasil_ramalan || [];
  var desc = dd.deskripsi || '';

  var h = '';
  // Header
  h += '<div style="background:linear-gradient(135deg,rgba(236,72,153,.15),rgba(168,85,247,.1));border:1px solid rgba(236,72,153,.3);border-radius:16px;padding:18px;margin-bottom:14px">';
  h += '<div style="text-align:center;font-size:26px;margin-bottom:12px">💕</div>';
  h += '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center">';
  h += '<div style="text-align:center"><div style="font-size:14px;font-weight:700;color:#f9a8d4">' + esc(p1.nama || '-') + '</div>';
  if (p1.tanggal_lahir) h += '<div style="font-size:10px;color:#94a3b8;margin-top:4px;line-height:1.4">' + esc(p1.tanggal_lahir) + '</div>';
  h += '</div>';
  h += '<div style="font-size:24px">💞</div>';
  h += '<div style="text-align:center"><div style="font-size:14px;font-weight:700;color:#f9a8d4">' + esc(p2.nama || '-') + '</div>';
  if (p2.tanggal_lahir) h += '<div style="font-size:10px;color:#94a3b8;margin-top:4px;line-height:1.4">' + esc(p2.tanggal_lahir) + '</div>';
  h += '</div>';
  h += '</div></div>';

  // Hasil
  if (list.length) {
    h += '<div style="font-size:11px;color:#f472b6;text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:10px">Hasil Ramalan</div>';
    list.forEach(function(r, i){
      var txt = String(r);
      // Highlight kategori kaya "Gonto", "Lungguh"
      h += '<div style="background:#0a1929;border:1px solid rgba(236,72,153,.15);border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;gap:10px">';
      h += '<div style="width:22px;height:22px;border-radius:50%;background:rgba(236,72,153,.15);color:#f472b6;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + (i+1) + '</div>';
      h += '<div style="font-size:12px;color:#cbd5e1;line-height:1.55">' + esc(txt) + '</div>';
      h += '</div>';
    });
  }

  // Deskripsi
  if (desc) {
    h += '<div style="font-size:11px;color:#64748b;font-style:italic;margin-top:10px;line-height:1.5;padding:10px 12px;background:rgba(0,0,0,.2);border-radius:8px">' + esc(desc) + '</div>';
  }

  return h;
}

function isQuoteList(d){
  if (!d || typeof d !== 'object') return false;
  if (!Array.isArray(d.data) || d.data.length === 0) return false;
  var f = d.data[0];
  return !!(f && f.quotes && (f.karakter || f.anime));
}

function renderArti(d){
  var dd = d.data || d;
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden">';
  h += '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(34,211,238,.04);border-bottom:1px solid rgba(34,211,238,.08)">';
  h += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-size:14px;color:#06111f;font-weight:800">Aa</div>';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Arti Nama</div>';
  h += '</div>';
  h += '<div style="padding:16px">';
  h += '<div style="font-size:22px;font-weight:700;color:#22d3ee;text-transform:capitalize;margin-bottom:12px">' + esc(dd.nama) + '</div>';
  h += '<div style="font-size:13px;color:#cbd5e1;line-height:1.7;white-space:pre-wrap">' + esc(dd.arti) + '</div>';
  h += '</div></div>';
  return h;
}

function renderDramaCard(item){
  var title = item.title || 'Untitled';
  var cover = item.cover || item.thumbnail || '';
  var url = item.url || item.link || '';
  var category = item.category || '';
  var views = item.views || '';
  var chapterCount = item.chapterCount || '';
  var score = item.score || '';

  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;overflow:hidden;display:flex;flex-direction:column">';
  h += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="display:block;position:relative;aspect-ratio:2/3;background:#06111f;overflow:hidden;text-decoration:none">';
  if (cover) h += '<img src="' + esc(cover) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">';
  if (score) h += '<div style="position:absolute;top:6px;right:6px;background:rgba(251,191,36,.9);padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700;color:#06111f">★ ' + esc(score) + '</div>';
  h += '</a>';
  h += '<div style="padding:8px;display:flex;flex-direction:column;gap:5px;flex:1">';
  h += '<div style="font-size:11.5px;font-weight:600;color:#e0f2fe;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:30px">' + esc(title) + '</div>';
  var meta = [];
  if (category) meta.push(category);
  if (chapterCount) meta.push(chapterCount + ' eps');
  if (meta.length) h += '<div style="font-size:9.5px;color:#64748b">' + esc(meta.join(' · ')) + '</div>';
  if (views) h += '<div style="font-size:9.5px;color:#64748b">👁 ' + esc(views) + '</div>';
  h += '</div></div>';
  return h;
}

function renderDrama(d){
  var arr = d.books || d.data || [];
  var similar = d.similar || [];
  var keyword = d.keyword || '';
  var total = d.total || 0;
  var h = '';

  // Kalau hasil kosong tapi ada similar
  if (arr.length === 0 && similar.length > 0) {
    h += '<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:12px;padding:14px 16px;margin-bottom:14px">';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
    h += '<div style="font-size:18px">💡</div>';
    h += '<div style="font-size:13px;font-weight:700;color:#fbbf24">Tidak ada hasil untuk "' + esc(keyword) + '"</div>';
    h += '</div>';
    h += '<div style="font-size:11px;color:#fcd34d;line-height:1.6">Coba kata kunci lain atau lihat rekomendasi di bawah.</div>';
    h += '</div>';

    h += '<div style="font-size:11px;color:#22d3ee;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;font-weight:700">✨ Mungkin Kamu Suka</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">';
    similar.slice(0, 20).forEach(function(item){ h += renderDramaCard(item); });
    h += '</div>';
    return h;
  }

  // Kalau ada hasil utama
  if (arr.length > 0) {
    h += '<div style="font-size:11px;color:#22d3ee;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;font-weight:700">Hasil (' + arr.length + ')</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">';
    arr.slice(0, 20).forEach(function(item){ h += renderDramaCard(item); });
    h += '</div>';
  }

  // Similar sebagai tambahan
  if (similar.length > 0 && arr.length > 0) {
    h += '<div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;font-weight:700">Mungkin Kamu Suka Juga</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">';
    similar.slice(0, 12).forEach(function(item){ h += renderDramaCard(item); });
    h += '</div>';
  }

  if (arr.length === 0 && similar.length === 0) {
    h += '<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:16px;text-align:center">';
    h += '<div style="font-size:20px;margin-bottom:8px">🔍</div>';
    h += '<div style="font-size:13px;font-weight:600;color:#f87171">Tidak ada hasil</div>';
    h += '<div style="font-size:11px;color:#94a3b8;margin-top:6px">Coba kata kunci lain</div>';
    h += '</div>';
  }

  return h;
}

function renderQuote(d){
  var arr = d.data || [];
  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Anime Quotes</div>';
  h += '<div style="font-size:11px;color:#64748b">' + arr.length + ' quote</div>';
  h += '</div>';
  arr.forEach(function(q){
    var text = q.quotes || '';
    var char = q.karakter || '';
    var anime = q.anime || '';
    var img = q.gambar || '';
    var ep = q.episode || '';
    var link = q.link || '';
    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:14px;padding:14px;margin-bottom:10px;display:flex;gap:12px">';
    if (img) {
      h += '<img src="' + esc(img) + '" style="width:60px;height:80px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#06111f">';
    }
    h += '<div style="flex:1;min-width:0">';
    h += '<div style="font-size:13px;color:#e0f2fe;line-height:1.6;font-style:italic;margin-bottom:10px">"' + esc(text) + '"</div>';
    h += '<div style="font-size:11px;color:#22d3ee;font-weight:600">— ' + esc(char) + '</div>';
    h += '<div style="font-size:10px;color:#64748b;margin-top:3px">' + esc(anime) + (ep ? ' · ' + esc(ep) : '') + '</div>';
    if (link) {
      h += '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:10px;color:#22d3ee;text-decoration:none">Buka →</a>';
    }
    h += '</div></div>';
  });
  return h;
}

function render(d){
  if (isTranslate(d)) return renderTranslate(d);
  if (isCountryInfo(d)) return renderCountry(d);
  if (isKodepos(d)) return renderKodepos(d);
  if (isArtiNama(d)) return renderArti(d);
  if (isRamalanJodoh(d)) return renderRamalan(d);
  if (isQuoteList(d)) return renderQuote(d);
  if (isDramaList(d)) return renderDrama(d);
  return '';
}

window.KazeMisc = {
  isArtiNama: isArtiNama,
  isDramaList: isDramaList,
  isQuoteList: isQuoteList,
  isRamalanJodoh: isRamalanJodoh,
  isTranslate: isTranslate,
  isCountryInfo: isCountryInfo,
  isKodepos: isKodepos,
  render: render
};
console.log('BETOx1: KazeMisc siap');
})();
