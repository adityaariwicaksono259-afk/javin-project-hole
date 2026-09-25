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
  if (isArtiNama(d)) return renderArti(d);
  if (isQuoteList(d)) return renderQuote(d);
  if (isDramaList(d)) return renderDrama(d);
  return '';
}

window.KazeMisc = {
  isArtiNama: isArtiNama,
  isDramaList: isDramaList,
  isQuoteList: isQuoteList,
  render: render
};
console.log('BETOx1: KazeMisc siap');
})();
