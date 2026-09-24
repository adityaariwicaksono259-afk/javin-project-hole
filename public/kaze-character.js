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
// Avatar: coba beberapa CDN, fallback placeholder
function avatarCandidates(path){
  if (!path) return [];
  if (/^https?:/.test(path)) return [path];
  var clean = path.replace(/^\/+/, '');
  return [
    'https://plus.character.ai/i/200/static/' + clean,
    'https://characterai.io/i/200/static/' + clean,
    'https://character.ai/i/200/static/' + clean
  ];
}
function isCharacterArray(d){
  if (!d || typeof d !== 'object') return false;
  var arr = Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : null);
  if (!arr || arr.length === 0) return false;
  var first = arr[0];
  return !!(first && first.document && first.document.character_id && first.document.name);
}
function renderCharacters(d){
  var arr = Array.isArray(d) ? d : d.data;
  var html = '';
  html += '<div class="result-card" style="margin-bottom:12px">';
  html += '<div class="result-title">🤖 Character.AI (' + arr.length + ' hasil)</div>';
  html += '</div>';

  arr.forEach(function(item){
    try {
      var doc = item.document || {};
      var name = doc.name || 'Unknown';
      var title = doc.title || '';
      var avatar = doc.avatar_url || '';
      var creator = doc.creator_username || 'anon';
      var messages = doc.num_messages || 0;
      var tags = doc.tags || [];
      var charId = doc.character_id || '';
      var isNsfw = doc.is_nsfw || false;

      html += '<div class="result-card" style="margin-bottom:10px">';

      // Header
      html += '<div style="display:flex;gap:12px;align-items:flex-start">';
      // Pakai placeholder aja dulu (avatar CDN banyak yang 404)
      html += '<div style="width:64px;height:64px;border-radius:12px;background:linear-gradient(135deg,rgba(34,211,238,.2),rgba(14,165,233,.1));flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:28px;border:1px solid rgba(34,211,238,.25)">🤖</div>';
      html += '<div style="min-width:0;flex:1">';
      html += '<div style="font-weight:700;font-size:14px;color:#e0f2fe;line-height:1.3">' + esc(name);
      if (isNsfw) html += ' <span style="background:#ef4444;color:#fff;font-size:9px;padding:1px 5px;border-radius:4px;vertical-align:middle">NSFW</span>';
      html += '</div>';
      html += '<div style="font-size:11px;color:#94a3b8;margin-top:2px">👤 @' + esc(creator) + '</div>';
      html += '<div style="font-size:11px;color:#64748b;margin-top:2px">💬 ' + fmt(messages) + ' messages</div>';
      html += '</div></div>';

      // Title/description
      if (title) {
        var cleanTitle = String(title).replace(/\n+/g, ' ').trim().slice(0, 200);
        html += '<div style="font-size:12px;color:#cbd5e1;margin-top:10px;padding-top:10px;border-top:1px solid rgba(34,211,238,.12);line-height:1.5">' + esc(cleanTitle) + '</div>';
      }

      // Tags
      if (tags.length) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">';
        tags.slice(0, 8).forEach(function(t){
          html += '<span style="font-size:10px;padding:2px 7px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);border-radius:10px;color:#22d3ee">' + esc(t) + '</span>';
        });
        html += '</div>';
      }

      // Actions
      html += '<div class="result-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">';
      if (charId) {
        html += '<a class="btn-action primary" href="https://character.ai/chat/' + esc(charId) + '" target="_blank" rel="noopener">💬 Chat</a>';
        html += '<button class="btn-action" data-copy="' + esc(charId) + '">📋 Copy ID</button>';
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
console.log('BETOx1: KazeCharacter v2 siap');
})();
