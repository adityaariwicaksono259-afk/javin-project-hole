// ============================================
// JAVIN BACK HANDLER
// Global: semua tombol back pakai history.back()
// ============================================
(function(){
  'use strict';

  // Deteksi tombol back berdasarkan:
  // 1. id/class yang mengandung "back"
  // 2. text "←" atau "Kembali"
  // 3. elemen <a> dengan href="/" atau href="/home"
  function isBackButton(el) {
    if (!el) return false;

    var id = (el.id || '').toLowerCase();
    var cls = (el.className || '').toLowerCase();
    var txt = (el.textContent || '').trim();
    var href = (el.getAttribute && el.getAttribute('href')) || '';

    // Exclude explicit
    if (el.dataset && el.dataset.noBack) return false;

    // Cek id/class
    if (/(^|[-_])back($|[-_])|btnback|backbtn|nav-back/.test(id)) return true;
    if (/(^|[-_])back($|[-_])|btnback|backbtn|nav-back/.test(cls)) return true;

    // Cek text (cuma "←" atau mulai dengan "←" atau "Kembali")
    if (txt === '←' || txt === '← Kembali' || txt === 'Kembali' || /^←/.test(txt)) {
      // Pastikan ini anchor/button, bukan span/div biasa
      if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') return true;
      // Cek juga kalau parent-nya anchor
      if (el.closest && el.closest('a,button')) return true;
    }

    // Cek href pointing ke root/home/main
    if (el.tagName === 'A') {
      if (href === '/' || href === '/home' || href === '/home.html' || href === '/index.html') {
        // Tapi ini cuma kandidat, bukan pasti back
        if (/back|kembali|←/i.test(id + ' ' + cls + ' ' + txt)) return true;
      }
    }

    return false;
  }

  function handleBack(e) {
    var el = e.target;
    // Cari anchor/button ancestor
    if (el && el.closest) {
      el = el.closest('a,button,[role="button"]');
    }
    if (!isBackButton(el)) return;

    e.preventDefault();
    e.stopPropagation();

    // Kalau history lebih dari 1, back
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback
      var href = el.getAttribute('href') || '/home';
      // Kalau href cuma '/', ganti ke /home
      if (href === '/' || href === '') href = '/home';
      window.location.href = href;
    }
  }

  // Bind via event delegation (works even untuk element yang di-inject JS)
  function bind() {
    if (document._jvBackBound) return;
    document._jvBackBound = true;
    document.addEventListener('click', handleBack, true); // capture phase
    console.log('[BackHandler] Bound');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  // Handle Android hardware back (kalau di WebView)
  window.addEventListener('popstate', function() {
    // Nggak ngapa-ngapain, biarin browser yang handle
  });

})();
