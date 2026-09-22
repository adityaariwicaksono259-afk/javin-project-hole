// SUPPORT FORM — VinAPIay
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var state = { type: '', title: '', contact: '', message: '' };

  // Type selection
  document.querySelectorAll('.sp-type').forEach(function(btn) {
    btn.onclick = function() {
      document.querySelectorAll('.sp-type').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      state.type = btn.dataset.type;
      checkValid();
    };
  });

  // Message counter
  var msgEl = $('spMessage');
  var countEl = $('spCount');
  if (msgEl) {
    msgEl.addEventListener('input', function() {
      var len = msgEl.value.length;
      countEl.textContent = len + ' / 3000';
      countEl.className = 'sp-counter';
      if (len > 2800) countEl.classList.add('warn');
      if (len > 2950) {
        countEl.classList.remove('warn');
        countEl.classList.add('err');
      }
      checkValid();
    });
  }

  // Title & contact auto-limit (HTML already maxlength)
  if ($('spTitle')) $('spTitle').addEventListener('input', checkValid);
  function checkValid() {
    var valid = state.type && msgEl.value.trim().length >= 5;
    $('spSubmit').disabled = !valid;
  }

  // Submit
  var form = $('spForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      if ($('spSubmit').disabled) return;

      var btn = $('spSubmit');
      btn.disabled = true;
      btn.textContent = '⏳ Mengirim...';

      var resultEl = $('spResult');
      resultEl.className = 'sp-result';
      resultEl.style.display = 'none';

      try {
        var uid = '';
        try { uid = localStorage.getItem('javin_user_id') || ''; } catch(e) {}
        var uname = '';
        try { uname = localStorage.getItem('javin_display_name') || ''; } catch(e) {}

        var r = await fetch('/api/support/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: state.type,
            title: ($('spTitle').value || '').trim(),
            userContact: '',
            message: msgEl.value.trim(),
            userId: uid,
            userName: uname
          })
        });

        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('application/json') === -1) {
          var raw = await r.text();
          throw new Error('Server error (' + r.status + '): ' + raw.slice(0, 80));
        }

        var j = await r.json();
        if (!j.ok) throw new Error(j.message || 'Gagal kirim');

        // Success
        resultEl.className = 'sp-result show ok';
        resultEl.textContent = '✅ ' + j.message + '\n\nTiket ID: #' + j.ticket_id + '\n\nKamu bisa cek balasan admin di halaman Inbox.';

        // Reset form
        setTimeout(function() {
          document.querySelectorAll('.sp-type').forEach(function(b){ b.classList.remove('active'); });
          if ($('spTitle')) $('spTitle').value = '';
          msgEl.value = '';
          state.type = '';
          countEl.textContent = '0 / 3000';
          checkValid();
        }, 500);

      } catch(e) {
        resultEl.className = 'sp-result show err';
        resultEl.textContent = '❌ ' + e.message;
      } finally {
        btn.disabled = false;
        btn.textContent = '📤 Kirim Pesan';
      }
    });
  }

  checkValid();
})();
