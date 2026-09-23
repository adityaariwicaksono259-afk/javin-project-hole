(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function isFB(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || !Array.isArray(dd.downloads)) return false;
  // Ciri: title + downloads array dengan quality/type/url
  return !!(dd.title && dd.downloads.length > 0 && dd.downloads[0].url);
}
function renderFB(d){
  var dd = d.data || d;
  var title = dd.title || 'Facebook Video';
  var thumb = dd.thumbnail || '';
  var duration = dd.duration || '';
  var downloads = dd.downloads || [];
  var html = '<div class="result-card" style="margin-bottom:12px">';
  html += '<div class="result-title">🎬 Facebook Video</div>';
  if (thumb && !/\.gif$/.test(thumb)) {
    html += '<div style="width:100%;border-radius:12px;overflow:hidden;background:#000;margin:8px 0">';
    html += '<img src="' + esc(thumb) + '" style="width:100%;display:block;aspect-ratio:16/9;object-fit:cover" onerror="this.style.display=\'none\'">';
    html += '</div>';
  }
  html += '<div style="font-weight:700;font-size:14px;color:#e0f2fe;line-height:1.3;padding-top:4px">' + esc(title) + '</div>';
  if (duration) {
    html += '<div style="font-size:12px;color:#94a3b8;margin-top:4px">⏱ ' + esc(duration) + '</div>';
  }
  // Downloads
  if (downloads.length) {
    html += '<div style="margin-top:12px">';
    html += '<div style="font-size:11px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Pilih Kualitas:</div>';
    downloads.forEach(function(dl, i){
      var label = dl.quality || ('Opsi ' + (i+1));
      var type = dl.type || 'video';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.15);border-radius:8px;margin-bottom:6px">';
      html += '<div><div style="font-weight:600;font-size:12px;color:#e0f2fe">' + esc(label) + '</div>';
      html += '<div style="font-size:10px;color:#64748b">' + esc(type) + '</div></div>';
      html += '<a class="btn-action primary" href="' + esc(dl.url) + '" download target="_blank" rel="noopener" style="padding:6px 12px;font-size:11px">⬇️ Download</a>';
      html += '</div>';
    });
    html += '</div>';
  }
  // Copy URL utama
  if (downloads.length) {
    html += '<div class="result-actions" style="display:flex;gap:8px;margin-top:8px">';
    html += '<button class="btn-action" data-copy="' + esc(downloads[0].url) + '">📋 Copy URL HD</button>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}
window.KazeFacebook = { isFB: isFB, render: renderFB };
console.log('BETOx1: KazeFacebook siap');
})();
