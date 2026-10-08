// ================================================
// SETTINGS PAGE — Minimal (VinAPIay)
// ================================================
(function(){
  'use strict';

  var $ = function(id){ return document.getElementById(id); };

  // Back button
  if ($('btnBack')) {
    $('btnBack').onclick = function(e){
      e.preventDefault();
      if (window.history.length > 1) window.history.back();
      else window.location.href = '/home';
    };
  }

  console.log('[Settings] Loaded (minimal)');
})();
