(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmt(n){n=Number(n)||0;if(n>=1e9)return (n/1e9).toFixed(1)+'B';if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e3)return (n/1e3).toFixed(1)+'K';return String(n);}

// Deteksi profile generic — fleksibel
function isSocialProfile(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || !dd.username) return false;
  // Ada salah satu: foto + salah satu stats/name
  var hasPic = dd.photo || dd.avatar || dd.picture || dd.profile_pic || dd.profile_picture;
  var hasName = dd.name || dd.nickname || dd.full_name || dd.display_name;
  var hasStat = dd.followers !== undefined || dd.following !== undefined || dd.public_repo !== undefined || dd.posts !== undefined;
  return !!(hasPic && hasName && hasStat);
}

function renderSocial(d){
  var dd = d.data || d;
  var name = dd.name || dd.nickname || dd.full_name || dd.display_name || dd.username;
  var username = dd.username || '';
  var avatar = dd.photo || dd.avatar || dd.picture || dd.profile_pic || dd.profile_picture || '';
  var bio = dd.bio || dd.description || dd.biography || '';
  var verified = dd.verified || dd.is_verified || dd.verified_badge || false;
  var isPrivate = dd.private || false;
  var isBanned = dd.isBanned || false;

  var html = '<div class="result-card" style="margin-bottom:12px">';
  html += '<div class="result-title">👤 Profile</div>';

  html += '<div style="display:flex;gap:14px;align-items:flex-start;padding-top:8px">';
  if (avatar) {
    html += '<img src="' + esc(avatar) + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#e2e8f0" onerror="this.style.display=\'none\'">';
  } else {
    html += '<div style="width:80px;height:80px;border-radius:50%;background:#e2e8f0;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:32px">👤</div>';
  }
  html += '<div style="min-width:0;flex:1">';
  html += '<div style="font-weight:700;font-size:15px;color:#e0f2fe;line-height:1.2">' + esc(name) + (verified?' <span style="color:#22d3ee">✅</span>':'') + (isPrivate?' <span style="color:#f59e0b">🔒</span>':'') + (isBanned?' <span style="color:#ef4444">🚫</span>':'') + '</div>';
  html += '<div style="font-size:12px;color:#94a3b8">@' + esc(username) + '</div>';
  if (dd.id) html += '<div style="font-size:10px;color:#64748b;margin-top:4px">🆔 ' + esc(String(dd.id).slice(0,24)) + '</div>';
  if (dd.location) html += '<div style="font-size:11px;color:#94a3b8;margin-top:4px">📍 ' + esc(dd.location) + '</div>';
  if (dd.company) html += '<div style="font-size:11px;color:#94a3b8;margin-top:2px">🏢 ' + esc(dd.company) + '</div>';
  html += '</div></div>';

  if (bio) {
    html += '<div style="font-size:12px;color:#cbd5e1;padding:10px 0;border-top:1px solid rgba(34,211,238,.12);margin-top:10px;line-height:1.5;white-space:pre-wrap">' + esc(bio) + '</div>';
  }

  // Stats — fleksibel
  var statCells = [];
  var posts = dd.posts !== undefined ? dd.posts : (dd.post_count || dd.media_count || 0);
  if (posts) statCells.push({label:'Posts', val:posts});
  if (dd.public_repo !== undefined) statCells.push({label:'Repos', val:dd.public_repo});
  if (dd.public_gists !== undefined) statCells.push({label:'Gists', val:dd.public_gists});
  if (dd.followers !== undefined) statCells.push({label:'Followers', val:dd.followers, accent:true});
  if (dd.follower_count !== undefined) statCells.push({label:'Followers', val:dd.follower_count, accent:true});
  if (dd.following !== undefined) statCells.push({label:'Following', val:dd.following});
  if (dd.followings !== undefined) statCells.push({label:'Following', val:dd.followings});
  if (dd.likes !== undefined) statCells.push({label:'Likes', val:dd.likes});
  if (dd.tweets !== undefined) statCells.push({label:'Tweets', val:dd.tweets});

  if (statCells.length) {
    var cols = statCells.length <= 3 ? statCells.length : 3;
    html += '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:8px;padding:12px 0;border-top:1px solid rgba(34,211,238,.12)">';
    statCells.forEach(function(c){
      var color = c.accent ? '#22d3ee' : '#e0f2fe';
      html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:' + color + '">' + fmt(c.val) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">' + c.label + '</div></div>';
    });
    html += '</div>';
  }

  // Link actions
  var links = [];
  if (dd.url) links.push({label:'🔗 Buka', url:dd.url});
  if (dd.blog) links.push({label:'📝 Blog', url:dd.blog});
  if (dd.links && Array.isArray(dd.links)) {
    dd.links.slice(0,3).forEach(function(l){
      if (l && l.indexOf('http') === 0) links.push({label:'🔗 Link', url:l});
    });
  }
  if (dd.profile_url) links.push({label:'🔗 Buka', url:dd.profile_url});

  if (links.length) {
    html += '<div class="result-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">';
    links.forEach(function(l){
      html += '<a class="btn-action primary" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + l.label + '</a>';
    });
    html += '</div>';
  }

  // Join date
  if (dd.created_at) {
    try {
      var dt = new Date(dd.created_at);
      if (!isNaN(dt.getTime())) {
        html += '<div style="font-size:11px;color:#64748b;padding:8px 0;border-top:1px solid rgba(34,211,238,.12);margin-top:8px">📅 Join: ' + dt.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) + '</div>';
      }
    } catch(e){}
  }

  html += '</div>';
  return html;
}

window.KazeSocial = { isSocialProfile: isSocialProfile, render: renderSocial };
console.log('BETOx1: KazeSocial v2 siap');
})();
