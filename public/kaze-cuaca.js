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

  var html = '<div class="result-card" style="margin-bottom:12px">';
  html += '<div class="result-title">🌤️ Cuaca ' + esc(loc.provinsi || meta.query || '') + '</div>';

  // Lokasi
  html += '<div style="font-size:11px;color:#94a3b8;padding:6px 0;line-height:1.6">';
  html += '📍 ' + esc([loc.desa, loc.kecamatan, loc.kotkab, loc.provinsi].filter(function(x){return x}).join(' · '));
  html += '</div>';

  // Current
  html += '<div style="display:flex;gap:14px;align-items:center;padding:14px 0;border-top:1px solid rgba(34,211,238,.12);border-bottom:1px solid rgba(34,211,238,.12)">';
  if (cu.image) {
    html += '<img src="' + esc(cu.image) + '" style="width:80px;height:80px;flex-shrink:0" onerror="this.style.display=\'none\'">';
  }
  html += '<div style="flex:1">';
  html += '<div style="font-size:32px;font-weight:700;color:#e0f2fe;line-height:1">' + esc(cu.t) + '°C</div>';
  html += '<div style="font-size:14px;color:#22d3ee;margin-top:4px">' + esc(cu.weather_desc) + '</div>';
  html += '<div style="font-size:11px;color:#64748b;margin-top:2px">' + esc(cu.local_datetime || '') + '</div>';
  html += '</div></div>';

  // Detail grid
  var details = [];
  if (cu.hu !== undefined) details.push({label:'💧 Kelembapan', val:cu.hu + '%'});
  if (cu.ws !== undefined) details.push({label:'💨 Angin', val:cu.ws + ' km/j'});
  if (cu.wd) details.push({label:'🧭 Arah', val:cu.wd + ' → ' + (cu.wd_to || '')});
  if (cu.tcc !== undefined) details.push({label:'☁️ Awan', val:cu.tcc + '%'});
  if (cu.vs) details.push({label:'👁 Jarak', val:cu.vs});

  if (details.length) {
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:12px 0">';
    details.forEach(function(d){
      html += '<div style="padding:8px 10px;background:rgba(34,211,238,.06);border-radius:8px">';
      html += '<div style="font-size:10px;color:#64748b;text-transform:uppercase">' + d.label + '</div>';
      html += '<div style="font-size:13px;font-weight:600;color:#e0f2fe;margin-top:2px">' + esc(d.val) + '</div>';
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Forecast (max 6)
  if (forecast.length) {
    html += '<div class="result-card"><div class="result-title">📅 Prakiraan</div>';
    html += '<div style="display:flex;flex-direction:column;gap:6px;padding-top:8px">';
    forecast.slice(0, 8).forEach(function(f){
      var c = f.cuaca || (f.t !== undefined ? f : null);
      if (!c) return;
      var tgl = c.local_datetime || c.datetime || '';
      var jam = tgl.slice(11, 16);
      html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(34,211,238,.04);border-radius:8px">';
      if (c.image) {
        html += '<img src="' + esc(c.image) + '" style="width:36px;height:36px;flex-shrink:0">';
      }
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:11px;color:#64748b">' + esc(jam) + ' · ' + esc(tgl.slice(0,10)) + '</div>';
      html += '<div style="font-size:12px;color:#e0f2fe;font-weight:600">' + esc(c.weather_desc || c.weather_desc_en || '') + '</div>';
      html += '</div>';
      html += '<div style="font-size:16px;font-weight:700;color:#22d3ee">' + esc(c.t) + '°</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  return html;
}
window.KazeCuaca = { isCuaca: isCuaca, render: renderCuaca };
console.log('BETOx1: KazeCuaca siap');
})();
