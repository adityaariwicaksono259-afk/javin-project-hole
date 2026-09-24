(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

// Normalisasi item jadi format standar
function normalize(item){
  return {
    title: item.title || item.name || 'Unknown',
    image: item.image || item.thumbnail || item.cover || '',
    link: item.link || item.url || '',
    episode: item.latestEpisode || item.episode || item.totalEpisode || '',
    type: Array.isArray(item.type) ? item.type[0] : (item.type || ''),
    status: item.status || '',
    rating: item.rating || item.star || null,
    views: item.views || '',
    release: item.release || item.date || '',
    desc: item.description || item.content || '',
    genres: Array.isArray(item.genre) ? item.genre : []
  };
}

// Deteksi anime list dari berbagai bentuk response
function detectAnimeArray(d){
  if (!d || typeof d !== 'object') return null;
  var dd = d.data || d;
  if (!dd) return null;

  // 1. animeList (Animasu, Animekuindo)
  if (Array.isArray(dd.animeList) && dd.animeList.length > 0 && dd.animeList[0].title) {
    return { items: dd.animeList, source: dd.source || 'Anime', subtitle: dd.page ? 'Hal ' + dd.page : '' };
  }
  // 2. anime array (Samehadaku Latest)
  if (Array.isArray(dd.anime) && dd.anime.length > 0 && dd.anime[0].title && dd.anime[0].thumbnail) {
    return { items: dd.anime, source: 'Samehadaku Latest', subtitle: 'Baru rilis' };
  }
  // 3. results (Animasu Search)
  if (Array.isArray(dd.results) && dd.results.length > 0 && dd.results[0].title && dd.results[0].image) {
    return { items: dd.results, source: dd.source || 'Search', subtitle: dd.query ? '"' + dd.query + '"' : '' };
  }
  // 4. data array langsung (Samehadaku Search)
  if (Array.isArray(dd) && dd.length > 0 && dd[0].title && dd[0].thumbnail && dd[0].genre) {
    return { items: dd, source: 'Samehadaku Search', subtitle: '' };
  }
  // 5. schedule (Animasu Schedule)
  if (dd.schedule && typeof dd.schedule === 'object') {
    var keys = Object.keys(dd.schedule);
    if (keys.length > 0 && Array.isArray(dd.schedule[keys[0]])) {
      return { schedule: dd.schedule, source: 'Jadwal' };
    }
  }
  // 6. Per-hari object (Samehadaku Release — sunday, monday, dll)
  var dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday','sabtu','minggu','senin','selasa','rabu','kamis','jumat'];
  var daysFound = {};
  var dayNames = { sunday:'Minggu', monday:'Senin', tuesday:'Selasa', wednesday:'Rabu', thursday:'Kamis', friday:'Jumat', saturday:'Sabtu' };
  dayKeys.forEach(function(dk){
    if (Array.isArray(dd[dk]) && dd[dk].length > 0) {
      daysFound[dk] = dd[dk];
    }
  });
  if (Object.keys(daysFound).length > 0) {
    var renamed = {};
    Object.keys(daysFound).forEach(function(k){
      renamed[dayNames[k] || k] = daysFound[k];
    });
    return { schedule: renamed, source: 'Samehadaku Release' };
  }
  return null;
}

function isAnimeList(d){
  return !!detectAnimeArray(d);
}

function renderItem(item){
  var it = normalize(item);
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;overflow:hidden;display:flex;flex-direction:column">';
  h += '<a href="' + esc(it.link) + '" target="_blank" rel="noopener" style="display:block;position:relative;aspect-ratio:2/3;overflow:hidden;background:#06111f;text-decoration:none">';
  if (it.image) h += '<img src="' + esc(it.image) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display=\'none\'">';
  if (it.type) h += '<div style="position:absolute;top:6px;left:6px;background:rgba(6,17,31,.85);padding:3px 8px;border-radius:6px;font-size:9px;font-weight:600;color:#22d3ee;border:1px solid rgba(34,211,238,.3)">' + esc(it.type) + '</div>';
  if (it.rating && it.rating !== 'null') h += '<div style="position:absolute;top:6px;right:6px;background:rgba(251,191,36,.9);padding:3px 7px;border-radius:6px;font-size:10px;font-weight:700;color:#06111f">★ ' + esc(it.rating) + '</div>';
  h += '<div style="position:absolute;bottom:0;left:0;right:0;height:40%;background:linear-gradient(180deg,transparent,rgba(6,17,31,.9));pointer-events:none"></div>';
  h += '</a>';
  h += '<div style="padding:10px;display:flex;flex-direction:column;gap:6px;flex:1">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:32px">' + esc(it.title) + '</div>';
  if (it.episode) h += '<div style="font-size:10.5px;color:#22d3ee;font-weight:500">● ' + esc(it.episode) + '</div>';
  if (it.views) h += '<div style="font-size:10px;color:#64748b">👁 ' + esc(it.views) + '</div>';
  if (it.release) h += '<div style="font-size:10px;color:#64748b">🕐 ' + esc(it.release) + '</div>';
  if (it.genres && it.genres.length) {
    h += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px">';
    it.genres.slice(0, 3).forEach(function(g){
      h += '<span style="font-size:9px;padding:1px 5px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.15);border-radius:4px;color:#7dd3fc">' + esc(g) + '</span>';
    });
    if (it.genres.length > 3) h += '<span style="font-size:9px;color:#475569">+' + (it.genres.length - 3) + '</span>';
    h += '</div>';
  }
  if (it.link) h += '<a href="' + esc(it.link) + '" target="_blank" rel="noopener" style="margin-top:auto;padding:7px 10px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);border-radius:8px;color:#22d3ee;font-size:11px;font-weight:600;text-decoration:none;text-align:center">Buka</a>';
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
  var info = detectAnimeArray(d);
  if (!info) return '<div style="padding:20px;text-align:center;color:#64748b;font-size:12px">Tidak ada data anime</div>';

  // Schedule mode
  if (info.schedule) {
    var h = '';
    var days = Object.keys(info.schedule);
    days.forEach(function(day){
      var arr = info.schedule[day] || [];
      if (!arr.length) return;
      h += '<div style="margin-bottom:20px">';
      h += '<div style="font-size:12px;font-weight:700;color:#22d3ee;text-transform:uppercase;margin-bottom:10px;padding-left:2px">' + esc(day) + ' <span style="color:#475569;font-weight:500">(' + arr.length + ')</span></div>';
      h += renderGrid(arr);
      h += '</div>';
    });
    return h;
  }

  var items = info.items || [];
  if (!items.length) return '<div style="padding:20px;text-align:center;color:#64748b;font-size:12px">Tidak ada data anime</div>';

  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">' + esc(info.source) + '</div>';
  h += '<div style="font-size:11px;color:#64748b;font-family:ui-monospace,monospace">' + (info.subtitle ? esc(info.subtitle) + ' · ' : '') + items.length + ' judul</div>';
  h += '</div>';
  h += renderGrid(items);
  return h;
}

window.KazeAnime = { isAnimeList: isAnimeList, render: render };
console.log('BETOx1: KazeAnime v2 — multi-format');
})();
