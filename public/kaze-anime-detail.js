(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

// Deteksi anime detail (single object dengan title + thumbnail + rating/description)
function isAnimeDetail(d){
  if (!d || typeof d !== 'object') return false;
  if (!d.status || !d.data) return false;
  var dd = d.data;
  if (Array.isArray(dd)) return false;
  return !!(dd.title && dd.thumbnail && (dd.description || dd.rating || dd.episodes));
}

function renderAnimeDetail(d){
  var dd = d.data;
  var title = dd.title || 'Unknown';
  var thumb = dd.thumbnail || '';
  var rating = dd.rating || '';
  var desc = dd.description || '';
  var genres = dd.genres || [];
  var episodes = dd.episodes || [];
  var published = dd.published || '';
  var h = '';

  // Header card
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden;margin-bottom:12px">';

  // Thumbnail + info
  h += '<div style="display:flex;gap:14px;padding:14px">';
  if (thumb) {
    h += '<img src="' + esc(thumb) + '" style="width:100px;height:auto;border-radius:10px;flex-shrink:0;background:#06111f;object-fit:cover">';
  }
  h += '<div style="min-width:0;flex:1">';
  h += '<div style="font-size:15px;font-weight:700;color:#e0f2fe;line-height:1.3;margin-bottom:8px">' + esc(title) + '</div>';
  if (rating) {
    h += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#fbbf24;font-weight:600;margin-bottom:6px">★ ' + esc(rating) + '</div>';
  }
  if (published) {
    h += '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px">📅 ' + esc(published) + '</div>';
  }
  if (genres.length) {
    h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">';
    genres.slice(0, 4).forEach(function(g){
      h += '<span style="font-size:10px;padding:2px 8px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.2);border-radius:6px;color:#7dd3fc">' + esc(g) + '</span>';
    });
    h += '</div>';
  }
  h += '</div></div>';

  // Description
  if (desc) {
    h += '<div style="padding:0 14px 14px">';
    h += '<div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:6px">Sinopsis</div>';
    h += '<div style="font-size:12.5px;color:#cbd5e1;line-height:1.65;white-space:pre-wrap">' + esc(desc) + '</div>';
    h += '</div>';
  }

  h += '</div>';

  // Episodes
  if (episodes.length) {
    h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 10px">';
    h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">📺 Episode (' + episodes.length + ')</div>';
    h += '</div>';

    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;overflow:hidden">';
    episodes.forEach(function(ep, i){
      var epTitle = ep.title || ep.name || ('Episode ' + (i+1));
      var epUrl = ep.link || ep.url || '';
      h += '<a href="' + esc(epUrl) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid rgba(34,211,238,.05);text-decoration:none">';
      h += '<div style="width:24px;height:24px;border-radius:6px;background:rgba(34,211,238,.1);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#22d3ee;flex-shrink:0">' + (i+1) + '</div>';
      h += '<div style="flex:1;min-width:0;font-size:12px;color:#e0f2fe;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(epTitle) + '</div>';
      h += '<div style="color:#22d3ee;font-size:11px;flex-shrink:0">▶</div>';
      h += '</a>';
    });
    h += '</div>';
  }

  return h;
}

window.KazeAnimeDetail = { isAnimeDetail: isAnimeDetail, render: renderAnimeDetail };
console.log('BETOx1: KazeAnimeDetail siap');
})();
