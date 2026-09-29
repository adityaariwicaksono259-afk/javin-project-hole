// SUPPORT FORM — JVaPii
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var state = { type: '' };

  var typeLabels = {
    bug: '🐛 Bug',
    error: '⚠️ Error',
    saran: '💡 Saran',
    pembelian: '💰 Pembelian'
  };

  // ===== Kategori selection =====
  document.querySelectorAll('.sp-type').forEach(function(btn){
    btn.onclick = function(){
      document.querySelectorAll('.sp-type').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      state.type = btn.dataset.type;
      checkValid();
    };
  });

  // ===== Message counter =====
  var msgEl = $('spMessage');
  var countEl = $('spCount');
  if (msgEl && countEl) {
    msgEl.addEventListener('input', function(){
      var len = msgEl.value.length;
      countEl.textContent = len + ' / 3000';
      countEl.className = 'sp-counter';
      if (len > 2800) countEl.classList.add('warn');
      if (len > 2950) { countEl.classList.remove('warn'); countEl.classList.add('err'); }
      checkValid();
    });
  }

  var titleEl = $('spTitle');
  if (titleEl) titleEl.addEventListener('input', checkValid);

  function checkValid(){
    var valid = state.type && msgEl && msgEl.value.trim().length >= 5;
    $('spSubmit').disabled = !valid;
  }

  // ===== Submit =====
  var btn = $('spSubmit');
  if (btn) btn.onclick = submit;

  async function submit(){
    var message = msgEl.value.trim();
    if (!state.type) { alert('Pilih kategori dulu.'); return; }
    if (message.length < 5) { alert('Pesan minimal 5 karakter.'); return; }

    var uid = '';
    var uname = '';
    try {
      uid = localStorage.getItem('javin_user_id') || '';
      uname = localStorage.getItem('javin_user_name') || '';
    } catch(e){}

    var payload = {
      type: state.type,
      userId: uid,
      userName: uname,
      userContact: ($('spContact').value || '').trim(),
      title: ($('spTitle').value || '').trim(),
      message: message
    };

    btn.disabled = true;
    btn.textContent = '⏳ Mengirim...';

    try {
      var r = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var j = await r.json();

      if (!j.ok) {
        alert('❌ ' + (j.message || 'Gagal kirim. Coba lagi.'));
        btn.disabled = false;
        btn.textContent = '🚀 Kirim Laporan';
        return;
      }

      // Tampil chat view
      $('spForm').style.display = 'none';
      $('spChat').classList.add('show');

      $('spChatUserMsg').textContent = message;
      $('spChatBotTitle').textContent = (j.auto_reply_emoji || '🤖') + ' ' + (j.auto_reply_title || 'Bot JVaPii');
      $('spChatBotMsg').textContent = j.auto_reply || 'Terima kasih, laporan Anda telah diterima.';

      // Scroll ke atas
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(e) {
      alert('❌ Koneksi gagal. Coba lagi.');
      btn.disabled = false;
      btn.textContent = '🚀 Kirim Laporan';
    }
  }

  function escHtml(s){
    return String(s || '').replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  // Init
})();
