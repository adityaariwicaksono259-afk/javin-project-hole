(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isAnimeList(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd) return false;
  if (Array.isArray(dd.animeList) && dd.animeList.length > 0 && dd.animeList[0].title) return true;
  if (Array.isArray(dd.results) && dd.results.length > 0 && dd.results[0].title && dd.results[0].image) return true;
  if (dd.schedule && typeof dd.schedule === 'object') {
    var keys = Object.keys(dd.schedule);
    if (keys.length > 0 && Array.isArray(dd.schedule[keys[0]]) && dd.schedule[keys[0]].length > 0 && dd.schedule[keys[0]][0].title) return true;
  }
  return false;
}

function renderItem(item){
  var title = item.title || 'Unknown';
  var image = item.image || '';
  var link = item.link || '';
  var episode = item.latestEpisode || '';
  var type = item.type || '';
  var rating = item.rating;
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;overflow:hidden;display:flex;flex-direction:column">';
  h += '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="display:block;position:relative;aspect-ratio:2/3;overflow:hidden;background:#06111f;text-decoration:none">';
  if (image) h += '<img src="' + esc(image) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display=\'none\'">';
  if (type) h += '<div style="position:absolute;top:6px;left:6px;background:rgba(6,17,31,.85);padding:3px 8px;border-radius:6px;font-size:9px;font-weight:600;color:#22d3ee;border:1px solid rgba(34,211,238,.3)">' + esc(type) + '</div>';
  if (rating !== null && rating !== undefined && rating !== '' && rating !== 'null') h += '<div style="position:absolute;top:6px;right:6px;background:rgba(251,191,36,.9);padding:3px 7px;border-radius:6px;font-size:10px;font-weight:700;color:#06111f">★ ' + esc(rating) + '</div>';
  h += '<div style="position:absolute;bottom:0;left:0;right:0;height:40%;background:linear-gradient(180deg,transparent,rgba(6,17,31,.9));pointer-events:none"></div>';
  h += '</a>';
  h += '<div style="padding:10px;display:flex;flex-direction:column;gap:6px;flex:1">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:32px">' + esc(title) + '</div>';
  if (episode) h += '<div style="font-size:10.5px;color:#22d3ee;font-weight:500">● ' + esc(episode) + '</div>';
  if (link) h += '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="margin-top:auto;padding:7px 10px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);border-radius:8px;color:#22d3ee;font-size:11px;font-weight:600;text-decoration:none;text-align:center">Buka</a>';
  h += '</div></div>';
  return h;
}

function renderGrid(items){
  var h = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:4px 0 12px">';
  items.forEach(function(it){ h += renderItem(it); });
  h += '</div>';
  return h;
}

function render(d){
  var dd = d.data || d;
  var items = [];
  var subtitle = '';

  if (Array.isArray(dd.animeList) && dd.animeList.length) {
    items = dd.animeList;
    subtitle = dd.page ? 'Halaman ' + dd.page : '';
  } else if (Array.isArray(dd.results) && dd.results.length) {
    items = dd.results;
    subtitle = dd.query ? '"' + dd.query + '"' : '';
  } else if (dd.schedule) {
    var days = Object.keys(dd.schedule);
    if (days.length === 1 && days[0] === 'All') {
      items = dd.schedule.All;
      subtitle = 'Jadwal';
    } else {
      var multi = '';
      days.forEach(function(day){
        var arr = dd.schedule[day] || [];
        if (!arr.length) return;
        multi += '<div style="margin-bottom:20px">';
        multi += '<div style="font-size:12px;font-weight:700;color:#22d3ee;text-transform:uppercase;margin-bottom:10px">' + esc(day) + ' <span style="color:#475569">(' + arr.length + ')</span></div>';
        multi += renderGrid(arr);
        multi += '</div>';
      });
      return multi;
    }
  }

  if (!items.length) return '<div style="padding:20px;text-align:center;color:#64748b;font-size:12px">Tidak ada data anime</div>';

  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">' + esc(dd.source || 'Anime') + '</div>';
  h += '<div style="font-size:11px;color:#64748b;font-family:ui-monospace,monospace">' + (subtitle ? esc(subtitle) + ' · ' : '') + items.length + ' judul</div>';
  h += '</div>';
  h += renderGrid(items);
  return h;
}

window.KazeAnime = { isAnimeList: isAnimeList, render: render };
console.log('BETOx1: KazeAnime siap');
})();
