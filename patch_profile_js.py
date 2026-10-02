with open('public/app.js', 'r') as f:
    code = f.read()

# ===== 1. Ganti openProfileEditor lama dengan openProfileModal baru =====
old = """  function openProfileEditor(){
    var modal = document.getElementById('editNameModal');
    var input = document.getElementById('enmInput');
    var counter = document.getElementById('enmCount');
    var counterBox = counter ? counter.parentElement : null;

    if (!modal || !input) {"""

new = """  // ===== PROFILE MODAL (ala WhatsApp) =====
  function fmtDate(ts) {
    if (!ts) return '-';
    try {
      var d = new Date(ts);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch(e) { return '-'; }
  }

  function fmtReset(ms) {
    if (!ms || ms <= 0) return '';
    var jam = Math.floor(ms / 3600000);
    var menit = Math.floor((ms % 3600000) / 60000);
    if (jam > 0) return '(reset ' + jam + 'j ' + menit + 'm)';
    return '(reset ' + menit + 'm)';
  }

  async function openProfileModal() {
    var modal = document.getElementById('profileModal');
    if (!modal) {
      console.warn('[Profile] Modal tidak ada');
      return;
    }

    modal.style.display = 'flex';

    // Set default dulu
    var pfUserCode = document.getElementById('pfUserCode');
    var pfStatus = document.getElementById('pfStatusText');
    var pfStatusDot = document.getElementById('pfStatusDot');
    var pfTier = document.getElementById('pfTier');
    var pfLimit = document.getElementById('pfLimit');
    var pfJoined = document.getElementById('pfJoined');
    var pfDisplay = document.getElementById('pfDisplayName');
    var pfAvatar = document.getElementById('pfAvatar');
    var pfAvatarImg = document.getElementById('pfAvatarImg');

    // Nama tampilan dari localStorage
    var displayName = 'Javin';
    try {
      var saved = localStorage.getItem('javin_display_name');
      if (saved && saved.trim()) displayName = saved.trim();
    } catch(e) {}
    if (pfDisplay) pfDisplay.textContent = displayName;
    if (pfAvatar) pfAvatar.textContent = displayName.charAt(0).toUpperCase();

    // Fetch data user dari 2 endpoint
    try {
      var r1 = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      var j1 = await r1.json();

      if (j1 && j1.ok && j1.user) {
        if (pfUserCode) pfUserCode.textContent = j1.user.user_code || '-';
        if (j1.user.avatar && pfAvatarImg) {
          pfAvatarImg.src = j1.user.avatar;
          pfAvatarImg.style.display = 'block';
          if (pfAvatar) pfAvatar.style.display = 'none';
        } else {
          if (pfAvatarImg) pfAvatarImg.style.display = 'none';
          if (pfAvatar) pfAvatar.style.display = 'flex';
        }

        // Status
        var isDemo = j1.is_demo === true || j1.user.provider === 'demo';
        if (pfStatus) pfStatus.textContent = isDemo ? 'Demo Mode' : (j1.user.provider === 'google' ? 'Google' : (j1.user.provider || 'User'));
        if (pfStatusDot) pfStatusDot.className = 'pf-status-dot ' + (isDemo ? 'demo' : 'google');
      } else {
        if (pfUserCode) pfUserCode.textContent = 'Guest';
        if (pfStatus) pfStatus.textContent = 'Tidak Login';
        if (pfStatusDot) pfStatusDot.className = 'pf-status-dot';
      }
    } catch(e) {
      console.warn('[Profile] auth/me error:', e.message);
    }

    // Fetch limit & tier dari /api/user/me
    try {
      var r2 = await fetch('/api/user/me', { credentials: 'same-origin', cache: 'no-store' });
      var j2 = await r2.json();

      if (j2 && j2.ok) {
        if (pfTier) {
          var tier = j2.tier || 'free';
          pfTier.textContent = tier;
          pfTier.className = 'pf-tier-badge ' + tier;
        }
        if (pfLimit) {
          pfLimit.textContent = (j2.remaining || 0) + '/' + (j2.limit || 0);
          var resetEl = document.getElementById('pfLimitReset');
          if (resetEl) resetEl.textContent = fmtReset(j2.reset_in_ms);
        }
      }
    } catch(e) {
      console.warn('[Profile] user/me error:', e.message);
    }

    // Tanggal join dari auth/me (kalau ada)
    // (Kita bisa tambah kalau perlu nanti)

    // Handler tombol edit nama
    var editBtn = document.getElementById('pfEditName');
    if (editBtn) {
      editBtn.onclick = function() {
        modal.style.display = 'none';
        openProfileEditor(); // panggil modal lama
      };
    }

    // Handler close
    var closeBtn = document.getElementById('pfClose');
    if (closeBtn) {
      closeBtn.onclick = function() { modal.style.display = 'none'; };
    }

    // Click overlay = close
    modal.onclick = function(e) {
      if (e.target === modal) modal.style.display = 'none';
    };
  }

  // ===== Profile Editor lama (dipanggil dari modal profile) =====
  function openProfileEditor(){
    var modal = document.getElementById('editNameModal');
    var input = document.getElementById('enmInput');
    var counter = document.getElementById('enmCount');
    var counterBox = counter ? counter.parentElement : null;

    if (!modal || !input) {"""

if old not in code:
    print("ERROR: openProfileEditor tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)
print("OK: openProfileModal ditambahkan")

# ===== 2. Ganti handler profileCard biar panggil openProfileModal =====
old2 = """    var card = document.getElementById('profileCard');
    if (card) {
      card.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        openProfileEditor();
      };
    }"""

new2 = """    var card = document.getElementById('profileCard');
    if (card) {
      card.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        openProfileModal();
      };
    }"""

if old2 not in code:
    print("WARNING: handler profileCard tidak ditemukan")
else:
    code = code.replace(old2, new2, 1)
    print("OK: handler profileCard di-update")

# ===== 3. Update header name dari /api/auth/me juga (setelah session) =====
old3 = """  // Update juga setelah identify selesai
  setTimeout(updateHeaderName, 1500);
  setTimeout(updateHeaderName, 3000);"""

new3 = """  // Update juga setelah identify selesai
  setTimeout(updateHeaderName, 1500);
  setTimeout(updateHeaderName, 3000);

  // Expose ke window biar bisa dipanggil dari tempat lain
  window.openProfileModal = openProfileModal;"""

if old3 in code:
    code = code.replace(old3, new3, 1)
    print("OK: window.openProfileModal di-expose")

with open('public/app.js', 'w') as f:
    f.write(code)
print("SELESAI")
