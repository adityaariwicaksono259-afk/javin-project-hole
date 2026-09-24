(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmtDur(sec){var s=Math.round(sec||0);var m=Math.floor(s/60);var r=s%60;return m+':'+(r<10?'0':'')+r}
function fmtNum(n){n=Number(n)||0;if(n>=1e9)return (n/1e9).toFixed(1)+'B';if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e3)return (n/1e3).toFixed(1)+'K';return String(n)}

// Deteksi SoundCloud search (array track)
function isSCSearch(d){
  if (!d || typeof d !== 'object') return false;
  var arr = Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : null);
  if (!arr || arr.length === 0) return false;
  var f = arr[0];
  return !!(f.permalink && f.artwork_url !== undefined && f.playback_count !== undefined);
}

// Deteksi YouTube search (array video)
function isYTSearch(d){
  if (!d || typeof d !== 'object') return false;
  var arr = Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : null);
  if (!arr || arr.length === 0) return false;
  var f = arr[0];
  return !!(f.videoId && f.url && f.thumbnail);
}

function renderSC(arr){
  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">SoundCloud</div>';
  h += '<div style="font-size:11px;color:#64748b;font-family:ui-monospace,monospace">' + arr.length + ' track</div>';
  h += '</div>';
  arr.forEach(function(t){
    var title = t.permalink || t.title || 'Unknown';
    var url = t.permalink_url || '';
    var img = t.artwork_url || '';
    var dur = t.duration ? fmtDur(t.duration/1000) : '';
    var plays = t.playback_count || 0;
    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;gap:12px;align-items:center">';
    if (img) {
      h += '<img src="' + esc(img) + '" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#06111f" onerror="this.style.display=\'none\'">';
    } else {
      h += '<div style="width:56px;height:56px;border-radius:8px;background:rgba(34,211,238,.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#22d3ee;font-weight:700;font-size:18px">SC</div>';
    }
    h += '<div style="min-width:0;flex:1">';
    h += '<div style="font-size:12.5px;font-weight:600;color:#e0f2fe;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(title) + '</div>';
    h += '<div style="font-size:10.5px;color:#64748b;margin-top:4px;display:flex;gap:10px">';
    if (dur) h += '<span>⏱ ' + dur + '</span>';
    if (plays) h += '<span>▶ ' + fmtNum(plays) + '</span>';
    if (t.comment_count) h += '<span>💬 ' + fmtNum(t.comment_count) + '</span>';
    h += '</div></div>';
    if (url) h += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="padding:8px 12px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);border-radius:8px;color:#22d3ee;font-size:11px;font-weight:600;text-decoration:none;flex-shrink:0">Buka</a>';
    h += '</div>';
  });
  return h;
}

function renderYT(arr){
  var h = '';
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">YouTube</div>';
  h += '<div style="font-size:11px;color:#64748b;font-family:ui-monospace,monospace">' + arr.length + ' video</div>';
  h += '</div>';
  arr.forEach(function(v){
    var title = v.title || 'Unknown';
    var url = v.url || '';
    var thumb = v.thumbnail || v.image || '';
    var dur = v.timestamp || (v.duration && v.duration.timestamp) || '';
    var views = v.views || 0;
    var author = (v.author && v.author.name) || v.channel || '';
    var ago = v.ago || '';
    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:12px;overflow:hidden;margin-bottom:10px">';
    h += '<a href="' + esc(url) + '" target="_blank" rel="noopener" style="display:block;position:relative;aspect-ratio:16/9;background:#06111f;text-decoration:none">';
    if (thumb) h += '<img src="' + esc(thumb) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">';
    if (dur) h += '<div style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,.85);padding:2px 7px;border-radius:5px;font-size:11px;font-weight:600;color:#fff">' + esc(dur) + '</div>';
    h += '</a>';
    h += '<div style="padding:10px 12px">';
    h += '<div style="font-size:12.5px;font-weight:600;color:#e0f2fe;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(title) + '</div>';
    h += '<div style="font-size:10.5px;color:#64748b;margin-top:6px;display:flex;flex-wrap:wrap;gap:10px">';
    if (author) h += '<span>📺 ' + esc(author) + '</span>';
    if (views) h += '<span>👁 ' + fmtNum(views) + '</span>';
    if (ago) h += '<span>🕐 ' + esc(ago) + '</span>';
    h += '</div>';
    h += '</div></div>';
  });
  return h;
}

function render(d){
  var arr = Array.isArray(d) ? d : d.data;
  if (isSCSearch(d)) return renderSC(arr);
  if (isYTSearch(d)) return renderYT(arr);
  return '';
}

window.KazeSearch = {
  isSCSearch: isSCSearch,
  isYTSearch: isYTSearch,
  render: render
};
console.log('BETOx1: KazeSearch siap');
})();
