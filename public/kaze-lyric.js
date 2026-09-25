(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isLyricData(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || typeof dd !== 'object') return false;
  return !!(dd.title && dd.lyric && typeof dd.lyric === 'string' && dd.lyric.length > 20);
}

function renderLyric(d){
  var dd = d.data || d;
  var title = dd.title || 'Lyric';
  var lyric = dd.lyric || '';
  var uid = 'ly-' + Math.random().toString(36).slice(2, 8);

  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden">';

  // Header
  h += '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(34,211,238,.08);background:rgba(34,211,238,.03)">';
  h += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🎵</div>';
  h += '<div style="min-width:0;flex:1">';
  h += '<div style="font-size:13px;font-weight:700;color:#e0f2fe;line-height:1.3">' + esc(title) + '</div>';
  h += '<div style="font-size:10px;color:#64748b;margin-top:2px">Lyric</div>';
  h += '</div>';
  h += '<button class="kz-copy-btn" data-copy="' + encodeURIComponent(lyric) + '" style="padding:6px 12px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);color:#7dd3fc;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;flex-shrink:0">Copy</button>';
  h += '</div>';

  // Lyric body
  h += '<div id="' + uid + '" style="padding:20px 18px;font-size:13.5px;color:#cbd5e1;line-height:1.85;white-space:pre-wrap;word-wrap:break-word;max-height:600px;overflow-y:auto">' + esc(lyric) + '</div>';

  h += '</div>';
  return h;
}

// Copy handler
document.addEventListener('click', function(e){
  var b = e.target.closest('.kz-copy-btn');
  if (!b) return;
  var txt = decodeURIComponent(b.getAttribute('data-copy') || '');
  if (!txt) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function(){
      b.textContent = 'Copied!';
      setTimeout(function(){ b.textContent = 'Copy'; }, 1500);
    }).catch(function(){});
  }
});

window.KazeLyric = { isLyricData: isLyricData, render: renderLyric };
console.log('BETOx1: KazeLyric siap');
})();
