// ================================================
// SETTINGS PAGE — VinAPIay
// ================================================
(function(){
  var STORAGE = 'vinapiay_settings';

  function $(id){ return document.getElementById(id); }
  function $$(sel){ return document.querySelectorAll(sel); }

  // Default settings
  var defaults = {
    theme: 'light',       // auto | light | dark
    uiIos: true,
    anim3d: true,
    scale: '1',           // 1 | 1.2 | 1.4
    lang: 'id'            // id | en
  };

  // Load settings
  function loadSettings(){
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return Object.assign({}, defaults);
      return Object.assign({}, defaults, JSON.parse(raw));
    } catch(e) {
      return Object.assign({}, defaults);
    }
  }

  // Save settings
  function saveSettings(s){
    try { localStorage.setItem(STORAGE, JSON.stringify(s)); } catch(e){}
  }

  // Apply settings
  function applySettings(s){
    var body = document.body;

    // Theme
    var effectiveTheme = s.theme;
    if (s.theme === 'auto') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    body.classList.toggle('theme-dark', effectiveTheme === 'dark');
    body.classList.toggle('theme-light', effectiveTheme === 'light');

    // UI iOS
    body.classList.toggle('ui-ios', s.uiIos);

    // Anim 3D
    body.classList.toggle('anim-3d', s.anim3d);

    // Scale
    body.classList.remove('scale-12', 'scale-14');
    if (s.scale === '1.2') body.classList.add('scale-12');
    if (s.scale === '1.4') body.classList.add('scale-14');

    // Update UI controls
    $$('#themeSeg button').forEach(function(b){
      b.classList.toggle('active', b.dataset.val === s.theme);
    });
    $$('#scaleSeg button').forEach(function(b){
      b.classList.toggle('active', b.dataset.val === s.scale);
    });
    $$('#langSeg button').forEach(function(b){
      b.classList.toggle('active', b.dataset.val === s.lang);
    });
    if ($('tglIos')) $('tglIos').checked = s.uiIos;
    if ($('tgl3d')) $('tgl3d').checked = s.anim3d;

    // Text labels
    var themeNames = { auto: 'Otomatis (Sistem)', light: 'Terang', dark: 'Gelap' };
    if ($('themeCurrent')) $('themeCurrent').textContent = themeNames[s.theme] || 'Terang';
    if ($('langCurrent')) $('langCurrent').textContent = s.lang === 'en' ? 'English' : 'Bahasa Indonesia';
  }

  // ==== Init settings ====
  var settings = loadSettings();
  applySettings(settings);

  // ==== Event: Theme ====
  if ($('themeSeg')) {
    $$('#themeSeg button').forEach(function(b){
      b.onclick = function(){
        settings.theme = b.dataset.val;
        saveSettings(settings);
        applySettings(settings);
      };
    });
  }

  // ==== Event: UI iOS ====
  if ($('tglIos')) {
    $('tglIos').onchange = function(){
      settings.uiIos = this.checked;
      saveSettings(settings);
      applySettings(settings);
    };
  }

  // ==== Event: Anim 3D ====
  if ($('tgl3d')) {
    $('tgl3d').onchange = function(){
      settings.anim3d = this.checked;
      saveSettings(settings);
      applySettings(settings);
    };
  }

  // ==== Event: Scale ====
  if ($('scaleSeg')) {
    $$('#scaleSeg button').forEach(function(b){
      b.onclick = function(){
        settings.scale = b.dataset.val;
        saveSettings(settings);
        applySettings(settings);
      };
    });
  }

  // ==== Event: Language ====
  if ($('langSeg')) {
    $$('#langSeg button').forEach(function(b){
      b.onclick = function(){
        settings.lang = b.dataset.val;
        saveSettings(settings);
        applySettings(settings);
        document.documentElement.lang = settings.lang;
      };
    });
  }

  // ==== Auto theme listener ====
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){
      if (settings.theme === 'auto') applySettings(settings);
    });
  }

  // ==== Install PWA ====
  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    if ($('installStatus')) $('installStatus').textContent = 'Siap Dipasang';
    if ($('btnInstall')) $('btnInstall').disabled = false;
  });

  if ($('btnInstall')) {
    $('btnInstall').onclick = async function(){
      if (!deferredPrompt) {
        // Kalau nggak ada prompt (udah installed atau browser nggak support)
        if (window.matchMedia('(display-mode: standalone)').matches) {
          alert('✅ App sudah terpasang!');
        } else {
          alert('ℹ️ Browser ini nggak support install otomatis. Buka di Chrome/Safari, atau pakai "Add to Home Screen" dari menu browser.');
        }
        return;
      }
      deferredPrompt.prompt();
      var choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        if ($('installStatus')) $('installStatus').textContent = '✅ Terpasang';
      }
      deferredPrompt = null;
    };
  }

  // Cek status install
  function checkInstallStatus(){
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if ($('installStatus')) {
      $('installStatus').textContent = isStandalone ? '✅ Terpasang' : 'Siap Dipasang';
    }
    if ($('btnInstall')) {
      $('btnInstall').disabled = isStandalone;
      if (isStandalone) $('btnInstall').textContent = '✅ Terpasang';
    }
    if ($('pwaStatus')) {
      $('pwaStatus').textContent = isStandalone ? '✅ Terpasang sebagai App' : '🌐 Berjalan di browser';
    }
  }
  checkInstallStatus();

  // ==== Notifikasi ====
  function updateNotifStatus(){
    if (!('Notification' in window)) {
      if ($('notifStatus')) $('notifStatus').textContent = 'Tidak didukung browser';
      if ($('btnNotif')) $('btnNotif').disabled = true;
      return;
    }
    var perm = Notification.permission;
    if ($('notifStatus')) {
      $('notifStatus').textContent = perm === 'granted' ? '✅ Diizinkan' : perm === 'denied' ? '❌ Ditolak' : 'Belum diminta';
    }
    if ($('btnNotif')) {
      $('btnNotif').disabled = perm === 'granted';
      if (perm === 'granted') $('btnNotif').textContent = '✅ Aktif';
    }
  }
  updateNotifStatus();

  if ($('btnNotif')) {
    $('btnNotif').onclick = async function(){
      if (!('Notification' in window)) {
        alert('Browser ini nggak support notifikasi.');
        return;
      }
      try {
        var perm = await Notification.requestPermission();
        updateNotifStatus();
        if (perm === 'granted') {
          new Notification('VinAPIay', {
            body: '✅ Notifikasi aktif! Kamu bakal dapet info update & fitur baru.',
            icon: '/icon-192.png'
          });
        }
      } catch(e) {
        alert('Error: ' + e.message);
      }
    };
  }

  // ==== Cek Pembaruan ====
  if ($('btnCheckUpdate')) {
    $('btnCheckUpdate').onclick = async function(){
      this.disabled = true;
      var orig = this.textContent;
      this.textContent = '⏳ Memeriksa...';
      try {
        // Cek service worker update
        if ('serviceWorker' in navigator) {
          var reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) {
              this.textContent = '✅ Update tersedia';
              setTimeout(function(){
                if (confirm('Update tersedia! Reload sekarang?')) {
                  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  setTimeout(function(){ location.reload(); }, 500);
                }
              }, 500);
              return;
            }
          }
        }
        // Fallback: cek versi dari server
        var r = await fetch('/download/version.json?_=' + Date.now(), { cache: 'no-store' });
        var j = await r.json();
        this.textContent = '✅ Terbaru';
        if ($('appVersion') && j.version) $('appVersion').textContent = 'v' + j.version;
        setTimeout(function(){
          if ($('btnCheckUpdate')) $('btnCheckUpdate').textContent = '🔄 Periksa';
        }, 2500);
      } catch(e) {
        this.textContent = '❌ Gagal';
        setTimeout(function(){
          if ($('btnCheckUpdate')) $('btnCheckUpdate').textContent = '🔄 Periksa';
        }, 2000);
      } finally {
        if ($('btnCheckUpdate')) $('btnCheckUpdate').disabled = false;
      }
    };
  }

  // ==== Online/Offline indicator ====
  function updateConnStatus(){
    if ($('connStatus')) {
      if (navigator.onLine) {
        $('connStatus').textContent = '● Online';
        $('connStatus').className = 'settings-value status-online';
      } else {
        $('connStatus').textContent = '● Offline';
        $('connStatus').className = 'settings-value status-offline';
      }
    }
  }
  updateConnStatus();
  window.addEventListener('online', updateConnStatus);
  window.addEventListener('offline', updateConnStatus);

  // ==== Version ====
  fetch('/download/version.json').then(function(r){ return r.json(); }).then(function(j){
    if ($('appVersion') && j.version) $('appVersion').textContent = 'v' + j.version;
  }).catch(function(){});

  // ==== Back button ====
  if ($('btnBack')) {
    $('btnBack').onclick = function(e){
      e.preventDefault();
      if (window.history.length > 1) window.history.back();
      else window.location.href = '/';
    };
  }

  // ==== Close button (kalau di-open dari iframe) ====
  if ($('btnClose')) {
    $('btnClose').onclick = function(){
      window.close();
    };
  }

  console.log('[Settings] Loaded');
})();
