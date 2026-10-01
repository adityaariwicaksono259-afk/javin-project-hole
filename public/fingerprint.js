// DEVICE FINGERPRINT — kombinasi canvas + webgl + screen + hardware
// Output: hash SHA-256 (64 char)
(function(){
  'use strict';

  function canvasFp() {
    try {
      var c = document.createElement('canvas');
      c.width = 200; c.height = 60;
      var ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('JavinFP,🎮', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('JavinFP,🎮', 4, 17);
      return c.toDataURL().slice(-100);
    } catch(e) { return 'canvas-err'; }
  }

  function webglFp() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';
      var dbg = gl.getExtension('WEBGL_debug_renderer_info');
      var vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '';
      var renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
      return (vendor + '|' + renderer).slice(0, 200);
    } catch(e) { return 'webgl-err'; }
  }

  function hardwareFp() {
    var parts = [
      screen.width,
      screen.height,
      screen.colorDepth,
      window.devicePixelRatio || 1,
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
      navigator.platform || '',
      navigator.language || '',
      navigator.languages ? navigator.languages.join(',') : '',
      new Date().getTimezoneOffset(),
      Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    ];
    return parts.join('|');
  }

  function sha256(str) {
    if (window.crypto && window.crypto.subtle) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
        .then(function(buf) {
          return Array.from(new Uint8Array(buf))
            .map(function(b){ return b.toString(16).padStart(2, '0'); })
            .join('');
        });
    }
    // Fallback: simple hash (kalau Web Crypto gak ada)
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return Promise.resolve('fb-' + Math.abs(h).toString(16));
  }

  function getFingerprint() {
    var cached = null;
    try { cached = localStorage.getItem('javin_device_fp'); } catch(e) {}
    if (cached && cached.length >= 32) return Promise.resolve(cached);

    var raw = [
      canvasFp(),
      webglFp(),
      hardwareFp()
    ].join('||');

    return sha256(raw).then(function(hash) {
      try { localStorage.setItem('javin_device_fp', hash); } catch(e) {}
      return hash;
    });
  }

  window.getFingerprint = getFingerprint;
})();
