(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isGameResponse(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || typeof dd !== 'object') return false;
  // Quiz: ada soal + jawaban
  if (dd.soal && (dd.jawaban || dd.img)) return true;
  // Tebak Bendera: name + img
  if (dd.name && dd.img) return true;
  return false;
}

function renderGame(d){
  var dd = d.data || d;
  var soal = dd.soal || '';
  var jawaban = dd.jawaban;
  var img = dd.img || '';
  var index = dd.index || '';
  var nama = dd.name || '';
  var deskripsi = dd.deskripsi || '';
  var uid = 'g-' + Math.random().toString(36).slice(2, 9);
  
  var h = '';
  h += '<div style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;padding:0;overflow:hidden">';
  
  // Header
  h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(34,211,238,.04);border-bottom:1px solid rgba(34,211,238,.08)">';
  h += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🎮</div>';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Tebak-tebakan</div>';
  if (index) h += '<div style="margin-left:auto;font-size:11px;color:#64748b;font-family:ui-monospace,monospace">#' + esc(index) + '</div>';
  h += '</div>';
  
  // Body
  h += '<div style="padding:16px">';
  
  // Image (kalau ada)
  if (img) {
    h += '<div style="border-radius:12px;overflow:hidden;background:#06111f;margin-bottom:14px">';
    h += '<img src="' + esc(img) + '" style="width:100%;display:block;max-height:340px;object-fit:contain">';
    h += '</div>';
  }
  
  // Soal
  if (soal) {
    h += '<div style="font-size:14px;color:#e0f2fe;line-height:1.6;font-weight:500">' + esc(soal) + '</div>';
  }
  
  // Name (Tebak Bendera)
  if (nama && !soal) {
    h += '<div style="font-size:13px;color:#94a3b8;margin-bottom:14px;text-align:center;font-style:italic">Negara apakah ini?</div>';
  }
  
  // Deskripsi (Tebak Gambar)
  if (deskripsi) {
    h += '<div style="font-size:11px;color:#64748b;margin-top:10px;font-style:italic">💡 ' + esc(deskripsi) + '</div>';
  }
  
  h += '</div>';
  
  // Jawaban — hidden by default
  h += '<div id="' + uid + '-ans" style="display:none;padding:16px;background:rgba(34,211,238,.06);border-top:1px solid rgba(34,211,238,.15)">';
  h += '<div style="font-size:10px;color:#22d3ee;text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:8px">Jawaban</div>';
  
  if (Array.isArray(jawaban)) {
    h += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    jawaban.forEach(function(j, i){
      h += '<span style="padding:6px 12px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.25);border-radius:8px;color:#7dd3fc;font-size:12.5px;font-weight:600">' + esc(j) + '</span>';
    });
    h += '</div>';
  } else if (jawaban) {
    h += '<div style="font-size:16px;font-weight:700;color:#22d3ee;letter-spacing:.3px">' + esc(jawaban) + '</div>';
  } else if (nama) {
    h += '<div style="font-size:16px;font-weight:700;color:#22d3ee">' + esc(nama) + '</div>';
  }
  
  h += '</div>';
  
  // Reveal button
  h += '<div style="padding:12px 16px;background:rgba(0,0,0,.15);border-top:1px solid rgba(34,211,238,.06)">';
  h += '<button data-uid="' + uid + '" class="kz-reveal-btn" style="width:100%;padding:11px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border:0;border-radius:10px;color:#06111f;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Lihat Jawaban</button>';
  h += '</div>';
  
  h += '</div>';
  return h;
}

// Event delegation — gak butuh inline onclick
document.addEventListener('click', function(e){
  var btn = e.target.closest('.kz-reveal-btn');
  if (!btn) return;
  var uid = btn.getAttribute('data-uid');
  if (!uid) return;
  var el = document.getElementById(uid + '-ans');
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = 'block';
    btn.textContent = 'Sembunyikan Jawaban';
  } else {
    el.style.display = 'none';
    btn.textContent = 'Lihat Jawaban';
  }
});

window.KazeGames = {
  isGameResponse: isGameResponse,
  render: renderGame
};
console.log('BETOx1: KazeGames siap');
})();
