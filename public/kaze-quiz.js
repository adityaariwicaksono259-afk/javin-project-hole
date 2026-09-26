(function(){
'use strict';
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

// Deteksi Cerdas Cermat / Quiz multi-choice
function isQuizMulti(d){
  if (!d || typeof d !== 'object') return false;
  if (!d.status || !d.data) return false;
  var dd = d.data;
  if (!Array.isArray(dd.soal) || dd.soal.length === 0) return false;
  var f = dd.soal[0];
  return !!(f.pertanyaan && Array.isArray(f.semua_jawaban) && f.jawaban_benar);
}

function renderQuizMulti(d){
  var arr = d.data.soal || [];
  var mapel = d.data.matapelajaran || '';
  var sessionId = 'qs-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  
  var h = '';
  
  // Header dengan score board
  h += '<div id="' + sessionId + '-score" style="background:linear-gradient(135deg,rgba(34,211,238,.15),rgba(14,165,233,.08));border:1px solid rgba(34,211,238,.3);border-radius:14px;padding:14px 16px;margin-bottom:14px">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  h += '<div style="font-size:12px;font-weight:700;color:#22d3ee;text-transform:uppercase;letter-spacing:.5px">📚 Cerdas Cermat' + (mapel ? ' — ' + esc(mapel.toUpperCase()) : '') + '</div>';
  h += '<div style="font-size:10px;color:#64748b">' + arr.length + ' soal</div>';
  h += '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">';
  h += '<div style="text-align:center;padding:8px;background:rgba(34,197,94,.1);border-radius:8px"><div class="kz-quiz-correct" style="font-size:18px;font-weight:800;color:#22c55e;line-height:1">0</div><div style="font-size:9px;color:#86efac;text-transform:uppercase;font-weight:600;margin-top:2px">Benar</div></div>';
  h += '<div style="text-align:center;padding:8px;background:rgba(239,68,68,.1);border-radius:8px"><div class="kz-quiz-wrong" style="font-size:18px;font-weight:800;color:#ef4444;line-height:1">0</div><div style="font-size:9px;color:#fca5a5;text-transform:uppercase;font-weight:600;margin-top:2px">Salah</div></div>';
  h += '<div style="text-align:center;padding:8px;background:rgba(34,211,238,.1);border-radius:8px"><div class="kz-quiz-nilai" style="font-size:18px;font-weight:800;color:#22d3ee;line-height:1">0</div><div style="font-size:9px;color:#7dd3fc;text-transform:uppercase;font-weight:600;margin-top:2px">Nilai</div></div>';
  h += '</div>';
  h += '</div>';

  // Progress bar
  h += '<div style="margin-bottom:14px">';
  h += '<div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:6px"><span>Progres</span><span class="kz-quiz-progress-text">0 / ' + arr.length + '</span></div>';
  h += '<div style="height:4px;background:rgba(0,0,0,.3);border-radius:4px;overflow:hidden"><div class="kz-quiz-progress" style="height:100%;width:0%;background:linear-gradient(90deg,#0EA5E9,#22d3ee);transition:width .3s"></div></div>';
  h += '</div>';

  // Soal-soal
  arr.forEach(function(q, i){
    var uid = 'q-' + i + '-' + Math.random().toString(36).slice(2, 7);
    var pertanyaan = q.pertanyaan || '';
    var jawaban = q.semua_jawaban || [];
    var benar = q.jawaban_benar || '';

    h += '<div class="kz-quiz" data-session="' + sessionId + '" data-uid="' + uid + '" data-correct="' + esc(benar) + '" style="background:#0a1929;border:1px solid rgba(34,211,238,.12);border-radius:14px;margin-bottom:12px;overflow:hidden">';
    h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(34,211,238,.04);border-bottom:1px solid rgba(34,211,238,.08)">';
    h += '<div style="width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);display:flex;align-items:center;justify-content:center;color:#06111f;font-weight:800;font-size:12px;flex-shrink:0">' + (i+1) + '</div>';
    h += '<div style="font-size:11px;font-weight:600;color:#e0f2fe">Soal ' + (i+1) + ' dari ' + arr.length + '</div>';
    h += '</div>';

    h += '<div style="padding:16px">';
    h += '<div style="font-size:13px;color:#e0f2fe;line-height:1.6;margin-bottom:14px;white-space:pre-wrap">' + esc(pertanyaan) + '</div>';

    jawaban.forEach(function(opt, j){
      var keys = Object.keys(opt);
      if (!keys.length) return;
      var key = keys[0];
      var text = opt[key];
      h += '<button class="kz-quiz-opt" data-key="' + esc(key) + '" data-uid="' + uid + '" style="display:block;width:100%;text-align:left;padding:12px 14px;background:rgba(0,0,0,.2);border:1px solid rgba(34,211,238,.15);border-radius:10px;margin-bottom:8px;color:#cbd5e1;font-size:13px;font-family:inherit;cursor:pointer;transition:all .15s;line-height:1.5">';
      h += '<span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:rgba(34,211,238,.12);color:#22d3ee;font-weight:700;font-size:11px;text-align:center;line-height:22px;margin-right:10px">' + esc(key.toUpperCase()) + '</span>';
      h += esc(text);
      h += '</button>';
    });

    h += '</div>';
    h += '</div>';
  });

  // Tombol Soal Baru (di bawah)
  h += '<div style="margin-top:16px;display:flex;gap:8px">';
  h += '<button class="kz-quiz-new" style="flex:1;padding:13px;background:linear-gradient(135deg,#0EA5E9,#22d3ee);border:0;border-radius:10px;color:#06111f;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">🔄 Soal Baru</button>';
  h += '</div>';

  return h;
}

// Event handler
document.addEventListener('click', function(e){
  var btn = e.target.closest('.kz-quiz-opt');
  if (btn) { handleQuizAnswer(btn); return; }
  var newBtn = e.target.closest('.kz-quiz-new');
  if (newBtn) { handleNewQuiz(); return; }
});

function handleQuizAnswer(btn){
  var uid = btn.getAttribute('data-uid');
  var picked = btn.getAttribute('data-key');
  var quiz = btn.closest('.kz-quiz');
  if (!quiz) return;
  if (quiz.getAttribute('data-done') === '1') return;
  quiz.setAttribute('data-done', '1');

  var session = quiz.getAttribute('data-session') || '';
  var correct = quiz.getAttribute('data-correct') || '';
  var buttons = quiz.querySelectorAll('.kz-quiz-opt');

  buttons.forEach(function(b){
    b.disabled = true;
    b.style.cursor = 'default';
    var k = b.getAttribute('data-key');
    if (k === correct) {
      b.style.background = 'rgba(34,197,94,.15)';
      b.style.borderColor = 'rgba(34,197,94,.5)';
      b.style.color = '#4ade80';
    } else if (k === picked && picked !== correct) {
      b.style.background = 'rgba(239,68,68,.15)';
      b.style.borderColor = 'rgba(239,68,68,.5)';
      b.style.color = '#f87171';
    } else {
      b.style.opacity = '.4';
    }
  });

  var isCorrect = picked === correct;
  var feedback = document.createElement('div');
  feedback.style.cssText = 'margin-top:10px;padding:10px 12px;border-radius:8px;font-size:12px;font-weight:600;text-align:' + (isCorrect ? 'center' : 'left') + ';' +
    (isCorrect ? 'background:rgba(34,197,94,.1);color:#4ade80;border:1px solid rgba(34,197,94,.3)' : 'background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.3)');
  feedback.textContent = isCorrect ? '✓ BENAR!' : '✕ SALAH. Jawaban: ' + correct.toUpperCase();
  btn.parentNode.appendChild(feedback);

  // Update score
  updateQuizScore(session, isCorrect);
}

function updateQuizScore(session, isCorrect){
  if (!session) return;
  var scoreBox = document.getElementById(session + '-score');
  if (!scoreBox) return;
  var correctEl = scoreBox.querySelector('.kz-quiz-correct');
  var wrongEl = scoreBox.querySelector('.kz-quiz-wrong');
  var nilaiEl = scoreBox.querySelector('.kz-quiz-nilai');
  var progressEl = document.querySelector('.kz-quiz-progress');
  var progressTxt = document.querySelector('.kz-quiz-progress-text');
  var total = document.querySelectorAll('.kz-quiz[data-session="' + session + '"]').length;

  var c = parseInt(correctEl.textContent) || 0;
  var w = parseInt(wrongEl.textContent) || 0;
  if (isCorrect) c++; else w++;
  var answered = c + w;
  var nilai = answered > 0 ? Math.round((c / answered) * 100) : 0;

  correctEl.textContent = c;
  wrongEl.textContent = w;
  nilaiEl.textContent = nilai;

  if (progressEl) progressEl.style.width = Math.round((answered / total) * 100) + '%';
  if (progressTxt) progressTxt.textContent = answered + ' / ' + total;
}

function handleNewQuiz(){
  var btn = document.getElementById('btnSubmit');
  if (!btn) return;
  // Reset input fields biar user bisa ubah
  btn.click();
  setTimeout(function(){
    var wrap = document.getElementById('resultWrap');
    if (wrap && wrap.scrollIntoView) wrap.scrollIntoView({behavior:'smooth', block:'start'});
  }, 200);
}

window.KazeQuiz = { isQuizMulti: isQuizMulti, render: renderQuizMulti };
console.log('BETOx1: KazeQuiz v2 — score + soal baru');
})();
