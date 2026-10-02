with open('public/app.js', 'r') as f:
    code = f.read()

old = """    // ===== Handler logout =====
    var logoutBtn = document.getElementById('pfLogout');
    if (logoutBtn) {
      logoutBtn.onclick = async function() {
        if (!confirm('Yakin mau logout?')) return;

        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Logging out...';

        // Cek apakah demo atau session
        var isDemo = document.cookie.indexOf('javin_demo=') !== -1;
        var endpoint = isDemo ? '/api/auth/logout-demo' : '/api/auth/logout';

        try {
          await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin'
          });
        } catch(e) {}

        // Clear localStorage
        try {
          localStorage.removeItem('javin_user_id');
          localStorage.removeItem('javin_user_name');
          localStorage.removeItem('javin_user_avatar');
          localStorage.removeItem('javin_user_code');
          localStorage.removeItem('javin_session_token');
          localStorage.removeItem('javin_display_name');
          localStorage.removeItem('javin_avatar_url');
        } catch(e) {}

        // Redirect ke login
        location.href = '/login';
      };
    }
  }"""

new = """    // ===== Handler logout — buka modal konfirmasi =====
    var logoutBtn = document.getElementById('pfLogout');
    if (logoutBtn) {
      logoutBtn.onclick = function() {
        modal.style.display = 'none';
        var cm = document.getElementById('logoutModal');
        if (cm) cm.style.display = 'flex';
      };
    }
  }

  // ===== Modal Konfirmasi Logout =====
  (function setupLogoutConfirm() {
    function init() {
      var cm = document.getElementById('logoutModal');
      if (!cm) return;

      var cancelBtn = document.getElementById('lcCancel');
      var confirmBtn = document.getElementById('lcConfirm');

      if (cancelBtn) {
        cancelBtn.onclick = function() {
          cm.style.display = 'none';
          cancelBtn.disabled = false;
          if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Logout';
          }
        };
      }

      if (confirmBtn) {
        confirmBtn.onclick = async function() {
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Logging out...';
          if (cancelBtn) cancelBtn.disabled = true;

          try {
            await fetch('/api/auth/logout-demo', {
              method: 'POST',
              credentials: 'same-origin'
            });
          } catch(e) {}
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'same-origin'
            });
          } catch(e) {}

          try {
            localStorage.removeItem('javin_user_id');
            localStorage.removeItem('javin_user_name');
            localStorage.removeItem('javin_user_avatar');
            localStorage.removeItem('javin_user_code');
            localStorage.removeItem('javin_session_token');
            localStorage.removeItem('javin_display_name');
            localStorage.removeItem('javin_avatar_url');
          } catch(e) {}

          location.replace('/login');
        };
      }

      cm.onclick = function(e) {
        if (e.target === cm && cancelBtn) cancelBtn.click();
      };
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();"""

if old not in code:
    print("ERROR: handler logout tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)

with open('public/app.js', 'w') as f:
    f.write(code)
print("OK: handler logout modal ditambahkan")
