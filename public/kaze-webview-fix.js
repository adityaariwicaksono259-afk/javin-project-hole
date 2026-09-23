(function(){
'use strict';

// Paksa video autoplay di WebView
function forceVideo(){
  document.querySelectorAll('video').forEach(function(v){
    v.muted = true;
    v.volume = 0;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    if (v.paused) {
      var p = v.play();
      if (p && p.catch) p.catch(function(){});
    }
  });
}

// Force pada load + berkala
setTimeout(forceVideo, 100);
setTimeout(forceVideo, 500);
setTimeout(forceVideo, 1500);
setInterval(forceVideo, 3000);

// Unlock saat user sentuh
['touchstart','click','scroll'].forEach(function(evt){
  document.addEventListener(evt, forceVideo, { once: true, passive: true });
});

// Matiin overscroll bounce
document.addEventListener('touchmove', function(e){
  var t = e.target;
  var el = t;
  while (el && el !== document.body) {
    var s = getComputedStyle(el);
    if (s.overflowY === 'auto' || s.overflowY === 'scroll') {
      var atTop = el.scrollTop <= 0;
      var atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((atTop && e.touches[0].clientY > (el._lastY || 0)) || atBottom) {
        // biarkan default
      }
    }
    el = el.parentElement;
  }
}, { passive: true });

console.log('BETOx1: WebView fix aktif');

})();
