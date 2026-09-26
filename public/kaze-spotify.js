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
  // Format ep040: service=spotify + tracks[]
  if (d.service === 'spotify' && Array.isArray(d.tracks) && d.tracks.length > 0) return true;
  if (d.data && d.data.service === 'spotify' && Array.isArray(d.data.tracks)) return true;
  // Format ep039: data.thumbnail + data.title + data.preview/url
  var dd = d.data || d;
  if (dd && dd.thumbnail && dd.title && (dd.preview || dd.url) && /scdn\.co|spotify/i.test(dd.thumbnail)) return true;
  // Format ep041 (spotify play): data.cover + data.title + data.artist + data.mp3_url
  if (dd && dd.cover && dd.title && dd.mp3_url) return true;
  return false;
}

function renderSpotifySingle(dd){
  // Format ep039: single track
  var title = dd.title || 'Unknown';
  var artist = dd.artist || '-';
  var cover = dd.thumbnail || '';
  var duration = dd.duration || '';
  var preview = dd.preview || '';
  var fullUrl = dd.url || '';

  var h = '';
  h += '<div class="result-card" style="margin-bottom:12px">';
  h += '<div class="result-title">🎵 Spotify</div>';
  h += '<div style="display:flex;gap:12px;align-items:flex-start;padding-top:8px">';
  if (cover) {
    h += '<img src="' + esc(cover) + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#e2e8f0">';
  } else {
    h += '<div style="width:80px;height:80px;border-radius:8px;background:#e2e8f0;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:32px">🎵</div>';
  }
  h += '<div style="min-width:0;flex:1">';
  h += '<div style="font-weight:700;font-size:14px;color:#0f172a;line-height:1.3;margin-bottom:2px">' + esc(title) + '</div>';
  h += '<div style="font-size:12px;color:#64748b;margin-bottom:2px">' + esc(artist) + '</div>';
  if (duration) h += '<div style="font-size:11px;color:#94a3b8">⏱ ' + esc(duration) + '</div>';
  h += '</div></div>';
  // Audio preview kalau ada
  if (preview) {
    h += '<div style="margin-top:12px">';
    h += '<div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:6px">Preview 30 Detik</div>';
    h += '<audio controls preload="metadata" style="width:100%" src="' + esc(preview) + '"></audio>';
    h += '</div>';
  }
  // Full download
  if (fullUrl) {
    h += '<div class="result-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">';
    h += '<a class="btn-action primary" href="' + esc(fullUrl) + '" download target="_blank" rel="noopener">⬇️ Download MP3 Full</a>';
    h += '<button class="btn-action" data-copy="' + esc(fullUrl) + '">📋 Copy URL</button>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}

function renderSpotify(d){
  var dd = d.data || d;

  // Kalau format ep039 (single track dengan thumbnail)
  if (!Array.isArray(dd.tracks) && dd.thumbnail && dd.title) {
    return renderSpotifySingle(dd);
  }
  // Kalau format ep041 (spotify play: cover + title + mp3_url)
  if (!Array.isArray(dd.tracks) && dd.cover && dd.title && dd.mp3_url) {
    return renderSpotifySingle({
      thumbnail: dd.cover,
      title: dd.title,
      artist: dd.artist || '',
      duration: dd.duration || '',
      preview: '',
      url: dd.mp3_url,
      album: dd.album || '',
      year: dd.year || ''
    });
  }

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
