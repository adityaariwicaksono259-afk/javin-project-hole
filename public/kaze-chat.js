(function(){
'use strict';

function esc(s){
  return String(s||'').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

// Deteksi response AI chat
function isChatResponse(d){
  if (!d || typeof d !== 'object') return false;
  if (d.status === false) return false;
  var dd = d.data || d;
  if (!dd || typeof dd !== 'object') return false;
  // Ciri: ada field message (string non-kosong) + optional author
  if (typeof dd.message === 'string' && dd.message.trim().length > 0) return true;
  if (typeof dd.answer === 'string' && dd.answer.trim().length > 0) return true;
  if (typeof dd.result === 'string' && dd.result.trim().length > 0 && !dd.url) return true;
  if (typeof dd.response === 'string' && dd.response.trim().length > 0) return true;
  if (typeof dd.reply === 'string' && dd.reply.trim().length > 0) return true;
  return false;
}

// Lightweight markdown renderer
function mdToHtml(text){
  var s = esc(text);
  
  // Code blocks ```...```
  s = s.replace(/```([\s\S]*?)```/g, function(m, code){
    return '<pre style="background:rgba(0,0,0,.4);border:1px solid rgba(34,211,238,.15);border-radius:8px;padding:12px;overflow-x:auto;font-family:ui-monospace,monospace;font-size:12px;color:#7dd3fc;line-height:1.5;margin:10px 0">' + code.trim() + '</pre>';
  });
  
  // Inline code `...`
  s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(34,211,238,.12);color:#22d3ee;padding:1px 6px;border-radius:4px;font-family:ui-monospace,monospace;font-size:12.5px">$1</code>');
  
  // Bold **...**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e0f2fe;font-weight:600">$1</strong>');
  
  // Italic *...*
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em style="color:#cbd5e1">$2</em>');
  
  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#22d3ee;text-decoration:none;border-bottom:1px solid rgba(34,211,238,.4)">$1</a>');
  
  // Headers ### / ## / #
  s = s.replace(/^### (.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#22d3ee;margin:12px 0 6px">$1</div>');
  s = s.replace(/^## (.+)$/gm, '<div style="font-size:15px;font-weight:700;color:#22d3ee;margin:14px 0 8px">$1</div>');
  s = s.replace(/^# (.+)$/gm, '<div style="font-size:16px;font-weight:700;color:#22d3ee;margin:16px 0 8px">$1</div>');
  
  // List - item
  s = s.replace(/^[-*] (.+)$/gm, '<div style="padding-left:16px;position:relative;margin:4px 0"><span style="position:absolute;left:2px;color:#22d3ee">•</span>$1</div>');
  
  // Numbered list 1. item
  s = s.replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:20px;position:relative;margin:4px 0"><span style="position:absolute;left:0;color:#22d3ee;font-weight:600">$1.</span>$2</div>');
  
  // Line breaks
  s = s.replace(/\n/g, '<br>');
  
  // Cleanup extra breaks after block elements
  s = s.replace(/(<\/pre>|<\/div>)<br>/g, '$1');
  s = s.replace(/<br>(<pre|<div style="font-size:1[456]px)/g, '$1');
  
  return s;
}

function renderChat(d){
  var dd = d.data || d;
  var text = dd.message || dd.answer || dd.result || dd.response || dd.reply || '';
  var author = d.author || dd.model || dd.author || 'Javin AI';
  var modelName = dd.model || '';
  
  var html = '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;padding:0;margin-bottom:10px;overflow:hidden">';
  
  // Header
  html += '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(34,211,238,.08);background:rgba(34,211,238,.03)">';
  html += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-weight:800;color:#06111f;font-size:14px;flex-shrink:0">AI</div>';
  html += '<div style="min-width:0;flex:1">';
  html += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">' + esc(author) + '</div>';
  if (modelName) html += '<div style="font-size:10px;color:#64748b">' + esc(modelName) + '</div>';
  html += '</div>';
  html += '<div style="font-size:10px;color:#475569;font-family:ui-monospace,monospace">' + text.length + ' chars</div>';
  html += '</div>';
  
  // Body
  html += '<div style="padding:16px;font-size:13.5px;color:#cbd5e1;line-height:1.65;word-wrap:break-word;overflow-wrap:break-word">';
  html += mdToHtml(text);
  html += '</div>';
  
  // Footer actions
  html += '<div style="display:flex;gap:8px;padding:10px 16px;border-top:1px solid rgba(34,211,238,.06);background:rgba(0,0,0,.15)">';
  html += '<button data-copy="' + esc(text).replace(/"/g, '&quot;') + '" style="padding:7px 14px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.2);color:#7dd3fc;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">Copy</button>';
  html += '</div>';
  
  html += '</div>';
  
  return html;
}

window.KazeChat = { isChatResponse: isChatResponse, render: renderChat };
console.log('BETOx1: KazeChat siap');
})();
