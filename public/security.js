/* ===== Javin Security Client v1.0 =====
 * Fungsi:
 * 1. Generate device fingerprint unik
 * 2. Register client ke server (client_id + secret)
 * 3. Bikin HMAC signature untuk setiap request API
 * 4. Detect debugger, root, emulator (warning)
 */
(function(){
  'use strict';

  var STORAGE_KEY = 'javin_client';
  var INIT_ENDPOINT = '/api/auth/client-init';
  var FINGERPRINT_VERSION = 1;

  // ===== 1. FINGERPRINT =====
  async function sha256(str){
    var buf = new TextEncoder().encode(str);
    var hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getScreenInfo(){
    try {
      return [
        screen.width, screen.height,
        screen.colorDepth, screen.pixelDepth,
        window.devicePixelRatio || 1
      ].join('x');
    } catch(e) { return 'unknown'; }
  }

  function getTimezone(){
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'; }
    catch(e) { return 'unknown'; }
  }

  function getLanguages(){
    try { return (navigator.languages || [navigator.language || '']).join(','); }
    catch(e) { return 'unknown'; }
  }

  function getHardware(){
    try {
      return [
        navigator.hardwareConcurrency || 0,
        navigator.deviceMemory || 0,
        navigator.maxTouchPoints || 0,
        navigator.platform || 'unknown'
      ].join('x');
    } catch(e) { return 'unknown'; }
  }

  async function generateFingerprint(){
    var parts = [
      'v=' + FINGERPRINT_VERSION,
      'ua=' + (navigator.userAgent || ''),
      'lang=' + getLanguages(),
      'tz=' + getTimezone(),
      'screen=' + getScreenInfo(),
      'hw=' + getHardware()
    ];
    var raw = parts.join('|');

    // Tambah random persistent (biar unik per device — disimpan di localStorage)
    var stored = null;
    try { stored = localStorage.getItem('javin_fp_salt'); } catch(e){}
    if (!stored) {
      stored = Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem('javin_fp_salt', stored); } catch(e){}
    }
    raw += '|salt=' + stored;

    return await sha256(raw);
  }

  // ===== 2. CLIENT REGISTER =====
  async function registerClient(fingerprint){
    try {
      var r = await fetch(INIT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: fingerprint })
      });
      if (!r.ok) return null;
      var j = await r.json();
      if (!j.ok) return null;
      return { client_id: j.client_id, client_secret: j.client_secret };
    } catch(e) {
      console.warn('[SECURITY] registerClient error:', e.message);
      return null;
    }
  }

  // ===== 3. HMAC SIGNATURE =====
  async function signRequest(clientSecret, method, path, timestamp){
    var payload = method.toUpperCase() + '\n' + path + '\n' + timestamp;
    var key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(clientSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    var sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ===== 4. ANTI-DEBUG DETECTION =====
  function detectDebugger(){
    var start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    var end = performance.now();
    // Kalau lama (>100ms), kemungkinan debugger aktif
    return (end - start) > 100;
  }

  function detectRoot(){
    // Heuristic sederhana — Chrome Android di root biasanya punya flag tertentu
    try {
      // Cek apakah ada objek aneh
      if (window._phantom || window.__nightmare || window.callPhantom || window.__selenium_unwrapped || window.__webdriver_evaluate) {
        return true;
      }
      // Cek WebDriver flag
      if (navigator.webdriver) return true;
    } catch(e){}
    return false;
  }

  function isEmulator(){
    var ua = (navigator.userAgent || '').toLowerCase();
    return /emulator|android sdk built for|x86_64.*generic|genymotion|bluestacks|nox|ldplayer|memu/.test(ua);
  }

  // ===== 5. INIT =====
  var client = null;

  async function loadOrRegister(){
    // Cek cache dulu
    try {
      var cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed.client_id && parsed.client_secret) {
          client = parsed;
          return client;
        }
      }
    } catch(e){}

    // Register baru
    var fp = await generateFingerprint();
    var result = await registerClient(fp);
    if (!result) return null;

    client = result;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(client)); } catch(e){}
    return client;
  }

  // ===== 6. PATCH FETCH =====
  // Intercept semua request ke /api/proxy biar otomatis dibawa signature
  var origFetch = window.fetch;
  window.fetch = async function(input, init){
    init = init || {};
    var url = typeof input === 'string' ? input : (input.url || '');
    var method = (init.method || 'GET').toUpperCase();

    // Cuma sign request ke /api/proxy
    if (url.indexOf('/api/proxy') !== -1 && client && client.client_secret) {
      var path = url.split('?')[0];
      var ts = Date.now().toString();
      var sig = await signRequest(client.client_secret, method, path, ts);

      init.headers = init.headers || {};
      init.headers['X-Client-Id'] = client.client_id;
      init.headers['X-Timestamp'] = ts;
      init.headers['X-Signature'] = sig;
    }

    return origFetch.apply(window, [input, init]);
  };

  // ===== 7. ANTI-DEBUG LOOP =====
  // Cek debugger tiap 2 detik, kalau ketemu → freeze
  if (typeof window !== 'undefined') {
    setInterval(function(){
      if (detectDebugger()) {
        // Jangan langsung block — kasih warning aja
        document.body.style.filter = 'blur(20px)';
        console.warn('[SECURITY] Debugger detected');
      } else {
        document.body.style.filter = '';
      }
    }, 2000);
  }

  // ===== 8. EXPOSE =====
  window.JavinSecurity = {
    init: loadOrRegister,
    isEmulator: isEmulator,
    isRooted: detectRoot,
    getClient: function(){ return client; },
    version: '1.0'
  };

  // Auto-init saat load
  loadOrRegister().then(function(c){
    if (c) console.log('[SECURITY] Client registered:', c.client_id);
    else console.warn('[SECURITY] Client registration failed');

    if (isEmulator()) {
      console.warn('[SECURITY] Emulator detected');
    }
  });

  console.log('[SECURITY] Javin Security v1.0 loaded');
})();
