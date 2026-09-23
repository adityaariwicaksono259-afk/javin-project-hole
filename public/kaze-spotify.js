/* ===== KAZE Spotify Card ===== */
(function(){
'use strict';

function esc(s){
  return String(s||'').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function isSpotify(d){
  if (!d || typeof d !== 'object') return false;
  // Deteksi: service=spotify + ada tracks
  if (d.service === 'spotify' && Array.isArray(d.tracks) && d.tracks.length > 0) return true;
  // Deteksi dari data wrapper
  if (d.data && d.data.service === 'spotify' && Array.isArray(d.data.tracks)) return true;
  return false;
}

function renderSpotify(d){
  var dd = d.data || d;
  var tracks = dd.tracks || [];
  var html = '';

  // Header
  html += '<div class="result-card" style="margin-bottom:12px">';
  html += '<div class="result-title">🎵 Spotify</div>';
  html += '<div style="font-size:12px;color:#64748b;padding:4px 0">' + tracks.length + ' track ditemukan</div>';
  html += '</div>';

  // Setiap track = 1 card
  tracks.forEach(function(t, i){
    html += '<div class="result-card" style="margin-bottom:12px">';
    
    // Cover + info
    html += '<div style="display:flex;gap:12px;align-items:flex-start">';
    if (t.cover) {
      html += '<img src="' + esc(t.cover) + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#e2e8f0" onerror="this.style.display=\'none\'">';
    } else {
      html += '<div style="width:80px;height:80px;border-radius:8px;background:#e2e8f0;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:32px">🎵</div>';
    }
    html += '<div style="min-width:0;flex:1">';
    html += '<div style="font-weight:700;font-size:14px;color:#0f172a;line-height:1.3;margin-bottom:2px">' + esc(t.name || 'Unknown') + '</div>';
    html += '<div style="font-size:12px;color:#64748b;margin-bottom:2px">' + esc(t.artist || '-') + '</div>';
    if (t.album) {
      html += '<div style="font-size:11px;color:#94a3b8">💿 ' + esc(t.album) + (t.year ? ' · ' + t.year : '') + '</div>';
    }
    if (t.duration) {
      html += '<div style="font-size:11px;color:#94a3b8">⏱ ' + esc(t.duration) + '</div>';
    }
    html += '</div>';
    html += '</div>';

    // Audio preview (kalau mp3_url)
    if (t.mp3_url) {
      html += '<audio controls preload="none" style="width:100%;margin-top:12px" src="' + esc(t.mp3_url) + '"></audio>';
    }

    // Buttons
    html += '<div class="result-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">';
    if (t.mp3_url) {
      html += '<a class="btn-action primary" href="' + esc(t.mp3_url) + '" download target="_blank" rel="noopener">⬇️ Download MP3</a>';
      html += '<button class="btn-action" data-copy="' + esc(t.mp3_url) + '">📋 Copy URL</button>';
    }
    html += '</div>';
    html += '</div>';
  });

  return html;
}

window.KazeSpotify = {
  isSpotify: isSpotify,
  render: renderSpotify
};

console.log('BETOx1: KazeSpotify siap');
})();
