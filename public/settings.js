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

  // ==== Download APK ====
  if ($('btnDownloadApk')) {
    $('btnDownloadApk').onclick = function(){
      var url = '/download/vinapiay.apk';
      var a = document.createElement('a');
      a.href = url;
      a.download = 'VinAPIay.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('⬇️ Download dimulai...');
    };
  }

  // ==== Cek Pembaruan ====
  var CURRENT_VERSION = '1.3.0'; // nanti di-update dari version.json
  var CURRENT_VERSION_CODE = 130;

  async function fetchVersionInfo(){
    try {
      var r = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' });
      var j = await r.json();
      return j;
    } catch(e) {
      return null;
    }
  }

  // Load info awal
  fetchVersionInfo().then(function(info){
    if (!info) return;
    if ($('appVersion')) $('appVersion').textContent = 'v' + info.version;
    if ($('apkInfo')) $('apkInfo').textContent = 'Versi ' + info.version + ' · ' + (info.apk_size || '1.4 MB');
    CURRENT_VERSION = info.version;
    CURRENT_VERSION_CODE = info.versionCode || 0;
    // Simpan versi terinstall
    try {
      if (!localStorage.getItem('vinapiay_installed_version')) {
        localStorage.setItem('vinapiay_installed_version', info.version);
        localStorage.setItem('vinapiay_installed_code', String(info.versionCode || 0));
      }
    } catch(e){}
  });

  if ($('btnCheckUpdate')) {
    $('btnCheckUpdate').onclick = async function(){
      var btn = this;
      var orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ Memeriksa...';

      try {
        // Cek SW update dulu
        var swUpdate = false;
        if ('serviceWorker' in navigator) {
          var reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) swUpdate = true;
          }
        }

        // Fetch info versi terbaru
        var info = await fetchVersionInfo();
        if (!info) {
          btn.textContent = '❌ Gagal';
          toast('❌ Tidak bisa cek versi. Cek koneksi internet.');
          setTimeout(function(){ btn.textContent = '🔄 Periksa'; btn.disabled = false; }, 2000);
          return;
        }

        // Bandingkan versi
        var installedVersion = '1.3.0';
        var installedCode = 130;
        try {
          installedVersion = localStorage.getItem('vinapiay_installed_version') || '1.3.0';
          installedCode = parseInt(localStorage.getItem('vinapiay_installed_code') || '130');
        } catch(e){}

        var serverCode = info.versionCode || 0;

        if (serverCode > installedCode || swUpdate) {
          // ADA UPDATE
          btn.textContent = '✅ Update tersedia';
          toast('✅ Update tersedia: v' + info.version);
          setTimeout(function(){
            var doUpdate = confirm(
              '🎉 Update tersedia!\n\n' +
              'Versi terinstall: v' + installedVersion + '\n' +
              'Versi terbaru: v' + info.version + '\n\n' +
              'Update sekarang?'
            );
            if (doUpdate) {
              // Kalau SW update, tinggal reload
              if (swUpdate && navigator.serviceWorker.controller) {
                navigator.serviceWorker.getRegistration().then(function(reg){
                  if (reg && reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }
                  setTimeout(function(){
                    toast('✅ Berhasil memperbarui!');
                    try {
                      localStorage.setItem('vinapiay_installed_version', info.version);
                      localStorage.setItem('vinapiay_installed_code', String(info.versionCode));
                    } catch(e){}
                    setTimeout(function(){ location.reload(); }, 800);
                  }, 500);
                });
              } else {
                // Kalau cuma versi baru, redirect download APK
                toast('✅ Membuka download APK...');
                try {
                  localStorage.setItem('vinapiay_installed_version', info.version);
                  localStorage.setItem('vinapiay_installed_code', String(info.versionCode));
                } catch(e){}
                setTimeout(function(){
                  window.location.href = '/download/vinapiay.apk';
                }, 800);
              }
            } else {
              btn.textContent = '🔄 Periksa';
              btn.disabled = false;
            }
          }, 500);
        } else {
          // UDAH TERBARU
          btn.textContent = '✅ Terbaru';
          toast('✅ APK sudah versi terbaru (v' + info.version + ')');
          setTimeout(function(){
            btn.textContent = '🔄 Periksa';
            btn.disabled = false;
          }, 2500);
        }

      } catch(e) {
        btn.textContent = '❌ Error';
        toast('❌ Error: ' + e.message);
        setTimeout(function(){
          btn.textContent = '🔄 Periksa';
          btn.disabled = false;
        }, 2000);
      }
    };
  }

  // ==== Toast helper ====
  function toast(msg){
    var t = document.getElementById('vtoast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'vtoast';
      t.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%) translateY(100px);background:rgba(15,23,42,.95);color:#fff;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;z-index:99999;transition:transform .3s ease,opacity .3s;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:90%;text-align:center';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(function(){
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(100px)';
    }, 3000);
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
