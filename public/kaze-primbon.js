(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

// Deteksi primbon analisa (ep241)
function isPrimbonAnalisa(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  return !!(dd && dd.analisa && dd.sektor && dd.elemen);
}

// Deteksi primbon jodoh lengkap (ep242)
function isPrimbonJodoh(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  return !!(dd && dd.nama_anda && dd.nama_pasangan && dd.sisi_positif);
}

function renderPrimbonAnalisa(d){
  var dd = d.data || d;
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(139,92,246,.2);border-radius:16px;overflow:hidden;margin-bottom:12px">';
  h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:linear-gradient(135deg,rgba(139,92,246,.15),rgba(168,85,247,.08));border-bottom:1px solid rgba(139,92,246,.15)">';
  h += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#a855f7);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🔮</div>';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Primbon Pitagoras</div>';
  h += '</div>';

  h += '<div style="padding:16px">';
  // Analisa
  h += '<div style="font-size:11px;color:#a78bfa;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:8px">Analisa</div>';
  h += '<div style="font-size:12.5px;color:#cbd5e1;line-height:1.65;margin-bottom:14px;padding:10px 12px;background:rgba(139,92,246,.06);border-radius:10px;border-left:3px solid #8b5cf6">' + esc(dd.analisa) + '</div>';

  // Sektor
  if (dd.sektor) {
    h += '<div style="font-size:11px;color:#a78bfa;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:8px">Sektor</div>';
    h += '<div style="font-size:12.5px;color:#cbd5e1;line-height:1.65;margin-bottom:14px">' + esc(dd.sektor) + '</div>';
  }

  // Elemen
  if (dd.elemen) {
    h += '<div style="font-size:11px;color:#a78bfa;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:8px">Elemen</div>';
    h += '<div style="font-size:12.5px;color:#cbd5e1;line-height:1.65;white-space:pre-wrap">' + esc(dd.elemen) + '</div>';
  }

  h += '</div></div>';
  return h;
}

function renderPrimbonJodoh(d){
  var dd = d.data || d;
  var h = '';
  h += '<div style="background:linear-gradient(135deg,rgba(236,72,153,.12),rgba(168,85,247,.08));border:1px solid rgba(236,72,153,.25);border-radius:16px;overflow:hidden;margin-bottom:12px">';
  h += '<div style="padding:18px;text-align:center">';
  h += '<div style="font-size:26px;margin-bottom:10px">💕</div>';
  h += '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center">';
  h += '<div style="font-size:14px;font-weight:700;color:#f9a8d4">' + esc(dd.nama_anda) + '</div>';
  h += '<div style="font-size:20px">💞</div>';
  h += '<div style="font-size:14px;font-weight:700;color:#f9a8d4">' + esc(dd.nama_pasangan) + '</div>';
  h += '</div></div></div>';

  if (dd.gambar) {
    h += '<div style="background:#0a1929;border:1px solid rgba(236,72,153,.15);border-radius:12px;overflow:hidden;margin-bottom:12px">';
    h += '<img src="' + esc(dd.gambar) + '" style="width:100%;display:block;max-height:400px;object-fit:contain">';
    h += '</div>';
  }

  var sections = [
    { key: 'sisi_positif', label: '✅ Sisi Positif', color: '#22c55e' },
    { key: 'sisi_negatif', label: '⚠️ Sisi Negatif', color: '#f59e0b' },
    { key: 'catatan', label: '📝 Catatan', color: '#94a3b8' }
  ];

  sections.forEach(function(s){
    if (dd[s.key]) {
      h += '<div style="background:#0a1929;border:1px solid rgba(236,72,153,.12);border-left:3px solid ' + s.color + ';border-radius:10px;padding:12px 14px;margin-bottom:10px">';
      h += '<div style="font-size:10px;color:' + s.color + ';text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:6px">' + s.label + '</div>';
      h += '<div style="font-size:12.5px;color:#cbd5e1;line-height:1.6;white-space:pre-wrap">' + esc(dd[s.key]) + '</div>';
      h += '</div>';
    }
  });

  return h;
}

function render(d){
  if (isPrimbonAnalisa(d)) return renderPrimbonAnalisa(d);
  if (isPrimbonJodoh(d)) return renderPrimbonJodoh(d);
  return '';
}

window.KazePrimbon = {
  isPrimbonAnalisa: isPrimbonAnalisa,
  isPrimbonJodoh: isPrimbonJodoh,
  render: render
};
console.log('BETOx1: KazePrimbon siap');
})();
