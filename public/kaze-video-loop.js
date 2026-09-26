/* ===== KAZE Image Background — Self Contained ===== */
(function(){
'use strict';

function setup(){
  var bgLayer = document.getElementById('betoBgLayer');
  if (!bgLayer) {
    bgLayer = document.createElement('div');
    bgLayer.id = 'betoBgLayer';
    document.body.insertBefore(bgLayer, document.body.firstChild);
  }

  // Hapus elemen lama (video & image)
  var olds = bgLayer.querySelectorAll('video, img');
  olds.forEach(function(el){ el.remove(); });

  // Buat image element
  var img = document.createElement('img');
  img.id = 'betoBgImage';
  img.src = '/bg-main.jpg';
  img.alt = '';
  img.loading = 'eager';
  img.decoding = 'async';
  img.style.position = 'absolute';
  img.style.top = '0';
  img.style.left = '0';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.pointerEvents = 'none';
  img.style.userSelect = 'none';
  img.style.webkitUserDrag = 'none';
  img.draggable = false;

  bgLayer.appendChild(img);

  console.log('BETOx1: image background ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(setup, 100); });
} else {
  setTimeout(setup, 100);
}
setTimeout(setup, 800);

})();
