(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function isGameResponse(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || typeof dd !== 'object') return false;
  if (dd.soal && (dd.jawaban || dd.img)) return true;
  if (dd.name && dd.img) return true;
  return false;
}

// Normalisasi jawaban buat compare
function normalize(s){
  return String(s||'').toLowerCase().trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Cek jawaban
function checkAnswer(userAns, correctAns){
  var u = normalize(userAns);
  if (!u) return false;
  
  // Kalau correctAns array (Family100)
  if (Array.isArray(correctAns)) {
    for (var i = 0; i < correctAns.length; i++){
      if (normalize(correctAns[i]) === u) return true;
    }
    return false;
  }
  
  var c = normalize(correctAns);
  if (!c) return false;
  
  // Exact match
  if (u === c) return true;
  
  // Contains (misal "udang" vs "udang goreng")
  if (u.length >= 4 && c.indexOf(u) !== -1) return true;
  if (c.length >= 4 && u.indexOf(c) !== -1) return true;
  
  // Levenshtein distance sederhana (toleransi typo)
  if (Math.abs(u.length - c.length) <= 2 && u.length >= 4) {
    var dist = levenshtein(u, c);
    var maxLen = Math.max(u.length, c.length);
    if (dist <= Math.floor(maxLen * 0.2)) return true;
  }
  
  return false;
}

function levenshtein(a, b){
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  var m = [];
  for (var i = 0; i <= b.length; i++) m[i] = [i];
  for (var j = 0; j <= a.length; j++) m[0][j] = j;
  for (var i2 = 1; i2 <= b.length; i2++){
    for (var j2 = 1; j2 <= a.length; j2++){
      if (b.charAt(i2 - 1) === a.charAt(j2 - 1)) {
        m[i2][j2] = m[i2-1][j2-1];
      } else {
        m[i2][j2] = Math.min(m[i2-1][j2-1] + 1, m[i2][j2-1] + 1, m[i2-1][j2] + 1);
      }
    }
  }
  return m[b.length][a.length];
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
  
  // Simpan jawaban di data attribute (base64)
  var ansEncoded = encodeURIComponent(JSON.stringify({ jawaban: jawaban, nama: nama }));

  var h = '';
  h += '<div class="kz-game" data-uid="' + uid + '" data-ans="' + esc(ansEncoded) + '" style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:16px;overflow:hidden">';
  
  // Header
  h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(34,211,238,.04);border-bottom:1px solid rgba(34,211,238,.08)">';
  h += '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🎮</div>';
  h += '<div style="font-size:12px;font-weight:600;color:#e0f2fe">Tebak-tebakan</div>';
  if (index) h += '<div style="margin-left:auto;font-size:11px;color:#64748b;font-family:ui-monospace,monospace">#' + esc(index) + '</div>';
  h += '</div>';
  
  // Body
  h += '<div style="padding:16px">';
  
  // Gambar
  if (img) {
    h += '<div style="border-radius:12px;overflow:hidden;background:#06111f;margin-bottom:14px">';
    h += '<img src="' + esc(img) + '" style="width:100%;display:block;max-height:340px;object-fit:contain">';
    h += '</div>';
  }
  
  // Soal
  if (soal) {
    h += '<div style="font-size:14px;color:#e0f2fe;line-height:1.6;font-weight:500;margin-bottom:14px">' + esc(soal) + '</div>';
  }
  
  // Pertanyaan untuk Tebak Bendera
  if (nama && !soal) {
    h += '<div style="font-size:14px;color:#e0f2fe;font-weight:500;text-align:center;margin-bottom:14px">Negara apakah ini?</div>';
  }
  
  // Deskripsi
  if (deskripsi) {
    h += '<div style="font-size:11px;color:#64748b;margin-bottom:12px;font-style:italic">💡 ' + esc(deskripsi) + '</div>';
  }
  
  // Input jawaban
  h += '<div style="display:flex;gap:8px">';
  h += '<input type="text" class="kz-ans-input" placeholder="Ketik jawaban..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" style="flex:1;padding:12px 14px;background:rgba(0,0,0,.3);border:1px solid rgba(34,211,238,.2);border-radius:10px;color:#e0f2fe;font-size:14px;font-family:inherit;outline:none">';
  h += '<button class="kz-check-btn" style="padding:12px 20px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border:0;border-radius:10px;color:#06111f;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap">Jawab</button>';
  h += '</div>';
  
  h += '</div>';
  
  // Result area (hidden)
  h += '<div class="kz-result" style="display:none"></div>';
  
  h += '</div>';
  return h;
}

// Event handling
document.addEventListener('click', function(e){
  var btn = e.target.closest('.kz-check-btn');
  if (btn) {
    var game = btn.closest('.kz-game');
    if (game) checkGame(game);
    return;
  }
  // Try again
  var again = e.target.closest('.kz-again-btn');
  if (again) {
    var game2 = again.closest('.kz-game');
    if (game2) resetGame(game2);
    return;
  }
});

document.addEventListener('keydown', function(e){
  if (e.key !== 'Enter') return;
  var inp = e.target.closest('.kz-ans-input');
  if (!inp) return;
  var game = inp.closest('.kz-game');
  if (game) checkGame(game);
});

function checkGame(game){
  var input = game.querySelector('.kz-ans-input');
  var btn = game.querySelector('.kz-check-btn');
  var result = game.querySelector('.kz-result');
  if (!input || !result) return;
  
  var userAns = (input.value || '').trim();
  if (!userAns) {
    input.focus();
    return;
  }
  
  // Decode jawaban
  var encoded = game.getAttribute('data-ans') || '';
  var data = {};
  try {
    data = JSON.parse(decodeURIComponent(encoded));
  } catch(e){}
  
  var correct = data.jawaban || data.nama || '';
  var isCorrect = checkAnswer(userAns, correct);
  
  // Sembunyikan input
  var inputWrap = input.parentNode;
  inputWrap.style.display = 'none';
  btn.style.display = 'none';
  input.disabled = true;
  
  // Tampilkan hasil
  var h = '';
  if (isCorrect) {
    h += '<div style="padding:16px;background:rgba(34,197,94,.08);border-top:1px solid rgba(34,197,94,.2)">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += '<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">✓</div>';
    h += '<div style="font-size:15px;font-weight:700;color:#4ade80">BENAR!</div>';
    h += '</div>';
    h += '<div style="font-size:12px;color:#86efac;line-height:1.5">Jawaban kamu: <b>' + esc(userAns) + '</b></div>';
    h += '</div>';
  } else {
    h += '<div style="padding:16px;background:rgba(239,68,68,.08);border-top:1px solid rgba(239,68,68,.2)">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += '<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">✕</div>';
    h += '<div style="font-size:15px;font-weight:700;color:#f87171">SALAH</div>';
    h += '</div>';
    h += '<div style="font-size:12px;color:#fca5a5;line-height:1.5;margin-bottom:10px">Jawaban kamu: <b>' + esc(userAns) + '</b></div>';
    h += '<div style="padding:10px 12px;background:rgba(34,211,238,.08);border-radius:8px;border:1px solid rgba(34,211,238,.2)">';
    h += '<div style="font-size:10px;color:#22d3ee;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:6px">Jawaban Benar</div>';
    if (Array.isArray(correct)) {
      h += '<div style="display:flex;flex-wrap:wrap;gap:5px">';
      correct.forEach(function(c){ h += '<span style="padding:4px 10px;background:rgba(34,211,238,.12);border-radius:6px;color:#7dd3fc;font-size:12px;font-weight:600">' + esc(c) + '</span>'; });
      h += '</div>';
    } else {
      h += '<div style="font-size:14px;font-weight:700;color:#22d3ee">' + esc(correct) + '</div>';
    }
    h += '</div></div>';
  }
  
  // Tombol main lagi
  h += '<div style="padding:12px 16px;background:rgba(0,0,0,.15);border-top:1px solid rgba(34,211,238,.06)">';
  h += '<button class="kz-again-btn" style="width:100%;padding:10px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.25);border-radius:10px;color:#22d3ee;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Coba Lagi</button>';
  h += '</div>';
  
  result.innerHTML = h;
  result.style.display = 'block';
}

function resetGame(game){
  var input = game.querySelector('.kz-ans-input');
  var btn = game.querySelector('.kz-check-btn');
  var result = game.querySelector('.kz-result');
  if (!input) return;
  input.value = '';
  input.disabled = false;
  input.parentNode.style.display = 'flex';
  btn.style.display = 'inline-block';
  result.style.display = 'none';
  result.innerHTML = '';
  input.focus();
}

window.KazeGames = {
  isGameResponse: isGameResponse,
  render: renderGame
};
console.log('BETOx1: KazeGames v2 — interactive');
})();
