(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function isCuaca(d){
  if (!d || typeof d !== 'object') return false;
  if (!d.service || d.service !== 'cuaca') return false;
  if (!d.data || !d.data.realtime) return false;
  return true;
}
function renderCuaca(d){
  var meta = d.meta || {};
  var loc = d.location || {};
  var rt = (d.data && d.data.realtime && d.data.realtime.data) || {};
  var cu = rt.cuaca || {};
  var forecast = (d.data && d.data.forecast && d.data.forecast.data) || [];

  var query = String(meta.query || '').toLowerCase().trim();
  var kota = String(loc.kotkab || '').toLowerCase();
  var desa = String(loc.desa || '').toLowerCase();
  var prov = loc.provinsi || '';

  // Warning kalau query cocok sama desa/kelurahan, tapi bukan kota
  var warning = '';
  if (query && desa === query && kota && kota.indexOf(query) === -1) {
    var kotaBersih = loc.kotkab.replace(/^(Kota|Kabupaten|Administrasi)\s+/i, '');
    warning = '<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:10px;padding:10px 12px;margin-bottom:12px;">' +
      '<div style="font-size:11px;color:#fbbf24;font-weight:600;margin-bottom:3px">Perhatian</div>' +
      '<div style="font-size:11px;color:#fcd34d;line-height:1.5">Hasil untuk kelurahan <b>' + esc(loc.desa) + '</b> di ' + esc(loc.kotkab) + ', ' + esc(prov) + '. Mungkin maksud Anda <b>Kota ' + esc(kotaBersih) + '</b>?<br>Coba ketik: <code style="background:rgba(0,0,0,.3);padding:1px 5px;border-radius:3px;font-size:10px">Kota ' + esc(kotaBersih) + '</code></div>' +
      '</div>';
  }

  var html = '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:16px;padding:18px;margin-bottom:10px;">';

  // Warning
  html += warning;

  // Location header
  html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:16px;">';
  html += '<div style="min-width:0">';
  html += '<div style="font-size:14px;font-weight:600;color:#e0f2fe;line-height:1.3">' + esc(loc.kotkab || meta.query || '') + '</div>';
  html += '<div style="font-size:11px;color:#64748b;margin-top:3px;line-height:1.5">' + esc([loc.desa, loc.kecamatan, prov].filter(function(x){return x}).join(' · ')) + '</div>';
  html += '</div>';
  html += '<div style="font-size:10px;color:#475569;font-family:ui-monospace,monospace;flex-shrink:0">' + esc(cu.local_datetime ? cu.local_datetime.slice(11, 16) : '') + '</div>';
  html += '</div>';

  // Current — big display
  html += '<div style="display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid rgba(34,211,238,.08)">';
  // Suhu besar
  html += '<div>';
  html += '<div style="font-size:42px;font-weight:300;color:#e0f2fe;line-height:1;letter-spacing:-1px">' + esc(cu.t) + '<span style="font-size:20px;color:#64748b;margin-left:2px">°C</span></div>';
  html += '<div style="font-size:12px;color:#22d3ee;font-weight:500;margin-top:6px">' + esc(cu.weather_desc || '') + '</div>';
  html += '</div>';
  if (cu.image) {
    html += '<img src="' + esc(cu.image) + '" style="width:64px;height:64px;margin-left:auto" onerror="this.style.display=\'none\'">';
  }
  html += '</div>';

  // Detail grid — modern minimal
  var details = [];
  if (cu.hu !== undefined) details.push({label:'Kelembapan', val:cu.hu + '%'});
  if (cu.ws !== undefined) details.push({label:'Angin', val:cu.ws + ' km/j'});
  if (cu.wd) details.push({label:'Arah', val:cu.wd + (cu.wd_to ? '→' + cu.wd_to : '')});
  if (cu.tcc !== undefined) details.push({label:'Awan', val:cu.tcc + '%'});

  if (details.length) {
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:rgba(34,211,238,.08);margin-top:16px;border-radius:10px;overflow:hidden">';
    details.forEach(function(d, i){
      html += '<div style="padding:12px 14px;background:#0a1929">';
      html += '<div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;font-weight:500">' + d.label + '</div>';
      html += '<div style="font-size:15px;font-weight:600;color:#e0f2fe;margin-top:4px">' + esc(d.val) + '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  html += '</div>';

  // Forecast
  if (forecast.length) {
    html += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.1);border-radius:16px;padding:18px;">';
    html += '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px">';
    html += '<div style="font-size:12px;font-weight:600;color:#e0f2fe;letter-spacing:.3px">Prakiraan</div>';
    html += '<div style="font-size:10px;color:#64748b;font-family:ui-monospace,monospace">' + Math.min(forecast.length, 8) + ' slot</div>';
    html += '</div>';

    html += '<div style="display:flex;flex-direction:column;gap:1px;background:rgba(34,211,238,.06);border-radius:10px;overflow:hidden">';
    forecast.slice(0, 8).forEach(function(f){
      var c = f.cuaca || (f.t !== undefined ? f : null);
      if (!c) return;
      var tgl = c.local_datetime || c.datetime || '';
      var jam = tgl.slice(11, 16);
      var hari = tgl.slice(5, 10);

      html += '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#0a1929">';
      html += '<div style="font-family:ui-monospace,monospace;font-size:11px;color:#64748b;width:38px;flex-shrink:0">' + esc(jam) + '</div>';
      if (c.image) {
        html += '<img src="' + esc(c.image) + '" style="width:32px;height:32px;flex-shrink:0" onerror="this.style.display=\'none\'">';
      }
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:12px;color:#cbd5e1;font-weight:500">' + esc(c.weather_desc || '') + '</div>';
      html += '<div style="font-size:10px;color:#475569;margin-top:1px">' + esc(hari) + '</div>';
      html += '</div>';
      html += '<div style="font-size:16px;font-weight:600;color:#22d3ee;flex-shrink:0">' + esc(c.t) + '°</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  return html;
}
window.KazeCuaca = { isCuaca: isCuaca, render: renderCuaca };
console.log('BETOx1: KazeCuaca v3 modern');
})();
