// DEMO GUARD — auto-detect demo limit habis & tampilkan popup login
(function(){
  'use strict';

  var POPUP_ID = 'demoLimitPopup';
  var popupShown = false;

  function showPopup(message) {
    if (popupShown) return;
    popupShown = true;

    // Bikin overlay
    var overlay = document.createElement('div');
    overlay.id = POPUP_ID;
    overlay.innerHTML = ''
      + '<div class="dlp-backdrop"></div>'
      + '<div class="dlp-modal">'
      + '  <div class="dlp-icon">🔒</div>'
      + '  <div class="dlp-title">Mode Demo Selesai</div>'
      + '  <div class="dlp-msg">' + (message || 'Login dengan Google untuk melanjutkan.') + '</div>'
      + '  <div class="dlp-stats">'
      + '    <div>Akun Google dapat <b>20 request/hari</b></div>'
      + '    <div>Bisa upgrade paket untuk limit lebih besar</div>'
      + '    <div>Data & akses tersimpan permanen</div>'
      + '  </div>'
      + '  <button class="dlp-btn-primary" id="dlpLogin">Login dengan Google</button>'
      + '</div>';

    // CSS inline
    var css = document.createElement('style');
    css.textContent = ''
      + '.dlp-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:99998}'
      + '.dlp-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:#fff;border-radius:20px;padding:28px 24px 22px;width:calc(100% - 32px);max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.35);text-align:center;animation:dlpIn .3s ease}'
      + '@keyframes dlpIn{from{opacity:0;transform:translate(-50%,-45%) scale(.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}'
      + '.dlp-icon{font-size:48px;margin-bottom:12px}'
      + '.dlp-title{font-size:19px;font-weight:800;color:#0f172a;margin-bottom:8px}'
      + '.dlp-msg{font-size:13px;color:#475569;line-height:1.5;margin-bottom:18px}'
      + '.dlp-stats{background:linear-gradient(135deg,rgba(14,165,233,0.08),rgba(99,102,241,0.06));border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:12px 14px;font-size:12px;color:#334155;text-align:left;margin-bottom:16px;line-height:1.7}'
      + '.dlp-stats b{color:#0EA5E9}'
      + '.dlp-btn-primary{width:100%;padding:13px;background:linear-gradient(135deg,#0EA5E9,#6366F1);color:#fff;border:0;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:8px}'
      + '.dlp-btn-primary:active{transform:translateY(1px)}'
      + 'body.theme-dark .dlp-modal{background:#1e293b}'
      + 'body.theme-dark .dlp-title{color:#f1f5f9}'
      + 'body.theme-dark .dlp-msg{color:#cbd5e1}'
      + 'body.theme-dark .dlp-stats{background:linear-gradient(135deg,rgba(14,165,233,0.12),rgba(99,102,241,0.08));border-color:rgba(129,140,248,0.25);color:#cbd5e1}'
      + 'body.theme-dark .dlp-stats b{color:#60a5fa}';
    document.head.appendChild(css);
    document.body.appendChild(overlay);

    // Handler — cuma tombol login (wajib)
    document.getElementById('dlpLogin').onclick = function() {
      location.href = '/login';
    };
  }

  // Intercept fetch global
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    // Cuma intercept /api/proxy
    var isProxy = url.indexOf('/api/proxy') !== -1;
    if (!isProxy) return origFetch.apply(this, arguments);

    return origFetch.apply(this, arguments).then(function(res) {
      // Cek response 429 dengan is_demo
      if (res.status === 429) {
        // Clone biar gak ganggu consumer asli
        var clone = res.clone();
        clone.json().then(function(j) {
          if (j && j.is_demo) {
            showPopup(j.message);
          }
        }).catch(function(){});
      }
      return res;
    });
  };

  // Expose manual trigger (buat debug)
  window.demoGuard = {
    show: showPopup,
    reset: function() { popupShown = false; }
  };
})();
