/* ===== KAZE TikTok Card ===== */
(function(){
'use strict';

function fmt(n){
  n = Number(n) || 0;
  if (n >= 1e9) return (n/1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return String(n);
}

function esc(s){
  return String(s||'').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

// Deteksi apakah object ini response TikWM
function isTikWM(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  return !!(dd && dd.author && (dd.author.unique_id || dd.author.nickname) && (dd.play || dd.wmplay || dd.hdplay));
}

// Render kartu lengkap TikTok
function renderTikTokCard(d){
  var dd = d.data || d;
  var author = dd.author || {};
  var music = dd.music_info || {};
  
  var username = author.unique_id || '';
  var nickname = author.nickname || username;
  var avatar = author.avatar || '';
  var cover = dd.origin_cover || dd.cover || '';
  var videoUrl = dd.hdplay || dd.play || dd.wmplay || '';
  var videoWm = dd.wmplay || dd.play || '';
  var videoHd = dd.hdplay || dd.play || '';
  var caption = dd.title || '';
  var musicTitle = music.title || '';
  var musicAuthor = music.author || '';
  
  var likes = dd.digg_count || 0;
  var comments = dd.comment_count || 0;
  var shares = dd.share_count || 0;
  var views = dd.play_count || 0;
  var saves = dd.collect_count || 0;
  var downloads = dd.download_count || 0;
  
  // Format angka
  function fmt(n){
    n = Number(n) || 0;
    if (n >= 1e9) return (n/1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
    return String(n);
  }
  
  function esc(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  
  var html = '';
  
  // ===== CARD 1: Profile + Stats =====
  html += '<div class="result-card" style="margin-bottom:12px">';
  
  // Profile header
  html += '<div style="display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid #f1f5f9">';
  if (avatar) {
    html += '<img src="' + esc(avatar) + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#e2e8f0" onerror="this.style.display=\'none\'">';
  } else {
    html += '<div style="width:56px;height:56px;border-radius:50%;background:#e2e8f0;flex-shrink:0"></div>';
  }
  html += '<div style="min-width:0;flex:1">';
  html += '<div style="font-weight:700;font-size:14px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(nickname) + '</div>';
  html += '<div style="color:#64748b;font-size:12px">@' + esc(username) + '</div>';
  html += '</div>';
  html += '</div>';
  
  // Stats grid
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 0">';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#ef4444">❤️ ' + fmt(likes) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Likes</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#3b82f6">💬 ' + fmt(comments) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Komen</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#22c55e">🔗 ' + fmt(shares) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Share</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#a855f7">▶️ ' + fmt(views) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Views</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#f59e0b">🔖 ' + fmt(saves) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Simpan</div></div>';
  html += '<div style="text-align:center"><div style="font-weight:700;font-size:14px;color:#06b6d4">⬇️ ' + fmt(downloads) + '</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">Download</div></div>';
  html += '</div>';
  
  // Caption
  if (caption) {
    html += '<div style="padding-top:8px;border-top:1px solid #f1f5f9;font-size:12px;color:#334155;line-height:1.5">';
    html += esc(caption);
    html += '</div>';
  }
  
  // Music
  if (musicTitle) {
    html += '<div style="margin-top:8px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:12px;color:#475569;display:flex;align-items:center;gap:8px">';
    html += '<span>🎵</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(musicTitle) + (musicAuthor ? ' — ' + esc(musicAuthor) : '') + '</span>';
    html += '</div>';
  }
  
  html += '</div>';
  
  // ===== CARD 2: Video Preview + Download =====
  html += '<div class="result-card" style="margin-bottom:12px">';
  html += '<div class="result-title">🎬 Video</div>';
  
  // Video player
  if (videoUrl) {
    html += '<video class="result-media" controls preload="metadata"';
    if (cover) html += ' poster="' + esc(cover) + '"';
    html += ' src="' + esc(videoUrl) + '" style="width:100%;border-radius:12px;background:#000"></video>';
  }
  
  html += '<div class="result-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">';
  if (videoHd) {
    html += '<a class="btn-action primary" href="' + esc(videoHd) + '" download target="_blank" rel="noopener">⬇️ HD No WM</a>';
  }
  if (videoWm && videoWm !== videoHd) {
    html += '<a class="btn-action" href="' + esc(videoWm) + '" download target="_blank" rel="noopener">⬇️ With WM</a>';
  }
  if (dd.music) {
    html += '<a class="btn-action" href="' + esc(dd.music) + '" download target="_blank" rel="noopener">🎵 Music</a>';
  }
  if (videoUrl) {
    html += '<button class="btn-action" data-copy="' + esc(videoUrl) + '">📋 Copy URL</button>';
  }
  html += '</div>';
  html += '</div>';
  
  return html;
}

// Expose ke window biar bisa dipakai dari luar
window.KazeTikTok = {
  isTikWM: isTikWM,
  render: renderTikTokCard,
  fmt: fmt,
  esc: esc
};

console.log('BETOx1: KazeTikTok siap');
})();
