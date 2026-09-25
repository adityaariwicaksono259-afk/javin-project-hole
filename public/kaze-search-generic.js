(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

// Deteksi search generic — array of objects dengan url/link/image
function isGenericSearch(d){
  if (!d || typeof d !== 'object') return false;
  if (d.status === false) return false;
  var arr = Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : null);
  if (!arr || arr.length === 0) return false;
  var f = arr[0];
  if (!f || typeof f !== 'object') return false;
  // Punya title + (url atau link)
  return !!(f.title && (f.url || f.link));
}

// Deteksi Mangatoon (data.komik / data.novel)
function isMangatoonList(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || typeof dd !== 'object') return false;
  var hasKomik = Array.isArray(dd.komik) && dd.komik[0] && Array.isArray(dd.komik[0].items) && dd.komik[0].items.length > 0;
  var hasNovel = Array.isArray(dd.novel) && dd.novel[0] && Array.isArray(dd.novel[0].items) && dd.novel[0].items.length > 0;
  return !!(hasKomik || hasNovel);
}

function renderMangatoon(d){
  var dd = d.data || d;
  var komikItems = (dd.komik && dd.komik[0] && dd.komik[0].items) || [];
  var novelItems = (dd.novel && dd.novel[0] && dd.novel[0].items) || [];
  var h = '';

  if (komikItems.length > 0) {
    h += '<div style="font-size:11px;color:#22d3ee;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:10px;padding:6px 2px 0">📚 Komik (' + komikItems.length + ')</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">';
    komikItems.forEach(function(item){
      var title = item.title || 'Untitled';
      var link = item.link || '';
      var img = item.image || '';
      h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:10px;overflow:hidden;display:flex;flex-direction:column">';
      h += '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="display:block;aspect-ratio:2/3;background:#06111f;overflow:hidden;text-decoration:none">';
      if (img) h += '<img src="' + esc(img) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">';
      h += '</a>';
      h += '<div style="padding:8px"><div style="font-size:11px;font-weight:600;color:#e0f2fe;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:28px">' + esc(title) + '</div></div>';
      h += '</div>';
    });
    h += '</div>';
  }

  if (novelItems.length > 0) {
    h += '<div style="font-size:11px;color:#22d3ee;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:10px;padding:6px 2px 0">📖 Novel (' + novelItems.length + ')</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">';
    novelItems.forEach(function(item){
      var title = item.title || 'Untitled';
      var link = item.link || '';
      var img = item.image || '';
      h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:10px;overflow:hidden;display:flex;flex-direction:column">';
      h += '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="display:block;aspect-ratio:2/3;background:#06111f;overflow:hidden;text-decoration:none">';
      if (img) h += '<img src="' + esc(img) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">';
      h += '</a>';
      h += '<div style="padding:8px"><div style="font-size:11px;font-weight:600;color:#e0f2fe;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:28px">' + esc(title) + '</div></div>';
      h += '</div>';
    });
    h += '</div>';
  }

  return h;
}

// Deteksi Lahelu (data.postInfos[])
function isLaheluList(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || typeof dd !== 'object') return false;
  return !!(Array.isArray(dd.postInfos) && dd.postInfos.length > 0 && dd.postInfos[0].title && dd.postInfos[0].postId);
}

function renderLahelu(arr){
  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Lahelu</div>';
  h += '<div style="font-size:11px;color:#64748b">' + arr.length + ' post</div>';
  h += '</div>';

  arr.slice(0, 20).forEach(function(p){
    var title = p.title || '';
    var hashtags = (p.hashtags || []).map(function(h){ return '#' + h; }).join(' ');
    var img = '';
    // Cari gambar dari content
    if (Array.isArray(p.content)) {
      for (var i = 0; i < p.content.length; i++) {
        if (p.content[i].type === 1 && p.content[i].value && /^https?:\/\//.test(p.content[i].value)) {
          img = p.content[i].value; break;
        }
      }
    }
    var postUrl = 'https://lahelu.com/post/' + (p.postId || '');
    var upvotes = p.totalUpvotes || 0;
    var comments = p.totalComments || 0;

    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;margin-bottom:10px;overflow:hidden">';
    if (img) {
      h += '<a href="' + esc(postUrl) + '" target="_blank" rel="noopener" style="display:block;width:100%;max-height:280px;overflow:hidden;background:#06111f">';
      h += '<img src="' + esc(img) + '" loading="lazy" style="width:100%;height:auto;display:block">';
      h += '</a>';
    }
    h += '<div style="padding:10px 12px">';
    if (title) h += '<div style="font-size:12.5px;color:#e0f2fe;line-height:1.5;margin-bottom:6px">' + esc(title.slice(0, 200)) + '</div>';
    if (hashtags) h += '<div style="font-size:10.5px;color:#22d3ee;line-height:1.4;margin-bottom:8px">' + esc(hashtags) + '</div>';
    h += '<div style="display:flex;gap:14px;font-size:11px;color:#64748b">';
    h += '<span>👍 ' + upvotes + '</span>';
    h += '<span>💬 ' + comments + '</span>';
    h += '<a href="' + esc(postUrl) + '" target="_blank" rel="noopener" style="margin-left:auto;color:#22d3ee;text-decoration:none;font-weight:600">Buka →</a>';
    h += '</div></div></div>';
  });

  return h;
}

// Deteksi News List (FF News, detik News)
function isNewsList(d){
  if (!d || typeof d !== 'object') return false;
  if (d.success !== true && d.status !== 'success' && d.status !== 200) return false;
  if (!Array.isArray(d.data) || d.data.length === 0) return false;
  var f = d.data[0];
  return !!(f && f.title && f.url && (f.thumbnail !== undefined || f.category || f.time));
}

function renderNewsList(d){
  var arr = d.data || [];
  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">📰 Berita</div>';
  h += '<div style="font-size:11px;color:#64748b">' + arr.length + ' artikel</div>';
  h += '</div>';

  arr.slice(0, 30).forEach(function(item){
    var title = item.title || 'Untitled';
    var url = item.url || '';
    var img = item.thumbnail || item.image || '';
    var cat = item.category || '';
    var time = item.time || item.date || '';
    var desc = item.description || '';

    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;overflow:hidden;margin-bottom:10px;display:flex;gap:12px;padding:12px">';
    if (img) {
      h += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="width:80px;height:80px;border-radius:8px;overflow:hidden;background:#06111f;flex-shrink:0;display:block">';
      h += '<img src="' + esc(img) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.style.display=\'none\'">';
      h += '</a>';
    }
    h += '<div style="min-width:0;flex:1">';
    if (cat) h += '<div style="font-size:9px;color:#22d3ee;text-transform:uppercase;letter-spacing:.4px;font-weight:700;margin-bottom:4px">' + esc(cat) + '</div>';
    h += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="text-decoration:none">';
    h += '<div style="font-size:12.5px;font-weight:600;color:#e0f2fe;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">' + esc(title) + '</div>';
    h += '</a>';
    if (desc) {
      var clean = String(desc).replace(/<[^>]+>/g, '').slice(0, 100);
      h += '<div style="font-size:11px;color:#94a3b8;line-height:1.4;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(clean) + '</div>';
    }
    if (time) h += '<div style="font-size:10px;color:#64748b;margin-top:6px">🕐 ' + esc(time) + '</div>';
    h += '</div></div>';
  });

  return h;
}

// Deteksi Wink / single image result (resultUrl)
function isWinkResult(d){
  if (!d || typeof d !== 'object') return false;
  return !!(d.resultUrl && d.status === true && /^https?:\/\//.test(d.resultUrl));
}

function renderWinkResult(d){
  var url = d.resultUrl;
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden;margin-bottom:10px">';
  h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(34,211,238,.04);border-bottom:1px solid rgba(34,211,238,.08)">';
  h += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-size:16px;color:#06111f;font-weight:800">✨</div>';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Hasil AI Image</div>';
  h += '</div>';
  h += '<div style="padding:12px">';
  h += '<div style="border-radius:12px;overflow:hidden;background:#06111f">';
  h += '<img src="' + esc(url) + '" style="width:100%;display:block;max-height:500px;object-fit:contain" onerror="this.parentNode.innerHTML=\'<div style=&quot;padding:40px;text-align:center;color:#64748b;font-size:12px&quot;>Gagal load gambar</div>\'">';
  h += '</div>';
  h += '<div style="display:flex;gap:8px;margin-top:12px">';
  h += '<a href="' + esc(url) + '" download target="_blank" rel="noopener" style="flex:1;text-align:center;padding:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);color:#06111f;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none">⬇️ Download</a>';
  h += '<button class="kz-copy-btn" data-copy="' + encodeURIComponent(url) + '" style="padding:10px 14px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);color:#7dd3fc;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Copy URL</button>';
  h += '</div>';
  h += '</div></div>';
  return h;
}

// Deteksi MCPDL (data.results[] dengan highlight.title)
function isMCPDL(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || typeof dd !== 'object') return false;
  if (!Array.isArray(dd.results) || dd.results.length === 0) return false;
  var f = dd.results[0];
  return !!(f.slug && f.highlight && f.highlight.title);
}

function renderMCPDL(d){
  var arr = (d.data && d.data.results) || [];
  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">MCPDL</div>';
  h += '<div style="font-size:11px;color:#64748b">' + arr.length + ' hasil</div>';
  h += '</div>';

  arr.forEach(function(item){
    var title = item.title || 'Untitled';
    var slug = item.slug || '';
    var url = slug ? 'https://mcpedl.org/' + slug + '/' : '';
    var img = item.image || '';
    var desc = item.summary || item.introduction || '';
    var downloads = item.downloadCount || 0;
    var updated = item.updated_at ? new Date(item.updated_at).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '';

    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;gap:12px">';
    if (img) {
      h += '<img src="' + esc(img) + '" style="width:70px;height:70px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#06111f">';
    }
    h += '<div style="min-width:0;flex:1">';
    h += '<div style="font-size:12.5px;font-weight:600;color:#e0f2fe;line-height:1.3">' + esc(title) + '</div>';
    if (desc) {
      var clean = String(desc).replace(/<[^>]+>/g, '').slice(0, 140);
      h += '<div style="font-size:11px;color:#94a3b8;line-height:1.5;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(clean) + '</div>';
    }
    var meta = [];
    if (downloads) meta.push('⬇️ ' + downloads.toLocaleString());
    if (updated) meta.push('🕐 ' + updated);
    if (meta.length) h += '<div style="font-size:10px;color:#64748b;margin-top:6px;display:flex;gap:10px">' + meta.map(function(m){return '<span>' + esc(m) + '</span>'}).join('') + '</div>';
    if (url) h += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;padding:6px 12px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border-radius:8px;color:#06111f;font-size:11px;font-weight:700;text-decoration:none">⬇️ Buka MCPDL</a>';
    h += '</div></div>';
  });
  return h;
}

// Deteksi search dengan "results" (brave, duckduckgo)
function isSearchResults(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || typeof dd !== 'object') return false;
  if (Array.isArray(dd.results) && dd.results.length > 0 && dd.results[0].title) return true;
  if (Array.isArray(dd.data) && dd.data.length > 0 && dd.data[0].title && dd.data[0].url) return true;
  return false;
}

// Deteksi sound effect (my instants)
function isSoundList(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  return !!(dd && dd.sounds && Array.isArray(dd.sounds) && dd.sounds.length > 0);
}

// Deteksi image array (bing, google)
function isImageArray(d){
  if (!d || typeof d !== 'object') return false;
  if (d.status === false) return false;
  var arr = Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : null);
  if (!arr || arr.length === 0) return false;
  return typeof arr[0] === 'string' && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)/i.test(arr[0]);
}

function renderImageGrid(arr){
  var h = '<div class="result-card"><div class="result-title">Hasil Gambar (' + arr.length + ')</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px 0">';
  arr.slice(0, 30).forEach(function(url){
    h += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="display:block;aspect-ratio:1;border-radius:8px;overflow:hidden;background:#06111f">';
    h += '<img src="' + esc(url) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover">';
    h += '</a>';
  });
  h += '</div></div>';
  return h;
}

function renderSearchList(arr, source){
  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">' + esc(source || 'Search') + '</div>';
  h += '<div style="font-size:11px;color:#64748b;font-family:ui-monospace,monospace">' + arr.length + ' hasil</div>';
  h += '</div>';

  arr.forEach(function(item){
    var title = item.title || item.name || 'Untitled';
    var url = item.url || item.link || item.displayUrl || '';
    // Brave: url di imageUrl, gak ada page URL
    if (!url && item.imageUrl) url = '';
    var image = item.image || item.thumbnail || item.imageUrl || item.img || '';
    var desc = item.description || item.snippet || item.desc || item.content || '';
    var author = item.author || item.channel || item.user || item.postedBy || '';
    var date = item.published || item.date || item.ago || '';
    var views = item.views || item.views_count || '';
    var meta = item.source || '';

    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;gap:12px">';
    if (image) {
      h += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="width:70px;height:70px;border-radius:8px;overflow:hidden;background:#06111f;flex-shrink:0;display:block">';
      h += '<img src="' + esc(image) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover">';
      h += '</a>';
    }
    h += '<div style="min-width:0;flex:1">';
    h += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="text-decoration:none">';
    h += '<div style="font-size:12.5px;font-weight:600;color:#e0f2fe;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(title) + '</div>';
    h += '</a>';
    if (desc) {
      var cleanDesc = String(desc).replace(/<[^>]+>/g, '').slice(0, 140);
      h += '<div style="font-size:11px;color:#94a3b8;line-height:1.5;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(cleanDesc) + '</div>';
    }
    var metaRow = [];
    if (author) metaRow.push('👤 ' + author);
    if (meta) metaRow.push('🌐 ' + meta);
    if (views) metaRow.push('👁 ' + views);
    if (date) metaRow.push('🕐 ' + date);
    if (metaRow.length) h += '<div style="font-size:10px;color:#64748b;margin-top:6px;display:flex;flex-wrap:wrap;gap:8px">' + metaRow.map(function(m){return '<span>' + esc(m) + '</span>'}).join('') + '</div>';
    h += '</div></div>';
  });
  return h;
}

function renderSoundList(arr){
  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Sound Effect</div>';
  h += '<div style="font-size:11px;color:#64748b">' + arr.length + ' sound</div>';
  h += '</div>';

  arr.forEach(function(s, i){
    var title = s.title || s.name || 'Sound';
    var url = s.url || s.audio || s.shareUrl || '';
    var img = s.image || s.thumbnail || '';
    var uid = 'sf-' + i + '-' + Math.random().toString(36).slice(2, 7);

    h += '<div id="' + uid + '" style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;gap:12px;align-items:center">';
    if (img) {
      h += '<img src="' + esc(img) + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#06111f">';
    } else {
      h += '<div style="width:48px;height:48px;border-radius:8px;background:rgba(34,211,238,.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#22d3ee;font-size:20px">🔊</div>';
    }
    h += '<div style="min-width:0;flex:1">';
    h += '<div style="font-size:12.5px;font-weight:600;color:#e0f2fe;line-height:1.3">' + esc(title) + '</div>';
    h += '</div>';
    if (url) {
      h += '<button class="kz-audio-btn" data-src="' + esc(url) + '" data-target="' + uid + '-audio" style="padding:8px 14px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border:0;border-radius:8px;color:#06111f;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">▶</button>';
    }
    h += '</div>';
    h += '<div id="' + uid + '-audio" style="display:none;margin-bottom:8px"></div>';
  });

  return h;
}

// Audio player
document.addEventListener('click', function(e){
  var b = e.target.closest('.kz-audio-btn');
  if (!b) return;
  var targetId = b.getAttribute('data-target');
  var src = b.getAttribute('data-src');
  if (!targetId || !src) return;
  var el = document.getElementById(targetId);
  if (!el) return;
  if (el.style.display === 'none') {
    el.innerHTML = '<audio controls autoplay style="width:100%;padding:0 12px" src="' + src + '"></audio>';
    el.style.display = 'block';
    b.textContent = '■';
  } else {
    el.innerHTML = '';
    el.style.display = 'none';
    b.textContent = '▶';
  }
});

function render(d){
  if (isImageArray(d)) {
    var arr = Array.isArray(d) ? d : d.data;
    return renderImageGrid(arr);
  }
  if (isSoundList(d)) {
    return renderSoundList(d.data.sounds);
  }
  if (isLaheluList(d)) {
    var dd = d.data || d;
    return renderLahelu(dd.postInfos);
  }
  if (isMangatoonList(d)) {
    return renderMangatoon(d);
  }
  if (isMCPDL(d)) {
    return renderMCPDL(d);
  }
  if (isNewsList(d)) {
    return renderNewsList(d);
  }
  if (isWinkResult(d)) {
    return renderWinkResult(d);
  }
  if (isSearchResults(d)) {
    var dd = d.data || d;
    return renderSearchList(dd.results || dd.data, dd.query || dd.source || 'Search');
  }
  if (isGenericSearch(d)) {
    var arr2 = Array.isArray(d) ? d : d.data;
    return renderSearchList(arr2, d.source || 'Search');
  }
  return '';
}

window.KazeSearchGeneric = {
  isGenericSearch: isGenericSearch,
  isSearchResults: isSearchResults,
  isSoundList: isSoundList,
  isImageArray: isImageArray,
  isLaheluList: isLaheluList,
  isMangatoonList: isMangatoonList,
  isMCPDL: isMCPDL,
  isNewsList: isNewsList,
  isWinkResult: isWinkResult,
  render: render
};
console.log('BETOx1: KazeSearchGeneric siap');
})();
