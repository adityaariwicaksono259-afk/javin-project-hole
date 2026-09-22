// ================================================
// MODERN DIALOG — ganti alert/confirm/prompt
// ================================================
(function(){
  // ===== Inject CSS =====
  var style = document.createElement('style');
  style.textContent = `
    .dlg-overlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(15,23,42,0.55);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }
    .dlg-overlay.show {
      opacity: 1;
      pointer-events: auto;
    }
    .dlg-box {
      width: 100%;
      max-width: 360px;
      background: #fff;
      border-radius: 22px;
      padding: 24px 22px 20px;
      box-shadow: 0 30px 80px rgba(15,23,42,0.35);
      transform: translateY(20px) scale(0.95);
      transition: transform 0.3s cubic-bezier(.2,.9,.3,1.2);
      text-align: center;
      position: relative;
    }
    .dlg-overlay.show .dlg-box {
      transform: translateY(0) scale(1);
    }
    .dlg-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 14px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      background: linear-gradient(135deg, rgba(14,165,233,.15), rgba(99,102,241,.15));
    }
    .dlg-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
      margin-bottom: 8px;
      padding: 0 10px;
    }
    .dlg-message {
      font-size: 13px;
      color: #64748b;
      line-height: 1.55;
      margin-bottom: 18px;
      padding: 0 6px;
      white-space: pre-wrap;
      word-break: break-word;
      text-align: center;
    }
    .dlg-input {
      width: 100%;
      padding: 14px 16px;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      font-size: 15px;
      font-family: inherit;
      color: #0f172a;
      text-align: center;
      outline: none;
      box-sizing: border-box;
      font-weight: 600;
      margin-bottom: 16px;
      transition: all 0.2s;
    }
    .dlg-input:focus {
      border-color: #0EA5E9;
      background: #fff;
      box-shadow: 0 0 0 4px rgba(14,165,233,0.1);
    }
    .dlg-buttons {
      display: flex;
      gap: 8px;
    }
    .dlg-btn {
      flex: 1;
      padding: 13px;
      border-radius: 12px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      border: 0;
    }
    .dlg-btn:active {
      transform: scale(0.97);
    }
    .dlg-btn.ghost {
      background: #f1f5f9;
      color: #64748b;
    }
    .dlg-btn.ghost:hover {
      background: #e2e8f0;
    }
    .dlg-btn.primary {
      background: linear-gradient(135deg, #0EA5E9, #6366F1);
      color: #fff;
      box-shadow: 0 4px 14px rgba(14,165,233,0.3);
    }
    .dlg-btn.danger {
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: #fff;
      box-shadow: 0 4px 14px rgba(220,38,38,0.3);
    }
    /* Dark mode */
    body.theme-dark .dlg-box { background: #1e293b; }
    body.theme-dark .dlg-title { color: #f1f5f9; }
    body.theme-dark .dlg-message { color: #94a3b8; }
    body.theme-dark .dlg-input {
      background: rgba(15,23,42,0.6);
      border-color: rgba(255,255,255,0.1);
      color: #f1f5f9;
    }
    body.theme-dark .dlg-btn.ghost {
      background: rgba(51,65,85,0.8);
      color: #cbd5e1;
    }
  `;
  document.head.appendChild(style);

  // ===== Core function =====
  function createDialog(opts) {
    return new Promise(function(resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'dlg-overlay';

      var icon = opts.icon || '💬';
      var title = opts.title || 'Konfirmasi';
      var message = opts.message || '';
      var type = opts.type || 'confirm'; // alert | confirm | prompt

      var inputHtml = '';
      if (type === 'prompt') {
        inputHtml = '<input class="dlg-input" id="dlgInput" type="text" placeholder="' + (opts.placeholder || '') + '" value="' + (opts.value || '') + '">';
      }

      var buttonsHtml = '';
      if (type === 'alert') {
        buttonsHtml = '<button class="dlg-btn primary" id="dlgOk">OK</button>';
      } else if (type === 'confirm') {
        buttonsHtml = 
          '<button class="dlg-btn ghost" id="dlgCancel">' + (opts.cancelText || 'Batal') + '</button>' +
          '<button class="dlg-btn ' + (opts.danger ? 'danger' : 'primary') + '" id="dlgOk">' + (opts.okText || 'OK') + '</button>';
      } else if (type === 'prompt') {
        buttonsHtml = 
          '<button class="dlg-btn ghost" id="dlgCancel">' + (opts.cancelText || 'Batal') + '</button>' +
          '<button class="dlg-btn primary" id="dlgOk">' + (opts.okText || 'OK') + '</button>';
      }

      overlay.innerHTML =
        '<div class="dlg-box">' +
          '<div class="dlg-icon">' + icon + '</div>' +
          '<div class="dlg-title">' + title + '</div>' +
          (message ? '<div class="dlg-message">' + message + '</div>' : '') +
          inputHtml +
          '<div class="dlg-buttons">' + buttonsHtml + '</div>' +
        '</div>';

      document.body.appendChild(overlay);
      setTimeout(function() { overlay.classList.add('show'); }, 10);

      var input = overlay.querySelector('#dlgInput');
      if (input) {
        setTimeout(function() { input.focus(); input.select(); }, 250);
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.preventDefault(); ok(); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        });
      }

      function close() {
        overlay.classList.remove('show');
        setTimeout(function() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
      }

      function ok() {
        var val = input ? input.value : true;
        close();
        resolve(val);
      }

      function cancel() {
        close();
        resolve(type === 'prompt' ? null : false);
      }

      var okBtn = overlay.querySelector('#dlgOk');
      var cancelBtn = overlay.querySelector('#dlgCancel');
      if (okBtn) okBtn.onclick = ok;
      if (cancelBtn) cancelBtn.onclick = cancel;

      // Click overlay = cancel
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) cancel();
      });

      // Escape = cancel
      var escHandler = function(e) {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', escHandler);
          cancel();
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }

  // ===== Global API =====
  window.showAlert = function(title, message, icon) {
    return createDialog({
      type: 'alert',
      title: title || 'Info',
      message: message || '',
      icon: icon || 'ℹ️'
    });
  };

  window.showConfirm = function(title, message, opts) {
    opts = opts || {};
    return createDialog({
      type: 'confirm',
      title: title || 'Konfirmasi',
      message: message || '',
      icon: opts.icon || '❓',
      okText: opts.okText,
      cancelText: opts.cancelText,
      danger: opts.danger
    });
  };

  window.showPrompt = function(title, message, opts) {
    opts = opts || {};
    return createDialog({
      type: 'prompt',
      title: title || 'Input',
      message: message || '',
      icon: opts.icon || '✏️',
      placeholder: opts.placeholder,
      value: opts.value,
      okText: opts.okText,
      cancelText: opts.cancelText
    });
  };

  // Shortcut: window.toast
  window.toast = function(msg, duration) {
    duration = duration || 2500;
    var t = document.getElementById('dlg-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dlg-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%) translateY(100px);background:rgba(15,23,42,.95);color:#fff;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;z-index:999999;transition:transform .3s,opacity .3s;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:90%;text-align:center;font-family:inherit';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(function() {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(100px)';
    }, duration);
  };

  console.log('[Dialog] Modern dialog loaded');
})();
