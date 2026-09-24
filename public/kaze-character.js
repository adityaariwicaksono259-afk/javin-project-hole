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
function isCharacterArray(d){
  if (!d || typeof d !== 'object') return false;
  var arr = Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : null);
  if (!arr || arr.length === 0) return false;
  var first = arr[0];
  return !!(first && first.document && first.document.character_id && first.document.name);
}
function initials(name){
  if (!name) return '?';
  var parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function renderCharacters(d){
  var arr = Array.isArray(d) ? d : d.data;

  var html = '';
  // Header count
  html += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:4px 2px 16px;">';
  html += '<div style="font-size:13px;font-weight:600;color:#e0f2fe;letter-spacing:.3px">Character.AI</div>';
  html += '<div style="font-size:11px;color:#64748b;font-family:ui-monospace,monospace">' + arr.length + ' results</div>';
  html += '</div>';

  arr.forEach(function(item){
    try {
      var doc = item.document || {};
      var name = doc.name || 'Unknown';
      var title = doc.title || '';
      var creator = doc.creator_username || 'anon';
      var messages = doc.num_messages || 0;
      var tags = doc.tags || [];
      var charId = doc.character_id || '';
      var isNsfw = doc.is_nsfw || false;

      // Card container
      html += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:14px;padding:16px;margin-bottom:10px;">';

      // Top: avatar + name + creator
      html += '<div style="display:flex;gap:14px;align-items:flex-start;">';

      // Initials avatar (no image, clean)
      html += '<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,rgba(34,211,238,.15),rgba(14,165,233,.05));border:1px solid rgba(34,211,238,.2);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#22d3ee;letter-spacing:.5px">' + initials(name) + '</div>';

      html += '<div style="min-width:0;flex:1;">';
      // Name row
      html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
      html += '<div style="font-weight:600;font-size:14px;color:#e0f2fe;line-height:1.3">' + esc(name) + '</div>';
      if (isNsfw) {
        html += '<span style="font-size:9px;font-weight:600;letter-spacing:.5px;padding:1px 6px;background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:4px">NSFW</span>';
      }
      html += '</div>';

      // Meta row
      html += '<div style="display:flex;gap:10px;align-items:center;margin-top:4px;font-size:11px;color:#64748b">';
      html += '<span style="color:#94a3b8">@' + esc(creator) + '</span>';
      html += '<span style="width:3px;height:3px;border-radius:50%;background:#334155"></span>';
      html += '<span>' + fmt(messages) + ' chats</span>';
      html += '</div>';
      html += '</div></div>';

      // Description
      if (title) {
        var cleanTitle = String(title).replace(/\n+/g, ' ').trim().slice(0, 180);
        html += '<div style="font-size:12px;color:#94a3b8;margin-top:12px;line-height:1.55;padding-top:12px;border-top:1px solid rgba(34,211,238,.06)">' + esc(cleanTitle) + '</div>';
      }

      // Tags
      if (tags.length) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:12px">';
        tags.slice(0, 6).forEach(function(t){
          html += '<span style="font-size:10px;font-weight:500;padding:3px 9px;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.15);border-radius:6px;color:#7dd3fc;letter-spacing:.2px">' + esc(t) + '</span>';
        });
        if (tags.length > 6) {
          html += '<span style="font-size:10px;padding:3px 9px;color:#64748b">+' + (tags.length - 6) + '</span>';
        }
        html += '</div>';
      }

      // Actions
      html += '<div style="display:flex;gap:8px;margin-top:14px">';
      if (charId) {
        html += '<a href="https://character.ai/chat/' + esc(charId) + '" target="_blank" rel="noopener" style="flex:1;text-align:center;padding:9px 14px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);color:#06111f;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;letter-spacing:.3px">Chat</a>';
        html += '<button data-copy="' + esc(charId) + '" style="padding:9px 14px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);color:#7dd3fc;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Copy ID</button>';
      }
      html += '</div>';

      html += '</div>';
    } catch(e) {
      console.error('Character render error:', e);
    }
  });

  return html;
}
window.KazeCharacter = { isCharacterArray: isCharacterArray, render: renderCharacters };
console.log('BETOx1: KazeCharacter v3 (modern)');
})();
