/* ===== KAZE YouTube Card ===== */
(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isYT(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  // Ciri: title + thumbnail youtube + channel atau id + data.url
  var hasThumb = dd && dd.thumbnail && /ytimg|youtube/i.test(dd.thumbnail);
  var hasData = dd && dd.data && dd.data.url;
  return !!(dd && dd.title && (hasThumb || hasData) && (dd.channel || dd.channelTitle));
}

function renderYT(d){
  var dd = d.data && d.data.url ? d : (d.data || d);
  // dd.data adalah download info
  var info = d.data && d.data.url ? d : d;
  var dl = info.data || (d.data && d.data.data) || {};
  
  var title = info.title || 'Unknown';
  var thumb = info.thumbnail || '';
  var duration = info.duration || '';
  var channel = info.channel || info.channelTitle || '';
  var views = info.views || '';
  var ytId = info.id || '';
  
  var html = '<div class="result-card" style="margin-bottom:12px">';
  html += '<div class="result-title">🎬 YouTube</div>';
  
  // Thumbnail (16:9)
  if (thumb) {
    html += '<div style="position:relative;width:100%;border-radius:12px;overflow:hidden;background:#000;margin:8px 0">';
    html += '<img src="' + esc(thumb) + '" style="width:100%;display:block;aspect-ratio:16/9;object-fit:cover">';
    if (duration) {
      html += '<div style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,.85);color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600">' + esc(duration) + '</div>';
    }
    html += '</div>';
  }
  
  // Info
  html += '<div style="padding-top:4px">';
  html += '<div style="font-weight:700;font-size:14px;color:#e0f2fe;line-height:1.3">' + esc(title) + '</div>';
  if (channel) {
    html += '<div style="font-size:12px;color:#94a3b8;margin-top:4px">📺 ' + esc(channel) + '</div>';
  }
  if (views) {
    html += '<div style="font-size:11px;color:#64748b;margin-top:2px">👁 ' + esc(views) + ' views</div>';
  }
  html += '</div>';
  
  // Download info
  if (dl.url) {
    html += '<div style="margin-top:12px;padding:10px 12px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);border-radius:8px;font-size:12px;color:#e0f2fe">';
    if (dl.extension) {
      html += '<div>📁 <b>' + esc((dl.extension||'').toUpperCase()) + '</b>';
      if (dl.quality) html += ' · ' + esc(dl.quality);
      if (dl.size) html += ' · ' + esc(dl.size);
      html += '</div>';
    }
    if (dl.filename) {
      html += '<div style="font-size:11px;color:#94a3b8;margin-top:2px;word-break:break-all">' + esc(dl.filename) + '</div>';
    }
    html += '</div>';
  }
  
  // Buttons
  html += '<div class="result-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">';
  if (dl.url) {
    var dlLabel = dl.extension ? '⬇️ Download ' + (dl.extension||'').toUpperCase() : '⬇️ Download';
    html += '<a class="btn-action primary" href="' + esc(dl.url) + '" download target="_blank" rel="noopener">' + dlLabel + '</a>';
  }
  if (ytId) {
    html += '<a class="btn-action" href="https://youtu.be/' + esc(ytId) + '" target="_blank" rel="noopener">▶️ Buka di YouTube</a>';
  }
  if (dl.url) {
    html += '<button class="btn-action" data-copy="' + esc(dl.url) + '">📋 Copy URL</button>';
  }
  html += '</div>';
  
  html += '</div>';
  return html;
}

window.KazeYouTube = {
  isYT: isYT,
  render: renderYT
};
console.log('BETOx1: KazeYouTube siap');
})();
