// THEME LOADER — anti-flicker, wajib di <head>
(function(){
  try {
    var raw = localStorage.getItem('vinapiay_settings');
    var s = raw ? JSON.parse(raw) : { theme: 'light', uiIos: true, anim3d: true, scale: '1' };
    var theme = s.theme || 'light';
    var eff = theme;
    if (theme === 'auto') {
      eff = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', eff);
    function applyBody() {
      if (!document.body) { setTimeout(applyBody, 10); return; }
      document.body.classList.toggle('theme-dark', eff === 'dark');
      document.body.classList.toggle('theme-light', eff === 'light');
      document.body.classList.toggle('ui-ios', s.uiIos !== false);
      document.body.classList.toggle('anim-3d', s.anim3d !== false);
      document.body.classList.remove('scale-12', 'scale-14');
      if (s.scale === '1.2') document.body.classList.add('scale-12');
      if (s.scale === '1.4') document.body.classList.add('scale-14');
    }
    applyBody();

    // Listen perubahan settings dari halaman lain
    window.addEventListener('storage', function(e) {
      if (e.key === 'vinapiay_settings') {
        try {
          var ns = JSON.parse(e.newValue || '{}');
          var nt = ns.theme || 'light';
          var neff = nt === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : nt;
          document.body.classList.toggle('theme-dark', neff === 'dark');
          document.body.classList.toggle('theme-light', neff === 'light');
        } catch(err) {}
      }
    });
  } catch(e) {}
})();
