/* ===== KAZE Base Background — Anti Putih Bounce ===== */
(function(){
'use strict';

function init(){
  if (document.getElementById('betoBaseBg')) return;

  // Base layer fixed yang sangat gede, nutupin semua area di luar viewport
  var base = document.createElement('div');
  base.id = 'betoBaseBg';
  base.style.cssText = [
    'position:fixed',
    'top:-2000px',
    'left:-2000px',
    'width:calc(100vw + 4000px)',
    'height:calc(100vh + 4000px)',
    'background:#0a0a0a',
    'z-index:-2147483647',  // paling belakang
    'pointer-events:none'
  ].join(';');
  document.documentElement.insertBefore(base, document.documentElement.firstChild);

  // Force html/body juga
  document.documentElement.style.cssText += ';background:#0a0a0a !important;';
  if (document.body) {
    document.body.style.cssText += ';background:transparent !important;';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Retry biar pasti
setTimeout(init, 100);
setTimeout(init, 500);
setTimeout(init, 1500);
})();
