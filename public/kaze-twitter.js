(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmt(n){
  n = Number(n)||0;
  if (n>=1e9) return (n/1e9).toFixed(1)+'B';
  if (n>=1e6) return (n/1e6).toFixed(1)+'M';
  if (n>=1e3) return (n/1e3).toFixed(1)+'K';
  return String(n);
}
function isTwitter(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || !dd.stats) return false;
  // Ciri: username + stats.tweets/followers + profile.image
  return !!(dd.username && dd.stats && (dd.stats.tweets !== undefined || dd.stats.followers !== undefined) && dd.profile && dd.profile.image);
}
function renderTW(d){
  var dd = d.data || d;
  var stats = dd.stats || {};
  var prof = dd.profile || {};
  var avatar = prof.image || '';
  var banner = prof.banner || '';
  var name = dd.name || dd.username;
  var verified = dd.verified ? ' <span style="color:#22d3ee">✅</span>' : '';
  var html = '<div class="result-card" style="margin-bottom:12px">';
  // Banner
  if (banner) {
    html += '<div style="width:100%;height:100px;border-radius:12px;overflow:hidden;background:#0a1929;margin-bottom:-40px;position:relative;z-index:0">';
    html += '<img src="' + esc(banner) + '" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'">';
    html += '</div>';
  }
  // Avatar + info
  html += '<div style="display:flex;gap:12px;align-items:flex-end;padding-top:8px;position:relative;z-index:1">';
  if (avatar) {
    html += '<img src="' + esc(avatar) + '" style="width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;border:3px solid #06111f;background:#e2e8f0">';
  } else {
    html += '<div style="width:72px;height:72px;border-radius:50%;background:#e2e8f0;flex-shrink:0;border:3px solid #06111f"></div>';
  }
  html += '<div style="min-width:0;flex:1;padding-bottom:6px">';
  html += '<div style="font-weight:700;font-size:15px;color:#e0f2fe;line-height:1.2">' + esc(name) + verified + '</div>';
  html += '<div style="font-size:12px;color:#94a3b8">@' + esc(dd.username) + '</div>';
  html += '</div></div>';
  // Bio
  if (dd.description) {
    html += '<div style="font-size:12px;color:#cbd5e1;padding:10px 0;border-top:1px solid rgba(34,211,238,.12);margin-top:8px;line-height:1.5">' + esc(dd.description) + '</div>';
  }
  // Stats grid
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 0;border-top:1px solid rgba(34,211,238,.12)">';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + fmt(stats.tweets) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Tweets</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + fmt(stats.following) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Following</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#22d3ee">' + fmt(stats.followers) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Followers</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + fmt(stats.likes) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Likes</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + fmt(stats.media) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Media</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + fmt(dd.stats.tweets_daily || 0) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Total</div></div>';
  html += '</div>';
  // Location & join date
  var extras = [];
  if (dd.location) extras.push('📍 ' + esc(dd.location));
  if (dd.created_at) {
    try {
      var dt = new Date(dd.created_at);
      extras.push('📅 Join ' + dt.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}));
    } catch(e){}
  }
  if (extras.length) {
    html += '<div style="font-size:11px;color:#64748b;padding:8px 0;border-top:1px solid rgba(34,211,238,.12);line-height:1.6">' + extras.join(' · ') + '</div>';
  }
  // Actions
  html += '<div class="result-actions" style="display:flex;gap:8px;margin-top:8px">';
  html += '<a class="btn-action primary" href="https://x.com/' + esc(dd.username) + '" target="_blank" rel="noopener">🐦 Buka X</a>';
  html += '</div>';
  html += '</div>';
  return html;
}
window.KazeTwitter = { isTwitter: isTwitter, render: renderTW };
console.log('BETOx1: KazeTwitter siap');
})();
