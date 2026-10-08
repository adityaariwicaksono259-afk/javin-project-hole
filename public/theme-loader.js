(function () {
  'use strict';

  var STORAGE = 'vinapiay_settings';

  function getTheme() {
    var theme = 'light';

    try {
      var raw = localStorage.getItem(STORAGE);
      if (raw) {
        var settings = JSON.parse(raw);
        if (settings && (settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'auto')) {
          theme = settings.theme;
        }
      }
    } catch (e) {}

    if (theme === 'auto') {
      try {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch (e) {
        theme = 'light';
      }
    }

    return theme;
  }

  function applyTheme() {
    var theme = getTheme();

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    document.documentElement.classList.toggle('theme-light', theme === 'light');

    if (document.body) {
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme === 'light');
    }
  }

  applyTheme();

  // Sinkronkan lagi setelah DOM siap.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTheme, { once: true });
  }

  // Jika setting berubah dari tab/page lain.
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE) applyTheme();
  });

  // Auto theme mengikuti perubahan sistem.
  try {
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    if (media.addEventListener) {
      media.addEventListener('change', function () {
        if (getStoredTheme() === 'auto') applyTheme();
      });
    }
  } catch (e) {}

  function getStoredTheme() {
    try {
      var raw = localStorage.getItem(STORAGE);
      var settings = raw ? JSON.parse(raw) : null;
      return settings && settings.theme ? settings.theme : 'light';
    } catch (e) {
      return 'light';
    }
  }
})();
