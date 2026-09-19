// Admin 2FA Login Flow — 3 step: password → username → kode Telegram
(function(){
  var state = { password: '', username: '', code: '' };

  function $(id){ return document.getElementById(id) }

  function setMsg(text, type){
    var el = $('a2faMsg');
    if (!el) return;
    el.className = 'a2fa-msg ' + (type || '');
    el.textContent = text || '';
  }

  function showStep(n){
    $('a2faStep1').style.display = (n === 1) ? 'flex' : 'none';
    $('a2faStep2').style.display = (n === 2) ? 'flex' : 'none';
    $('a2faStep3').style.display = (n === 3) ? 'flex' : 'none';
    var sub = $('a2faSub');
    if (n === 1) sub.textContent = 'Masukkan password administratif untuk melanjutkan.';
    else if (n === 2) sub.textContent = 'Password OK. Sekarang masukkan username admin.';
    else if (n === 3) sub.textContent = 'Kode 6 digit sudah dikirim ke Telegram kamu. Cek dan masukkan.';
    setMsg('', '');
    setTimeout(function(){
      var input = (n === 1) ? $('a2faPassword') : (n === 2) ? $('a2faUsername') : $('a2faCode');
      if (input) input.focus();
    }, 100);
  }

  function openModal(){
    var m = $('admin2FAModal');
    if (!m) return;
    m.style.display = 'flex';
    $('a2faPassword').value = '';
    $('a2faUsername').value = '';
    $('a2faCode').value = '';
    state = { password: '', username: '', code: '' };
    showStep(1);
  }

  function closeModal(){
    var m = $('admin2FAModal');
    if (m) m.style.display = 'none';
    state = { password: '', username: '', code: '' };
  }

  // ==== STEP 1: Password (client-side only check, verify bakal di step 3) ====
  function submitPassword(){
    var pw = $('a2faPassword').value;
    if (!pw) { setMsg('Password wajib diisi.', 'err'); return; }
    state.password = pw;
    showStep(2);
  }

  // ==== STEP 2: Username (client-side only) ====
  function submitUsername(){
    var un = $('a2faUsername').value.trim();
    if (!un) { setMsg('Username wajib diisi.', 'err'); return; }
    state.username = un;
    // Kirim ke server buat verify password + username, request kode Telegram
    request2FA();
  }

  async function request2FA(){
    setMsg('Memverifikasi...', 'info');
    var btn = $('a2faBtnUser');
    if (btn) btn.disabled = true;

    try {
      var r = await fetch('/api/admin/request-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: state.username, password: state.password })
      });
      var j = await r.json();

      if (!j.ok) {
        setMsg(j.message || 'Gagal verifikasi.', 'err');
        // Balik ke step 1 kalau salah password/username
        setTimeout(function(){ showStep(1); setMsg(j.message, 'err'); }, 1500);
        return;
      }

      setMsg('✅ ' + j.message, 'ok');
      showStep(3);
      startTimer(300); // 5 menit
    } catch(e) {
      setMsg('Network error: ' + e.message, 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ==== STEP 3: Code ====
  async function submitCode(){
    var code = $('a2faCode').value.trim();
    if (!/^\d{6}$/.test(code)) {
      setMsg('Kode harus 6 digit angka.', 'err');
      return;
    }
    state.code = code;
    setMsg('Memverifikasi kode...', 'info');
    var btn = $('a2faBtnCode');
    if (btn) btn.disabled = true;

    try {
      var r = await fetch('/api/admin/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      });
      var j = await r.json();

      if (!j.ok) {
        setMsg(j.message || 'Kode salah.', 'err');
        $('a2faCode').value = '';
        $('a2faCode').focus();
        return;
      }

      setMsg('✅ Login berhasil! Memuat panel...', 'ok');
      setTimeout(function(){
        closeModal();
        // Trigger refresh panel — kalau ada fungsi global
        if (window.__adminReloadPanel) window.__adminReloadPanel();
        else location.reload();
      }, 800);
    } catch(e) {
      setMsg('Network error: ' + e.message, 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ==== Timer countdown 5 menit ====
  var timerHandle = null;
  function startTimer(seconds){
    var el = $('a2faTimer');
    if (timerHandle) clearInterval(timerHandle);
    var left = seconds;
    function tick(){
      if (left <= 0) {
        clearInterval(timerHandle);
        if (el) el.textContent = '⏱️ Kode expired. Tutup dan coba lagi.';
        setMsg('Kode expired. Tutup modal dan login ulang.', 'err');
        return;
      }
      var m = Math.floor(left / 60);
      var s = left % 60;
      if (el) el.textContent = '⏱️ Berlaku ' + m + ':' + String(s).padStart(2, '0');
      left--;
    }
    tick();
    timerHandle = setInterval(tick, 1000);
  }

  // ==== Event listeners ====
  document.addEventListener('DOMContentLoaded', function(){
    var launch = $('adminLaunch');
    if (launch) {
      launch.onclick = function(e){ e.preventDefault(); openModal(); };
    }

    var btnPw = $('a2faBtnPw');
    if (btnPw) btnPw.onclick = submitPassword;

    var btnUser = $('a2faBtnUser');
    if (btnUser) btnUser.onclick = submitUsername;

    var btnCode = $('a2faBtnCode');
    if (btnCode) btnCode.onclick = submitCode;

    var btnClose = $('a2faClose');
    if (btnClose) btnClose.onclick = closeModal;

    // Enter key support
    var pw = $('a2faPassword');
    if (pw) pw.addEventListener('keydown', function(e){ if (e.key === 'Enter') submitPassword(); });

    var un = $('a2faUsername');
    if (un) un.addEventListener('keydown', function(e){ if (e.key === 'Enter') submitUsername(); });

    var cd = $('a2faCode');
    if (cd) cd.addEventListener('keydown', function(e){ if (e.key === 'Enter') submitCode(); });

    // Auto-clear code saat modal ditutup
    var overlay = $('admin2FAModal');
    if (overlay) overlay.addEventListener('click', function(e){
      if (e.target === overlay) closeModal();
    });
  });

  // Ekspos biar bisa dipanggil dari app.js
  window.__admin2FAOpen = openModal;
  window.__admin2FAClose = closeModal;

  console.log('[Admin2FA] Loaded');
})();
