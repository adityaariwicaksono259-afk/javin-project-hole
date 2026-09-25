(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isKomikList(d){
  if (!d || typeof d !== 'object') return false;
  if (!d.success) return false;
  if (!Array.isArray(d.results) || d.results.length === 0) return false;
  var f = d.results[0];
  return !!(f.title && f.cover && f.slug && !f.image);
}

function renderKomik(d){
  var arr = d.results || [];
  var source = d.source || 'Komik';
  var page = d.page || 1;
  var query = d.query || '';
  var h = '';

  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">' + esc(source) + '</div>';
  h += '<div style="font-size:11px;color:#64748b;font-family:ui-monospace,monospace">';
  if (query) h += '"' + esc(query) + '" · ';
  else h += 'Hal ' + page + ' · ';
  h += arr.length + ' komik';
  h += '</div></div>';

  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:4px 0 12px">';
  arr.forEach(function(item){
    var title = item.title || 'Untitled';
    var link = item.link || '';
    var cover = item.cover || '';
    var updated = item.updatedAt || '';
    var chapter = item.latestChapter || '';

    // Bersihin prefix "Komik "
    var cleanTitle = title.replace(/^Komik\s+/i, '');

    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:10px;overflow:hidden;display:flex;flex-direction:column">';
    h += '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="display:block;position:relative;aspect-ratio:2/3;overflow:hidden;background:#06111f;text-decoration:none">';
    if (cover) h += '<img src="' + esc(cover) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">';
    if (updated) {
      h += '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(180deg,transparent,rgba(6,17,31,.95));padding:14px 6px 5px;font-size:9px;color:#22d3ee;font-weight:600;text-align:right">' + esc(updated) + '</div>';
    }
    h += '</a>';
    h += '<div style="padding:8px;display:flex;flex-direction:column;gap:4px;flex:1">';
    h += '<div style="font-size:11px;font-weight:600;color:#e0f2fe;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:28px">' + esc(cleanTitle) + '</div>';
    if (chapter) h += '<div style="font-size:9.5px;color:#64748b">' + esc(chapter) + '</div>';
    h += '</div></div>';
  });
  h += '</div>';

  return h;
}

window.KazeKomik = { isKomikList: isKomikList, render: renderKomik };
console.log('BETOx1: KazeKomik siap');
})();
