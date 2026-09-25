(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isJadwalTV(d){
  if (!d || typeof d !== 'object') return false;
  if (!Array.isArray(d.data) || d.data.length === 0) return false;
  var f = d.data[0];
  // Format 1: array of {channel, jadwal[]}
  if (f && f.channel && Array.isArray(f.jadwal)) return true;
  // Format 2: array of {jam, acara} langsung
  if (f && f.jam && f.acara && d.status === true) return true;
  return false;
}

function renderJadwalSingle(arr, channelName){
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:14px;overflow:hidden;margin-bottom:12px">';
  h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(34,211,238,.05);border-bottom:1px solid rgba(34,211,238,.08)">';
  h += '<div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#06111f;flex-shrink:0">TV</div>';
  h += '<div style="font-size:13px;font-weight:700;color:#22d3ee;letter-spacing:.5px">' + esc(channelName || 'Jadwal TV') + '</div>';
  h += '<div style="margin-left:auto;font-size:10px;color:#64748b;font-family:ui-monospace,monospace">' + arr.length + ' acara</div>';
  h += '</div>';
  arr.forEach(function(j){
    var jam = j.jam || '';
    var acara = j.acara || '';
    h += '<div style="display:flex;gap:12px;padding:10px 16px;border-bottom:1px solid rgba(34,211,238,.05)">';
    h += '<div style="font-family:ui-monospace,monospace;font-size:11px;color:#22d3ee;font-weight:600;flex-shrink:0;min-width:60px">' + esc(jam) + '</div>';
    h += '<div style="font-size:12px;color:#cbd5e1;line-height:1.4">' + esc(acara) + '</div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function renderJadwal(d){
  var arr = d.data || [];
  var h = '';
  if (!arr.length) return '<div style="padding:20px;text-align:center;color:#64748b;font-size:12px">Tidak ada jadwal</div>';

  var f = arr[0];
  // Format 2: single channel (jam + acara langsung)
  if (f && f.jam && f.acara && !f.channel) {
    var channelName = d.channel || d.query || 'Jadwal TV';
    h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
    h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">📺 ' + esc(channelName) + '</div>';
    h += '<div style="font-size:11px;color:#64748b">' + arr.length + ' acara</div>';
    h += '</div>';
    h += renderJadwalSingle(arr, channelName);
    return h;
  }

  // Format 1: multiple channels
  h += '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:6px 2px 14px">';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">📺 Jadwal TV</div>';
  h += '<div style="font-size:11px;color:#64748b">' + arr.length + ' channel</div>';
  h += '</div>';

  arr.forEach(function(ch){
    var channel = ch.channel || 'Unknown';
    var jadwal = ch.jadwal || [];
    if (!jadwal.length) return;
    h += renderJadwalSingle(jadwal, channel);
  });

  return h;
}

window.KazeJadwal = { isJadwalTV: isJadwalTV, render: renderJadwal };
console.log('BETOx1: KazeJadwal siap');
})();
