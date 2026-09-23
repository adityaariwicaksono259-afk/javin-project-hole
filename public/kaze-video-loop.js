/* ===== KAZE Video Loop v2 — Crossfade ===== */
(function(){
'use strict';

function setup(){
  var container = document.getElementById('betoBgLayer');
  if (!container) { setTimeout(setup, 200); return; }
  
  // Hapus video lama
  var old = container.querySelectorAll('video');
  old.forEach(function(v){ v.remove(); });

  // Buat 2 video
  var vA = document.createElement('video');
  var vB = document.createElement('video');
  [vA, vB].forEach(function(v, i){
    v.id = 'betoBgVideo' + (i === 0 ? 'A' : 'B');
    v.src = '/bg.mp4';
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.preload = 'auto';
    v.style.cssText = [
      'position:absolute',
      'top:0','left:0',
      'width:100%','height:100%',
      'object-fit:cover',
      'opacity:' + (i === 0 ? '1' : '0'),
      'transition:opacity .6s ease',
      'pointer-events:none'
    ].join(';');
    container.appendChild(v);
  });

  var videos = [vA, vB];
  var current = 0;
  var switching = false;

  function startVideo(v){
    v.currentTime = 0;
    var p = v.play();
    if (p && p.catch) p.catch(function(){});
  }

  // Preload vB & pause di frame awal
  vB.addEventListener('loadeddata', function(){
    vB.pause();
    vB.currentTime = 0;
  });

  // Monitor video aktif
  function watch(){
    var act = videos[current];
    if (act.duration) {
      var remain = act.duration - act.currentTime;
      if (remain < 0.6 && !switching) {
        crossfade();
      }
    }
    requestAnimationFrame(watch);
  }

  function crossfade(){
    switching = true;
    var from = videos[current];
    var to = videos[1 - current];
    
    startVideo(to);
    to.style.opacity = '1';
    from.style.opacity = '0';
    
    setTimeout(function(){
      current = 1 - current;
      switching = false;
      // Pause video lama biar hemat
      from.pause();
    }, 600);
  }

  // Start
  vA.addEventListener('loadeddata', function(){
    startVideo(vA);
    watch();
  }, { once: true });

  // Fallback kalau loadeddata gak fire
  setTimeout(function(){
    if (vA.readyState === 0) vA.load();
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(setup, 300); });
} else {
  setTimeout(setup, 300);
}

})();
