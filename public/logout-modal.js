// ============================================
// JAVIN NEOBRUTALISM LOGOUT MODAL
// Inject modal ke body via JS biar PASTI muncul
// ============================================

(function() {
  'use strict';

  if (window.__jvLogoutModalLoaded) return;
  window.__jvLogoutModalLoaded = true;

  // 1. Inject CSS
  function injectCSS() {
    if (document.getElementById('jvLogoutCSS')) return;
    var css = document.createElement('style');
    css.id = 'jvLogoutCSS';
    css.textContent = `
      #jvLogoutOverlay {
        position: fixed !important;
        inset: 0 !important;
        background: rgba(10,10,10,0.7) !important;
        backdrop-filter: blur(4px) !important;
        -webkit-backdrop-filter: blur(4px) !important;
        z-index: 9999999 !important;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      }
      #jvLogoutOverlay.show {
        display: flex !important;
      }
      #jvLogoutModalBox {
        background: #FFFFFF !important;
        border: 3px solid #0A0A0A !important;
        border-radius: 16px !important;
        box-shadow: 8px 8px 0 #0A0A0A !important;
        max-width: 340px;
        width: 100%;
        padding: 24px 20px 20px;
        box-sizing: border-box;
        text-align: center;
        animation: jvLogoutPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes jvLogoutPop {
        from { opacity: 0; transform: scale(0.85); }
        to { opacity: 1; transform: scale(1); }
      }
      #jvLogoutModalBox .jv-lm-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }
      #jvLogoutModalBox .jv-lm-title {
        font-family: 'Archivo Black', system-ui, sans-serif;
        font-size: 20px;
        color: #0A0A0A;
        margin-bottom: 8px;
      }
      #jvLogoutModalBox .jv-lm-msg {
        font-family: 'Space Grotesk', system-ui, sans-serif;
        font-size: 13px;
        color: #4A4A4A;
        line-height: 1.5;
        margin-bottom: 20px;
      }
      #jvLogoutModalBox .jv-lm-buttons {
        display: flex;
        gap: 8px;
      }
      #jvLogoutModalBox button {
        flex: 1;
        padding: 12px 14px;
        font-family: 'Space Grotesk', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 700;
        border: 3px solid #0A0A0A;
        border-radius: 10px;
        box-shadow: 3px 3px 0 #0A0A0A;
        cursor: pointer;
        transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      #jvLogoutModalBox button:active {
        transform: scale(0.94) translate(2px, 2px);
        box-shadow: 1px 1px 0 #0A0A0A;
      }
      #jvLogoutModalBox .jv-lm-cancel {
        background: #FFFFFF;
        color: #0A0A0A;
      }
      #jvLogoutModalBox .jv-lm-confirm {
        background: #FF4D6D;
        color: #FFFFFF;
      }
      #jvLogoutModalBox button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
    `;
    document.head.appendChild(css);
  }

  // 2. Inject HTML modal
  function injectHTML() {
    if (document.getElementById('jvLogoutOverlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'jvLogoutOverlay';
    overlay.innerHTML = `
      <div id="jvLogoutModalBox">
        <div class="jv-lm-icon">🚪</div>
        <div class="jv-lm-title">Logout Sekarang?</div>
        <div class="jv-lm-msg">Kamu akan keluar dari akun ini.</div>
        <div class="jv-lm-buttons">
          <button type="button" class="jv-lm-cancel" id="jvLmCancel">Batal</button>
          <button type="button" class="jv-lm-confirm" id="jvLmConfirm">Logout</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Handler tombol
    document.getElementById('jvLmCancel').onclick = function() {
      overlay.classList.remove('show');
    };
    overlay.onclick = function(e) {
      if (e.target === overlay) overlay.classList.remove('show');
    };
    document.getElementById('jvLmConfirm').onclick = doLogout;
  }

  // 3. Fungsi logout
  function doLogout() {
    var btn = document.getElementById('jvLmConfirm');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Logging out...';
    }

    Promise.all([
      fetch('/api/auth/logout-demo', { method: 'POST', credentials: 'same-origin' }).catch(function(){}),
      fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(function(){})
    ]).then(function() {
      try {
        localStorage.removeItem('javin_user_id');
        localStorage.removeItem('javin_user_name');
        localStorage.removeItem('javin_user_avatar');
        localStorage.removeItem('javin_user_code');
        localStorage.removeItem('javin_session_token');
      } catch(e) {}
      location.href = '/login';
    });
  }

  // 4. Expose global function
  window.jvShowLogout = function() {
    injectCSS();
    injectHTML();
    var overlay = document.getElementById('jvLogoutOverlay');
    if (overlay) overlay.classList.add('show');
  };

  console.log('[jvLogout] loaded');
})();
