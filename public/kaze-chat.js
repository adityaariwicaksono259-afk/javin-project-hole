(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isChatResponse(d){
  if (!d || typeof d !== 'object') return false;
  if (d.status === false) return false;
  var dd = d.data || d;

  // Cek message (paling umum)
  if (dd && typeof dd.message === 'string' && dd.message.trim().length > 5) return true;
  if (dd && typeof dd.answer === 'string' && dd.answer.trim().length > 5) return true;
  if (dd && typeof dd.response === 'string' && dd.response.trim().length > 5) return true;
  if (dd && typeof dd.reply === 'string' && dd.reply.trim().length > 5) return true;
  // Deepsek: field "result" di root
  if (typeof d.result === 'string' && d.result.trim().length > 5) return true;
  // Gita: field "data" langsung string di root
  if (typeof d.data === 'string' && d.data.trim().length > 5) return true;
  return false;
}

function mdToHtml(text){
  var s = esc(text);
  s = s.replace(/```([\s\S]*?)```/g, function(m, code){
    return '<pre style="background:rgba(0,0,0,.4);border:1px solid rgba(34,211,238,.15);border-radius:8px;padding:12px;overflow-x:auto;font-family:ui-monospace,monospace;font-size:12px;color:#7dd3fc;line-height:1.5;margin:10px 0">' + code.trim() + '</pre>';
  });
  s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(34,211,238,.12);color:#22d3ee;padding:1px 6px;border-radius:4px;font-family:ui-monospace,monospace;font-size:12.5px">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e0f2fe;font-weight:600">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em style="color:#cbd5e1">$2</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#22d3ee;text-decoration:none;border-bottom:1px solid rgba(34,211,238,.4)">$1</a>');
  s = s.replace(/^### (.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#22d3ee;margin:12px 0 6px">$1</div>');
  s = s.replace(/^## (.+)$/gm, '<div style="font-size:15px;font-weight:700;color:#22d3ee;margin:14px 0 8px">$1</div>');
  s = s.replace(/^# (.+)$/gm, '<div style="font-size:16px;font-weight:700;color:#22d3ee;margin:16px 0 8px">$1</div>');
  s = s.replace(/^[-*] (.+)$/gm, '<div style="padding-left:16px;position:relative;margin:4px 0"><span style="position:absolute;left:2px;color:#22d3ee">•</span>$1</div>');
  s = s.replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:20px;position:relative;margin:4px 0"><span style="position:absolute;left:0;color:#22d3ee;font-weight:600">$1.</span>$2</div>');
  s = s.replace(/\n/g, '<br>');
  s = s.replace(/(<\/pre>|<\/div>)<br>/g, '$1');
  s = s.replace(/<br>(<pre|<div style="font-size:1[456]px)/g, '$1');
  return s;
}

function extractText(d){
  if (typeof d.result === 'string') return d.result;
  if (typeof d.data === 'string') return d.data;
  var dd = d.data || d;
  if (dd && typeof dd === 'object') {
    if (typeof dd.message === 'string' && dd.message.trim()) return dd.message;
    if (typeof dd.answer === 'string' && dd.answer.trim()) return dd.answer;
    if (typeof dd.response === 'string' && dd.response.trim()) return dd.response;
    if (typeof dd.reply === 'string' && dd.reply.trim()) return dd.reply;
    if (typeof dd.result === 'string' && dd.result.trim()) return dd.result;
  }
  return '';
}

function renderChat(d){
  var text = extractText(d);
  var author = d.author || d.creator || 'Javin AI';
  var modelName = (d.data && d.data.model) || '';

  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden;margin-bottom:10px">';

  // Header
  h += '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(34,211,238,.08);background:rgba(34,211,238,.03)">';
  h += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-weight:800;color:#06111f;font-size:13px;flex-shrink:0">AI</div>';
  h += '<div style="min-width:0;flex:1">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">' + esc(author) + '</div>';
  if (modelName) h += '<div style="font-size:10px;color:#64748b">' + esc(modelName) + '</div>';
  h += '</div>';
  h += '<div style="font-size:10px;color:#475569;font-family:ui-monospace,monospace">' + text.length + ' chars</div>';
  h += '</div>';

  // Body
  h += '<div style="padding:16px;font-size:13.5px;color:#cbd5e1;line-height:1.65;word-wrap:break-word;overflow-wrap:break-word">';
  h += mdToHtml(text);
  h += '</div>';

  // Copy
  var textEnc = encodeURIComponent(text);
  h += '<div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid rgba(34,211,238,.06);background:rgba(0,0,0,.15)">';
  h += '<button class="kz-copy-btn" data-copy="' + textEnc + '" style="padding:7px 14px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);color:#7dd3fc;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Copy</button>';
  h += '</div>';

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
  } else {
    var ta = document.createElement('textarea');
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    b.textContent = 'Copied!';
    setTimeout(function(){ b.textContent = 'Copy'; }, 1500);
  }
});

window.KazeChat = { isChatResponse: isChatResponse, render: renderChat };
console.log('BETOx1: KazeChat v2 — multi-format');
})();
