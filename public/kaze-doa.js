(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isDoaList(d){
  if (!d || typeof d !== 'object') return false;
  if (!Array.isArray(d.data)) return false;
  if (d.data.length === 0) return false;
  var f = d.data[0];
  return !!(f.judul && f.arab && f.terjemahan);
}

function renderDoa(d){
  var arr = d.data || [];
  var h = '';
  // Header
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Doa Harian</div>';
  h += '<div style="font-size:11px;color:#64748b;font-family:ui-monospace,monospace">' + arr.length + ' doa</div>';
  h += '</div>';

  arr.forEach(function(d, i){
    var judul = d.judul || 'Doa';
    var arab = d.arab || '';
    var latin = d.latin || '';
    var arti = d.terjemahan || '';
    var faedah = d.faedah || '';
    var sumber = d.sumber || '';

    h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:14px;margin-bottom:12px;overflow:hidden">';

    // Header nomor + judul
    h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(34,211,238,.04);border-bottom:1px solid rgba(34,211,238,.08)">';
    h += '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;color:#06111f;font-weight:700;font-size:12px;flex-shrink:0">' + (i + 1) + '</div>';
    h += '<div style="font-size:13px;font-weight:600;color:#e0f2fe;line-height:1.3">' + esc(judul) + '</div>';
    h += '</div>';

    h += '<div style="padding:14px">';

    // Arab
    if (arab) {
      h += '<div dir="rtl" style="font-family:\\'Noto Naskh Arabic\\', \\'Amiri\\', serif;font-size:20px;line-height:2;color:#e0f2fe;text-align:right;padding:10px 4px 14px;letter-spacing:0">' + esc(arab) + '</div>';
    }

    // Latin
    if (latin) {
      h += '<div style="font-size:12.5px;color:#7dd3fc;font-style:italic;line-height:1.6;padding:8px 0;border-top:1px solid rgba(34,211,238,.08)">' + esc(latin) + '</div>';
    }

    // Terjemahan
    if (arti) {
      h += '<div style="font-size:12.5px;color:#cbd5e1;line-height:1.6;padding:10px 0;border-top:1px solid rgba(34,211,238,.08)">';
      h += '<div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Terjemahan</div>';
      h += esc(arti);
      h += '</div>';
    }

    // Faedah
    if (faedah) {
      h += '<div style="background:rgba(34,211,238,.05);border-left:3px solid #22d3ee;border-radius:6px;padding:8px 12px;margin-top:10px;font-size:11.5px;color:#94a3b8;line-height:1.55">';
      h += '<span style="color:#22d3ee;font-weight:600">Faedah: </span>' + esc(faedah);
      h += '</div>';
    }

    // Sumber
    if (sumber) {
      h += '<div style="font-size:10.5px;color:#475569;margin-top:8px;font-family:ui-monospace,monospace">📚 ' + esc(sumber) + '</div>';
    }

    h += '</div></div>';
  });

  return h;
}

window.KazeDoa = { isDoaList: isDoaList, render: renderDoa };
console.log('BETOx1: KazeDoa siap');
})();
