(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

// Deteksi LEBIH FLEKSIBEL
function isGameResponse(d){
  if (!d || typeof d !== 'object') return false;
  var dd = d.data || d;
  if (!dd || typeof dd !== 'object') return false;
  // Wajib ada kunci jawaban atau nama
  var hasAns = dd.jawaban !== undefined || dd.nama;
  if (!hasAns) return false;
  // Kombinasi valid:
  if (dd.soal) return true;                    // Asah Otak, dll
  if (dd.img && dd.jawaban) return true;       // Tebak Gambar
  if (dd.img && dd.name) return true;          // Tebak Bendera
  return false;
}

function normalize(s){
  return String(s||'').toLowerCase().trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function levenshtein(a, b){
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  var m = [];
  for (var i = 0; i <= b.length; i++) m[i] = [i];
  for (var j = 0; j <= a.length; j++) m[0][j] = j;
  for (var i2 = 1; i2 <= b.length; i2++){
    for (var j2 = 1; j2 <= a.length; j2++){
      if (b.charAt(i2 - 1) === a.charAt(j2 - 1)) m[i2][j2] = m[i2-1][j2-1];
      else m[i2][j2] = Math.min(m[i2-1][j2-1] + 1, m[i2][j2-1] + 1, m[i2-1][j2] + 1);
    }
  }
  return m[b.length][a.length];
}

function checkAnswer(userAns, correctAns){
  var u = normalize(userAns);
  if (!u) return false;
  if (Array.isArray(correctAns)) {
    for (var i = 0; i < correctAns.length; i++){
      if (normalize(correctAns[i]) === u) return true;
    }
    return false;
  }
  var c = normalize(correctAns);
  if (!c) return false;
  if (u === c) return true;
  if (u.length >= 4 && c.indexOf(u) !== -1) return true;
  if (c.length >= 4 && u.indexOf(c) !== -1) return true;
  if (Math.abs(u.length - c.length) <= 2 && u.length >= 4) {
    var dist = levenshtein(u, c);
    var maxLen = Math.max(u.length, c.length);
    if (dist <= Math.floor(maxLen * 0.2)) return true;
  }
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
  var audioUrl = '';
  var extraLabel = '';

  // Tebak Lagu
  if (dd.lagu && dd.judul) {
    audioUrl = dd.lagu;
    soal = dd.judul + (dd.artis ? ' - ' + dd.artis : '');
    jawaban = dd.judul;
    extraLabel = 'Tebak judul lagu ini';
  }
  // Tebak Logo (nested)
  if (dd.data && dd.data.image && dd.data.jawaban) {
    img = dd.data.image;
    jawaban = dd.data.jawaban;
    soal = 'Logo apakah ini?';
  }
  // Tebak Warna
  if (dd.plate && dd.correct && dd.image) {
    img = dd.image;
    jawaban = dd.correct;
    soal = 'Warna apa yang kamu lihat? (Ishihara test plate #' + dd.plate + ')';
  }
  // Tebak Kimia
  if (dd.unsur && dd.lambang) {
    soal = 'Apa lambang unsur dari: ' + dd.unsur + '?';
    jawaban = dd.lambang;
  }

  var uid = 'g-' + Math.random().toString(36).slice(2, 9);
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
  // Audio (Tebak Lagu)
  if (typeof audioUrl !== 'undefined' && audioUrl) {
    h += '<div style="margin-bottom:14px;padding:10px;background:rgba(34,211,238,.06);border-radius:10px">';
    h += '<div style="font-size:11px;color:#22d3ee;font-weight:600;margin-bottom:8px">🎵 Dengarkan audio:</div>';
    h += '<audio controls preload="metadata" style="width:100%" src="' + esc(audioUrl) + '"></audio>';
    h += '</div>';
  }

  if (img) {
    h += '<div style="border-radius:12px;overflow:hidden;background:#06111f;margin-bottom:14px">';
    h += '<img src="' + esc(img) + '" style="width:100%;display:block;max-height:340px;object-fit:contain">';
    h += '</div>';
  }
  if (soal) {
    h += '<div style="font-size:14px;color:#e0f2fe;line-height:1.6;font-weight:500;margin-bottom:14px">' + esc(soal) + '</div>';
  }
  if (nama && !soal) {
    h += '<div style="font-size:14px;color:#e0f2fe;font-weight:500;text-align:center;margin-bottom:14px">Negara apakah ini?</div>';
  }
  if (deskripsi) {
    h += '<div style="font-size:11px;color:#64748b;margin-bottom:12px;font-style:italic">💡 ' + esc(deskripsi) + '</div>';
  }
  // Input + tombol
  h += '<div class="kz-input-wrap" style="display:flex;gap:8px">';
  h += '<input type="text" class="kz-ans-input" placeholder="Ketik jawaban..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" style="flex:1;padding:12px 14px;background:rgba(0,0,0,.3);border:1px solid rgba(34,211,238,.2);border-radius:10px;color:#e0f2fe;font-size:14px;font-family:inherit;outline:none;min-width:0">';
  h += '<button class="kz-check-btn" style="padding:12px 20px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border:0;border-radius:10px;color:#06111f;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0">Jawab</button>';
  h += '</div>';
  h += '</div>';
  h += '<div class="kz-result" style="display:none"></div>';
  h += '</div>';
  return h;
}

// Event handler
document.addEventListener('click', function(e){
  var btn = e.target.closest('.kz-check-btn');
  if (btn) { var g = btn.closest('.kz-game'); if (g) checkGame(g); return; }
  var nxt = e.target.closest('.kz-new-btn');
  if (nxt) { newQuestion(); return; }
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
  var result = game.querySelector('.kz-result');
  if (!input || !result) return;
  var userAns = (input.value || '').trim();
  if (!userAns) { input.focus(); return; }

  var encoded = game.getAttribute('data-ans') || '';
  var data = {};
  try { data = JSON.parse(decodeURIComponent(encoded)); } catch(e){}
  var correct = data.jawaban !== undefined ? data.jawaban : (data.nama || '');
  var isCorrect = checkAnswer(userAns, correct);

  var wrap = game.querySelector('.kz-input-wrap');
  if (wrap) wrap.style.display = 'none';

  var h = '';
  if (isCorrect) {
    h += '<div style="padding:16px;background:rgba(34,197,94,.08);border-top:1px solid rgba(34,197,94,.2)">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">';
    h += '<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">✓</div>';
    h += '<div style="font-size:15px;font-weight:700;color:#4ade80">BENAR!</div></div>';
    h += '<div style="font-size:12px;color:#86efac">Jawaban kamu: <b>' + esc(userAns) + '</b></div>';
    h += '</div>';
  } else {
    h += '<div style="padding:16px;background:rgba(239,68,68,.08);border-top:1px solid rgba(239,68,68,.2)">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += '<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">✕</div>';
    h += '<div style="font-size:15px;font-weight:700;color:#f87171">SALAH</div></div>';
    h += '<div style="font-size:12px;color:#fca5a5;margin-bottom:10px">Jawaban kamu: <b>' + esc(userAns) + '</b></div>';
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
  // Soal Baru
  h += '<div style="padding:12px 16px;background:rgba(0,0,0,.15);border-top:1px solid rgba(34,211,238,.06)">';
  h += '<button class="kz-new-btn" style="width:100%;padding:11px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border:0;border-radius:10px;color:#06111f;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Soal Baru</button>';
  h += '</div>';

  result.innerHTML = h;
  result.style.display = 'block';
}

// Trigger fetch soal baru = klik tombol submit utama
function newQuestion(){
  var btn = document.getElementById('btnSubmit');
  if (!btn) return;
  btn.click();
  setTimeout(function(){
    var wrap = document.getElementById('resultWrap');
    if (wrap && wrap.scrollIntoView) wrap.scrollIntoView({behavior:'smooth', block:'start'});
  }, 200);
}

window.KazeGames = { isGameResponse: isGameResponse, render: renderGame };
console.log('BETOx1: KazeGames v3 — soal baru');
})();
