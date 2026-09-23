/* ===== KAZE Video Loop — Self Contained ===== */
(function(){
'use strict';

function setup(){
  var bgLayer = document.getElementById('betoBgLayer');
  if (!bgLayer) {
    bgLayer = document.createElement('div');
    bgLayer.id = 'betoBgLayer';
    document.body.insertBefore(bgLayer, document.body.firstChild);
  }

  // Hapus video lama
  var olds = bgLayer.querySelectorAll('video');
  olds.forEach(function(v){ v.remove(); });

  var v = document.createElement('video');
  v.id = 'betoBgVideo';
  v.src = '/bg.mp4';
  v.muted = true;
  v.loop = true;
  v.autoplay = true;
  v.playsInline = true;
  v.setAttribute('muted', '');
  v.setAttribute('loop', '');
  v.setAttribute('autoplay', '');
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  v.setAttribute('preload', 'auto');
  bgLayer.appendChild(v);

  function play(){
    v.muted = true;
    v.play().catch(function(){});
  }
  play();
  v.addEventListener('loadeddata', play);
  document.addEventListener('touchstart', play, { once: true, passive: true });
  document.addEventListener('click', play, { once: true, passive: true });
  setInterval(function(){ if (v.paused) play(); }, 2000);
  v.addEventListener('error', function(){
    v.load();
    setTimeout(play, 500);
  });

  console.log('BETOx1: video ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(setup, 300); });
} else {
  setTimeout(setup, 300);
}
setTimeout(setup, 1500);

})();
