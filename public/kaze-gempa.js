(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isGempa(d){
  if (!d || typeof d !== 'object') return false;
  if (!d.status || !d.data) return false;
  var dd = d.data;
  if (!dd.auto || !dd.auto.Infogempa) return false;
  return !!dd.auto.Infogempa.gempa;
}

function renderGempa(d){
  var g = d.data.auto.Infogempa.gempa;
  var h = '';

  h += '<div style="background:linear-gradient(135deg,rgba(239,68,68,.12),rgba(245,158,11,.08));border:1px solid rgba(239,68,68,.3);border-radius:16px;overflow:hidden;margin-bottom:12px">';

  // Header
  h += '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(239,68,68,.08);border-bottom:1px solid rgba(239,68,68,.2)">';
  h += '<div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#ef4444,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🌋</div>';
  h += '<div>';
  h += '<div style="font-size:13px;font-weight:700;color:#fca5a5">Info Gempa Terbaru</div>';
  h += '<div style="font-size:10px;color:#94a3b8;margin-top:2px">Sumber: BMKG</div>';
  h += '</div>';
  h += '</div>';

  h += '<div style="padding:16px">';

  // Magnitude (besar)
  h += '<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:14px">';
  h += '<div style="font-size:42px;font-weight:300;color:#ef4444;line-height:1;letter-spacing:-1.5px">' + esc(g.Magnitude) + '</div>';
  h += '<div style="font-size:12px;color:#fca5a5;font-weight:600">SR</div>';
  h += '</div>';

  // Info rows
  var rows = [];
  if (g.Tanggal) rows.push({label:'📅 Tanggal', val: g.Tanggal + (g.Jam ? ' · ' + g.Jam : '')});
  if (g.Lintang && g.Bujur) rows.push({label:'📍 Koordinat', val: g.Lintang + ', ' + g.Bujur});
  if (g.Kedalaman) rows.push({label:'⬇️ Kedalaman', val: g.Kedalaman});
  if (g.Wilayah) rows.push({label:'🗺️ Wilayah', val: g.Wilayah});
  if (g.Potensi) rows.push({label:'⚠️ Potensi', val: g.Potensi, accent: /tsunami/i.test(g.Potensi)});

  rows.forEach(function(r){
    h += '<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(239,68,68,.1)">';
    h += '<div style="font-size:11px;color:#94a3b8;flex-shrink:0">' + r.label + '</div>';
    h += '<div style="font-size:12px;font-weight:600;color:' + (r.accent ? '#fca5a5' : '#e0f2fe') + ';text-align:right;line-height:1.5;word-break:break-word">' + esc(String(r.val)) + '</div>';
    h += '</div>';
  });

  // Dirasakan
  if (g.Dirasakan) {
    h += '<div style="margin-top:12px;padding:10px 12px;background:rgba(245,158,11,.08);border-left:3px solid #f59e0b;border-radius:6px">';
    h += '<div style="font-size:10px;color:#fbbf24;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:4px">Dirasakan</div>';
    h += '<div style="font-size:11.5px;color:#fcd34d;line-height:1.5">' + esc(g.Dirasakan) + '</div>';
    h += '</div>';
  }

  h += '</div></div>';
  return h;
}

window.KazeGempa = { isGempa: isGempa, render: renderGempa };
console.log('BETOx1: KazeGempa siap');
})();
