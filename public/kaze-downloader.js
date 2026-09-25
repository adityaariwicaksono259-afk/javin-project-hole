(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

// Deteksi response downloader generik (AIO, capcut, tiktok v2)
function isDownloader(d){
  if (!d || typeof d !== 'object') return false;
  if (d.status === false && !d.ok) return false;
  var dd = d.data || d;

  // Ciri downloader: ada caption + data object dengan url atau video
  if (d.data && typeof d.data === 'object') {
    var hasUrl = d.data.url || d.data.video || d.data.videoUrl || d.data.originalVideoUrl || d.data.audio;
    var hasCaption = d.caption || d.data.caption || d.title;
    if (hasUrl && hasCaption) return true;
    // AIO: data.video + data.audio (no caption)
    if (d.data.video && d.data.audio && d.data.videoWM) return true;
    // AIO variant tanpa videoWM
    if (d.data.video && d.data.audio && !d.data.url) return true;
  }
  // TikTok v2: data.original + data.aweme_link
  if (d.data && d.data.original && d.data.itemId) return true;
  // IG Stories: array of { type, url }
  if (Array.isArray(d.data) && d.data.length > 0 && d.data[0].url && d.data[0].type) return true;
  // Capcut downloader: caption + data.url
  if (d.caption && d.data && d.data.url) return true;
  // Capcut: data.originalVideoUrl
  if (d.data && d.data.originalVideoUrl) return true;
  return false;
}

function pickVideoUrl(item){
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.url || item.video || item.videoUrl || item.originalVideoUrl || item.download || '';
}

function renderDownloader(d){
  var dd = d.data || d;
  var caption = d.caption || dd.caption || dd.title || '';
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden;margin-bottom:10px">';
  h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(34,211,238,.04);border-bottom:1px solid rgba(34,211,238,.08)">';
  h += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">⬇️</div>';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Downloader</div>';
  h += '</div>';

  if (caption) {
    h += '<div style="padding:14px 16px">';
    h += '<div style="font-size:12px;color:#cbd5e1;line-height:1.55">' + esc(String(caption).replace(/\n+/g,' ').slice(0, 280)) + '</div>';
    h += '</div>';
  }

  // Handle array (IG stories, dll)
  if (Array.isArray(dd) && dd.length > 0) {
    h += '<div style="padding:0 16px 14px">';
    h += '<div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;font-weight:700">' + dd.length + ' Media</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">';
    dd.forEach(function(item, i){
      var url = pickVideoUrl(item);
      var type = (item.type || 'media').toLowerCase();
      var thumb = item.thumbnail || item.image || '';
      var isVideo = type === 'mp4' || type === 'video' || type === 'mov' || /\.(mp4|mov|webm)/i.test(url);
      var isImage = type === 'jpg' || type === 'jpeg' || type === 'png' || type === 'webp' || type === 'image' || /\.(jpg|jpeg|png|webp|gif)/i.test(url);
      if (!url) return;

      h += '<div style="background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.15);border-radius:12px;overflow:hidden;display:flex;flex-direction:column">';

      // Preview (media)
      var previewSrc = thumb || (isImage ? url : '');
      if (previewSrc) {
        h += '<div style="position:relative;width:100%;aspect-ratio:9/16;background:#06111f;overflow:hidden">';
        h += '<img src="' + esc(previewSrc) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.style.display=\'none\'">';
        h += '<div style="position:absolute;top:6px;left:6px;background:rgba(6,17,31,.85);padding:2px 7px;border-radius:5px;font-size:9px;font-weight:700;color:#22d3ee;border:1px solid rgba(34,211,238,.3)">' + (isVideo ? '🎬 VIDEO' : '🖼️ FOTO') + '</div>';
        h += '</div>';
      } else {
        // Video preview placeholder (tanpa thumbnail)
        h += '<div style="position:relative;width:100%;aspect-ratio:9/16;background:linear-gradient(135deg,rgba(34,211,238,.15),rgba(14,165,233,.05));display:flex;align-items:center;justify-content:center">';
        h += '<div style="width:48px;height:48px;border-radius:50%;background:rgba(34,211,238,.15);border:2px solid rgba(34,211,238,.3);display:flex;align-items:center;justify-content:center;font-size:20px;color:#22d3ee">▶</div>';
        h += '<div style="position:absolute;top:6px;left:6px;background:rgba(6,17,31,.85);padding:2px 7px;border-radius:5px;font-size:9px;font-weight:700;color:#22d3ee;border:1px solid rgba(34,211,238,.3)">🎬 VIDEO</div>';
        h += '</div>';
      }

      // Info + button
      h += '<div style="padding:8px 10px;display:flex;flex-direction:column;gap:8px">';
      h += '<div style="font-size:10px;color:#64748b;font-weight:600;text-align:center">' + (isVideo ? 'Video' : 'Foto') + ' #' + (i+1) + '</div>';
      h += '<a href="' + esc(url) + '" download target="_blank" rel="noopener" style="padding:8px 12px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border-radius:8px;color:#06111f;font-size:11px;font-weight:700;text-decoration:none;text-align:center">⬇ Download</a>';
      h += '</div>';

      h += '</div>';
    });
    h += '</div>';
    h += '</div>';
  } else {
    // AIO special: video + audio + videoWM
    if (dd.video && dd.audio && (dd.videoWM || !dd.url)) {
      // Video preview
      h += '<div style="padding:0 16px 12px">';
      h += '<video controls preload="metadata" src="' + esc(dd.video) + '" style="width:100%;border-radius:12px;background:#000;display:block"></video>';
      h += '</div>';
      // Multi-download
      h += '<div style="padding:0 16px 14px">';
      h += '<div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;font-weight:700">Pilih Format</div>';
      if (dd.video) {
        h += '<a href="' + esc(dd.video) + '" download target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:linear-gradient(135deg,rgba(14,165,233,.15),rgba(34,211,238,.08));border:1px solid rgba(34,211,238,.3);border-radius:10px;margin-bottom:6px;text-decoration:none">';
        h += '<span style="font-size:16px">🎬</span><span style="flex:1;font-size:12.5px;font-weight:600;color:#e0f2fe">Video (No WM)</span><span style="color:#22d3ee;font-size:11px;font-weight:700">↓</span></a>';
      }
      if (dd.videoWM) {
        h += '<a href="' + esc(dd.videoWM) + '" download target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.15);border-radius:10px;margin-bottom:6px;text-decoration:none">';
        h += '<span style="font-size:16px">💧</span><span style="flex:1;font-size:12.5px;font-weight:600;color:#cbd5e1">Video (Watermark)</span><span style="color:#22d3ee;font-size:11px;font-weight:700">↓</span></a>';
      }
      if (dd.audio) {
        h += '<a href="' + esc(dd.audio) + '" download target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.15);border-radius:10px;margin-bottom:6px;text-decoration:none">';
        h += '<span style="font-size:16px">🎵</span><span style="flex:1;font-size:12.5px;font-weight:600;color:#cbd5e1">Audio MP3</span><span style="color:#22d3ee;font-size:11px;font-weight:700">↓</span></a>';
      }
      if (dd.photo && dd.photo !== false) {
        h += '<a href="' + esc(dd.photo) + '" download target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.15);border-radius:10px;text-decoration:none">';
        h += '<span style="font-size:16px">🖼️</span><span style="flex:1;font-size:12.5px;font-weight:600;color:#cbd5e1">Foto</span><span style="color:#22d3ee;font-size:11px;font-weight:700">↓</span></a>';
      }
      h += '</div>';
      h += '</div>';
      return h;
    }

    // Object dengan single url (default)
    var mainUrl = pickVideoUrl(dd);
    var thumb2 = dd.thumbnail || dd.image || dd.cover || dd.origin_cover || '';
    var title = dd.title || '';

    if (thumb2) {
      h += '<div style="padding:0 16px 12px">';
      h += '<div style="border-radius:10px;overflow:hidden;background:#06111f">';
      h += '<img src="' + esc(thumb2) + '" style="width:100%;display:block;max-height:280px;object-fit:contain">';
      h += '</div></div>';
    }

    // Sub-URLs (audio, HD, SD, dll)
    var variants = [];
    if (dd.audio) variants.push({ label: 'Audio / MP3', url: dd.audio, icon: '🎵' });
    if (dd.original) variants.push({ label: 'Original', url: dd.original, icon: '🎬' });
    if (dd.hdplay) variants.push({ label: 'HD (No WM)', url: dd.hdplay, icon: '⬇️' });
    if (dd.play) variants.push({ label: 'Video', url: dd.play, icon: '⬇️' });
    if (dd.wmplay) variants.push({ label: 'Watermark', url: dd.wmplay, icon: '💧' });
    if (dd.originalVideoUrl) variants.push({ label: 'Video Original', url: dd.originalVideoUrl, icon: '🎬' });
    if (dd.download) variants.push({ label: 'Download', url: dd.download, icon: '⬇️' });
    if (mainUrl && !variants.length) variants.push({ label: 'Download', url: mainUrl, icon: '⬇️' });

    if (variants.length) {
      h += '<div style="padding:0 16px 14px">';
      variants.forEach(function(v){
        if (!v.url || typeof v.url !== 'string') return;
        h += '<a href="' + esc(v.url) + '" download target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.15);border-radius:8px;margin-bottom:6px;text-decoration:none">';
        h += '<span style="font-size:16px">' + v.icon + '</span>';
        h += '<span style="flex:1;font-size:12px;font-weight:600;color:#e0f2fe">' + esc(v.label) + '</span>';
        h += '<span style="color:#22d3ee;font-size:11px">→</span>';
        h += '</a>';
      });
      h += '</div>';
    }
  }

  h += '</div>';
  return h;
}

window.KazeDownloader = { isDownloader: isDownloader, render: renderDownloader };
console.log('BETOx1: KazeDownloader siap');
})();
