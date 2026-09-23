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
function isRoblox(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd) return false;
  // Ciri: avatar rbxcdn + name + followers/friends
  return !!(dd.name && dd.friends !== undefined && (dd.followers !== undefined || dd.followings !== undefined) && (dd.avatar || dd.id));
}
function renderRoblox(d){
  var dd = d.data || d;
  var avatar = dd.avatar || '';
  var name = dd.displayName || dd.name || 'Unknown';
  var username = dd.name || '';
  var desc = dd.description || '';
  var created = dd.created ? new Date(dd.created).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-';
  var friends = dd.friends || 0;
  var followers = dd.followers || 0;
  var followings = dd.followings || 0;
  var isBanned = dd.isBanned || false;
  var verified = dd.hasVerifiedBadge || false;
  var uid = dd.id || '-';
  var games = dd.games || [];

  var html = '<div class="result-card" style="margin-bottom:12px">';
  html += '<div class="result-title">🎮 Roblox Profile</div>';

  // Avatar + info
  html += '<div style="display:flex;gap:14px;align-items:flex-start;padding-top:8px">';
  if (avatar) {
    html += '<img src="' + esc(avatar) + '" style="width:80px;height:80px;border-radius:12px;object-fit:cover;flex-shrink:0;background:#e2e8f0">';
  } else {
    html += '<div style="width:80px;height:80px;border-radius:12px;background:#e2e8f0;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:32px">🎮</div>';
  }
  html += '<div style="min-width:0;flex:1">';
  html += '<div style="font-weight:700;font-size:15px;color:#e0f2fe;line-height:1.2">' + esc(name) + (verified?' <span style="color:#22d3ee">✅</span>':'') + (isBanned?' <span style="color:#ef4444">🚫</span>':'') + '</div>';
  html += '<div style="font-size:12px;color:#94a3b8">@' + esc(username) + '</div>';
  html += '<div style="font-size:10px;color:#64748b;margin-top:4px">🆔 ' + esc(uid) + '</div>';
  html += '</div></div>';

  // Bio
  if (desc) {
    html += '<div style="font-size:12px;color:#cbd5e1;padding:10px 0;border-top:1px solid rgba(34,211,238,.12);margin-top:10px;line-height:1.5;white-space:pre-wrap">' + esc(desc) + '</div>';
  }

  // Stats
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 0;border-top:1px solid rgba(34,211,238,.12)">';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + fmt(friends) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Friends</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + fmt(followers) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Followers</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#e0f2fe">' + fmt(followings) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Following</div></div>';
  html += '</div>';

  // Join date
  html += '<div style="font-size:11px;color:#64748b;padding:8px 0;border-top:1px solid rgba(34,211,238,.12)">📅 Join: ' + esc(created) + '</div>';

  // Actions
  html += '<div class="result-actions" style="display:flex;gap:8px;margin-top:8px">';
  html += '<a class="btn-action primary" href="https://www.roblox.com/users/' + esc(uid) + '/profile" target="_blank" rel="noopener">🎮 Buka Roblox</a>';
  html += '</div>';
  html += '</div>';

  // Games
  if (games.length) {
    html += '<div class="result-card"><div class="result-title">🕹️ Games (' + games.length + ')</div>';
    games.slice(0, 6).forEach(function(g){
      html += '<div style="padding:10px 0;border-bottom:1px solid rgba(34,211,238,.1)">';
      html += '<div style="font-weight:600;font-size:13px;color:#e0f2fe">' + esc(g.name || 'Untitled') + '</div>';
      html += '<div style="font-size:11px;color:#94a3b8;margin-top:2px">';
      if (g.placeVisits !== undefined) html += '👁 ' + fmt(g.placeVisits) + ' visits';
      if (g.created) {
        try {
          var dt = new Date(g.created);
          html += ' · 📅 ' + dt.toLocaleDateString('id-ID', {month:'short', year:'numeric'});
        } catch(e){}
      }
      html += '</div>';
      if (g.id) {
        html += '<a href="https://www.roblox.com/games/' + g.id + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;padding:4px 10px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.3);border-radius:6px;font-size:11px;color:#22d3ee;text-decoration:none">Buka Game</a>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  return html;
}
window.KazeRoblox = { isRoblox: isRoblox, render: renderRoblox };
console.log('BETOx1: KazeRoblox siap');
})();
