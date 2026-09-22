// ================================================
// UPDATE BANNER — Auto cek versi baru
// ================================================
(function(){
  var STORAGE_LAST_SEEN = 'vinapiay_last_seen_version';
  var STORAGE_DISMISSED = 'vinapiay_dismissed_update';
  var CHECK_INTERVAL = 5 * 60 * 1000; // 5 menit

  var banner = null;
  var lastVersion = null;

  function createBanner() {
    if (banner) return banner;

    banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.id = 'updateBanner';
    banner.innerHTML = 
      '<div class="update-banner-icon">🎉</div>' +
      '<div class="update-banner-body">' +
        '<div class="update-banner-title" id="ubTitle">Update Web Tersedia!</div>' +
        '<div class="update-banner-sub" id="ubSub">Tap untuk refresh konten (nggak perlu download APK)</div>' +
      '</div>' +
      '<button class="update-banner-btn" id="ubBtn">🔄 Refresh</button>' +
      '<button class="update-banner-close" id="ubClose">✕</button>';
    
    document.body.appendChild(banner);

    banner.querySelector('#ubBtn').onclick = function(e) {
      e.stopPropagation();
      doRefresh();
    };
    banner.querySelector('#ubClose').onclick = function(e) {
      e.stopPropagation();
      dismiss();
    };
    banner.onclick = function() { doRefresh(); };

    return banner;
  }

  function showBanner(info) {
    var b = createBanner();
    var title = document.getElementById('ubTitle');
    var sub = document.getElementById('ubSub');
    
    if (title) title.textContent = 'Update v' + (info.version || '?') + ' tersedia!';
    if (sub) {
      if (info.notes) {
        sub.textContent = info.notes.slice(0, 80);
      } else {
        sub.textContent = 'Ketuk untuk refresh aplikasi';
      }
    }
    setTimeout(function() { b.classList.add('show'); }, 100);
  }

  function hideBanner() {
    if (banner) banner.classList.remove('show');
  }

  function dismiss() {
    hideBanner();
    if (lastVersion) {
      try { localStorage.setItem(STORAGE_DISMISSED, lastVersion); } catch(e) {}
    }
  }

  function doRefresh() {
    // 1. Clear cache service worker (konten)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        regs.forEach(function(reg) {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          reg.update();
        });
      });
    }

    // 2. Clear cache storage (asset lama)
    if ('caches' in window) {
      caches.keys().then(function(keys) {
        keys.forEach(function(k) { caches.delete(k); });
      });
    }

    // 3. Update timestamp supaya nggak nanya lagi
    try { 
      localStorage.setItem(STORAGE_LAST_SEEN, lastVersion || '');
      localStorage.removeItem(STORAGE_DISMISSED);
    } catch(e) {}

    // 4. Show loading
    var title = document.getElementById('ubTitle');
    var sub = document.getElementById('ubSub');
    if (title) title.textContent = '🔄 Memuat update...';
    if (sub) sub.textContent = 'Bentar ya, lagi ambil versi terbaru...';

    // 5. Reload dengan cache-buster (NO download APK!)
    setTimeout(function() {
      var url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now());
      window.location.replace(url.toString());
    }, 600);
  }

  async function checkUpdate() {
    try {
      var r = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' });
      var info = await r.json();
      if (!info || !info.version) return;

      var currentVersion = null;
      var dismissed = null;
      try {
        currentVersion = localStorage.getItem(STORAGE_LAST_SEEN);
        dismissed = localStorage.getItem(STORAGE_DISMISSED);
      } catch(e) {}

      // Pertama kali buka → set currentVersion
      if (!currentVersion) {
        try { localStorage.setItem(STORAGE_LAST_SEEN, info.version); } catch(e) {}
        return;
      }

      // Bandingkan versi
      if (info.version !== currentVersion && info.version !== dismissed) {
        lastVersion = info.version;
        showBanner(info);
      }
    } catch(e) {
      // Silent fail
    }
  }

  // Expose manual trigger
  window.checkAppUpdate = checkUpdate;
  window.showUpdateBanner = showBanner;

  // Cek saat load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(checkUpdate, 2000);
    });
  } else {
    setTimeout(checkUpdate, 2000);
  }

  // Cek berkala
  setInterval(checkUpdate, CHECK_INTERVAL);

  // Cek saat tab aktif
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') checkUpdate();
  });
})();
