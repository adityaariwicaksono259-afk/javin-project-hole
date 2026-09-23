(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmtDur(ms){var s=Math.round((ms||0)/1000);var m=Math.floor(s/60);var sec=s%60;return m+':'+(sec<10?'0':'')+sec;}
function isSC(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  return !!(dd && dd.title && dd.url && dd.user && (/\.mp3/.test(dd.url) || /sndcdn/.test(dd.url)));
}
function renderSC(d){
  var dd = d.data || d;
  var html = '<div class="result-card" style="margin-bottom:12px">';
  html += '<div class="result-title">🎧 SoundCloud</div>';
  html += '<div style="display:flex;gap:12px;align-items:flex-start;padding-top:8px">';
  if (dd.thumbnail) {
    html += '<img src="' + esc(dd.thumbnail) + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#e2e8f0">';
  } else {
    html += '<div style="width:80px;height:80px;border-radius:8px;background:#e2e8f0;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:32px">🎧</div>';
  }
  html += '<div style="min-width:0;flex:1">';
  html += '<div style="font-weight:700;font-size:14px;color:#e0f2fe;line-height:1.3">' + esc(dd.title) + '</div>';
  html += '<div style="font-size:12px;color:#94a3b8;margin-top:2px">👤 ' + esc(dd.user) + '</div>';
  if (dd.duration) html += '<div style="font-size:11px;color:#64748b;margin-top:2px">⏱ ' + fmtDur(dd.duration) + '</div>';
  html += '</div></div>';
  if (dd.url) html += '<audio controls preload="metadata" style="width:100%;margin-top:12px" src="' + esc(dd.url) + '"></audio>';
  if (dd.description) {
    var desc = String(dd.description).replace(/<[^>]+>/g,'').slice(0,200);
    html += '<div style="font-size:11px;color:#64748b;margin-top:8px;line-height:1.5">' + esc(desc) + '</div>';
  }
  html += '<div class="result-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">';
  if (dd.url) {
    html += '<a class="btn-action primary" href="' + esc(dd.url) + '" download target="_blank" rel="noopener">⬇️ Download MP3</a>';
    html += '<button class="btn-action" data-copy="' + esc(dd.url) + '">📋 Copy URL</button>';
  }
  html += '</div></div>';
  return html;
}
window.KazeSoundCloud = { isSoundCloud: isSC, render: renderSC };
console.log('BETOx1: KazeSoundCloud siap');
})();
