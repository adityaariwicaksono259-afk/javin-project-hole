with open('public/app.js', 'r') as f:
    code = f.read()

# Sisipin handler setelah modal.onclick = close (di dalam openProfileModal)
old = """    // Click overlay = close
    modal.onclick = function(e) {
      if (e.target === modal) modal.style.display = 'none';
    };
  }

  // ===== Profile Editor lama (dipanggil dari modal profile) ====="""

new = """    // Click overlay = close
    modal.onclick = function(e) {
      if (e.target === modal) modal.style.display = 'none';
    };

    // ===== Handler upload foto =====
    var avatarWrap = document.getElementById('pfAvatarWrap');
    var avatarInput = document.getElementById('pfAvatarInput');
    var uploadHint = document.getElementById('pfUploadHint');

    if (avatarWrap && avatarInput) {
      avatarWrap.onclick = function() { avatarInput.click(); };
    }

    if (avatarInput) {
      avatarInput.onchange = async function(e) {
        var file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          alert('Foto max 2 MB');
          return;
        }

        if (uploadHint) uploadHint.textContent = 'Uploading...';

        try {
          var fd = new FormData();
          fd.append('file', file);
          var r = await fetch('/api/user/avatar-upload', {
            method: 'POST',
            credentials: 'same-origin',
            body: fd
          });
          var j = await r.json();

          if (!j.ok) {
            alert(j.message || 'Gagal upload');
            if (uploadHint) uploadHint.textContent = 'Tap foto untuk ganti';
            return;
          }

          // Update preview
          if (pfAvatarImg) {
            pfAvatarImg.src = j.avatar_url + '?t=' + Date.now();
            pfAvatarImg.style.display = 'block';
          }
          if (pfAvatar) pfAvatar.style.display = 'none';

          // Update header avatar (kalau ada)
          try { localStorage.setItem('javin_avatar_url', j.avatar_url); } catch(e){}
          updateHeaderName();

          if (uploadHint) uploadHint.textContent = 'Berhasil diupload!';
          setTimeout(function() {
            if (uploadHint) uploadHint.textContent = 'Tap foto untuk ganti';
          }, 2000);
        } catch(err) {
          alert('Koneksi error');
          if (uploadHint) uploadHint.textContent = 'Tap foto untuk ganti';
        }
      };
    }

    // ===== Handler logout =====
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
  }

  // ===== Profile Editor lama (dipanggil dari modal profile) ====="""

if old not in code:
    print("ERROR: anchor tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)
print("OK: handler upload + logout ditambahkan")

# ===== Update updateHeaderName biar support avatar image =====
old2 = """  function updateHeaderName(){
    var el = document.getElementById('headerName');
    var av = document.getElementById('profileAvatar');
    if (!el) return;
    var saved = null;
    try { saved = localStorage.getItem('javin_display_name'); } catch(e){}
    var name = (saved && saved.trim()) ? saved.trim() : 'Javin';
    el.textContent = name;
    if (av) av.textContent = name.charAt(0).toUpperCase();
  }"""

new2 = """  function updateHeaderName(){
    var el = document.getElementById('headerName');
    var av = document.getElementById('profileAvatar');
    if (!el) return;
    var saved = null;
    try { saved = localStorage.getItem('javin_display_name'); } catch(e){}
    var name = (saved && saved.trim()) ? saved.trim() : 'Javin';
    el.textContent = name;
    if (av) {
      // Cek avatar URL
      var avatarUrl = null;
      try { avatarUrl = localStorage.getItem('javin_avatar_url'); } catch(e){}
      if (avatarUrl && avatarUrl.trim()) {
        av.style.backgroundImage = 'url(' + avatarUrl + ')';
        av.style.backgroundSize = 'cover';
        av.style.backgroundPosition = 'center';
        av.style.color = 'transparent';
      } else {
        av.textContent = name.charAt(0).toUpperCase();
      }
    }
  }"""

if old2 in code:
    code = code.replace(old2, new2, 1)
    print("OK: updateHeaderName support avatar")

with open('public/app.js', 'w') as f:
    f.write(code)
print("SELESAI")
