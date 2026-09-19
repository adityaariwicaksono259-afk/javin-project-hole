// Turnstile auto-verify — file terpisah
(function(){
  console.log('[Turnstile] Starting...');
  var SITE_KEY = '0x4AAAAAAE85ztR80uqZYabJlh4DfEJzRnY';
  var wrap = document.getElementById('turnstileWrap');
  var container = document.getElementById('turnstileContainer');
  var msg = document.getElementById('turnstileMsg');

  if (!wrap || !container) {
    console.error('[Turnstile] Modal element not found');
    return;
  }

  function setMsg(text, color) {
    if (msg) { msg.textContent = text; msg.style.color = color || '#ff9aad'; }
  }

  async function checkVerified() {
    try {
      var r = await fetch('/api/user/me?uid=__check__', { method: 'GET' });
      if (r.status === 403) {
        try {
          var j = await r.json();
          if (j.need_turnstile === true) return false;
        } catch(e) {}
        return false;
      }
      return true;
    } catch(e) {
      console.error('[Turnstile] check error:', e);
      return true;
    }
  }

  async function submitToken(token) {
    setMsg('Memverifikasi...', '#b8a3ff');
    try {
      var r = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      });
      var j = await r.json();
      if (j.ok) {
        setMsg('✅ Berhasil! Loading...', '#4ade80');
        setTimeout(function(){ location.reload(); }, 600);
      } else {
        setMsg('❌ ' + (j.message || 'Gagal. Refresh halaman.'), '#ff9aad');
        setTimeout(function(){ try { window.turnstile.reset(); } catch(e) {} }, 2000);
      }
    } catch(e) {
      setMsg('❌ Network error: ' + e.message, '#ff9aad');
    }
  }

  function initWidget() {
    if (typeof window.turnstile === 'undefined' || !window.turnstile.render) {
      setTimeout(initWidget, 300);
      return;
    }
    console.log('[Turnstile] Rendering widget...');
    try {
      window.turnstile.render('#turnstileContainer', {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: function(token) { submitToken(token); },
        'error-callback': function(code) {
          setMsg('❌ Widget error: ' + code + '. Refresh.', '#ff9aad');
        },
        'expired-callback': function() {
          setMsg('⏱️ Expired, solve ulang...', '#fbbf24');
        }
      });
    } catch(e) {
      setMsg('❌ Render error: ' + e.message, '#ff9aad');
    }
  }

  async function start() {
    var ok = await checkVerified();
    if (ok) {
      console.log('[Turnstile] Already verified, skip');
      return;
    }
    console.log('[Turnstile] Not verified, showing modal');
    wrap.style.display = 'flex';
    initWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
