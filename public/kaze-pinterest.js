(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function isPinArray(d){
  if (!d || typeof d !== 'object') return false;
  var arr = Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : null);
  if (!arr || arr.length === 0) return false;
  return !!(arr[0].image_url && (arr[0].pin || arr[0].id));
}
function isPinProfile(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  return !!(dd && dd.username && dd.profile_url && dd.stats && dd.profile_url.indexOf('pinterest') !== -1);
}
function renderGrid(d){
  var arr = Array.isArray(d) ? d : d.data;
  var html = '<div class="result-card"><div class="result-title">📌 Pinterest (' + arr.length + ' pin)</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding-top:8px">';
  arr.slice(0, 20).forEach(function(p){
    var img = p.image_url || p.image || '';
    if (!img) return;
    html += '<a href="' + esc(img) + '" target="_blank" rel="noopener" style="text-decoration:none;display:block;border-radius:8px;overflow:hidden;background:#0a1929;aspect-ratio:1">';
    html += '<img src="' + esc(img) + '" style="width:100%;height:100%;object-fit:cover" loading="lazy">';
    html += '</a>';
  });
  html += '</div></div>';
  return html;
}
function renderProfile(d){
  var dd = d.data || d;
  var name = dd.full_name || dd.username;
  var avatar = (dd.image && (dd.image.original || dd.image.large)) || '';
  var stats = dd.stats || {};
  var html = '<div class="result-card">';
  html += '<div class="result-title">📌 Pinterest Profile</div>';
  html += '<div style="display:flex;gap:12px;align-items:center;padding:12px 0">';
  if (avatar) html += '<img src="' + esc(avatar) + '" style="width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0">';
  html += '<div style="min-width:0;flex:1">';
  html += '<div style="font-weight:700;font-size:14px;color:#e0f2fe">' + esc(name) + '</div>';
  html += '<div style="font-size:12px;color:#94a3b8">@' + esc(dd.username) + '</div>';
  if (dd.bio) html += '<div style="font-size:11px;color:#64748b;margin-top:4px">' + esc(dd.bio) + '</div>';
  html += '</div></div>';
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:8px 0;border-top:1px solid rgba(34,211,238,.15)">';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + (stats.pins||0) + '</div><div style="font-size:10px;color:#64748b">Pins</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + (stats.followers||0) + '</div><div style="font-size:10px;color:#64748b">Followers</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + (stats.following||0) + '</div><div style="font-size:10px;color:#64748b">Following</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + (stats.boards||0) + '</div><div style="font-size:10px;color:#64748b">Boards</div></div>';
  html += '</div></div>';
  return html;
}
window.KazePinterest = { isPinArray: isPinArray, isPinProfile: isPinProfile, renderGrid: renderGrid, renderProfile: renderProfile };
console.log('BETOx1: KazePinterest siap');
})();
