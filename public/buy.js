// BUY.JS — Beli akses tier (basic/pro/unlimited)
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };

  var state = {
    packages: [],
    selected: null,
    orderData: null
  };

  function rp(n) {
    return 'Rp ' + (n || 0).toLocaleString('id-ID');
  }

  function getUserId() {
    try { return localStorage.getItem('javin_user_id') || ''; } catch(e) { return ''; }
  }
  function getUserName() {
    try { return localStorage.getItem('javin_user_name') || ''; } catch(e) { return ''; }
  }

  // ===== LOAD PAKET =====
  async function loadPackages() {
    try {
      var r = await fetch('/api/buy/create', { cache: 'no-store' });
      var j = await r.json();
      if (j.ok && j.packages) {
        state.packages = j.packages;
        renderPackages();
      } else {
        $('pkgList').innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">Gagal memuat paket</div>';
      }
    } catch(e) {
      $('pkgList').innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">Koneksi error</div>';
    }
  }

  // ===== RENDER PAKET =====
  function renderPackages() {
    var html = state.packages.map(function(p, i) {
      var sel = state.selected === p.tier ? ' selected' : '';
      return ''
        + '<div class="buy-pkg' + sel + '" data-tier="' + p.tier + '">'
        + '  <div class="buy-pkg-head">'
        + '    <div class="buy-pkg-name">' + p.label + '</div>'
        + '    <div class="buy-pkg-price">' + rp(p.price) + '</div>'
        + '  </div>'
        + '  <div class="buy-pkg-meta">'
        + '    <div>⏱️ ' + p.days + ' hari</div>'
        + '    <div>⚡ ' + (p.limit || '-') + '</div>'
        + '  </div>'
        + '</div>';
    }).join('');

    $('pkgList').innerHTML = html;

    document.querySelectorAll('.buy-pkg').forEach(function(el) {
      el.onclick = function() {
        document.querySelectorAll('.buy-pkg').forEach(function(x){ x.classList.remove('selected'); });
        el.classList.add('selected');
        state.selected = el.dataset.tier;
        updateOrderButton();
      };
    });
  }

  function updateOrderButton() {
    var btn = $('btnOrderNow');
    if (!btn) return;
    btn.disabled = !state.selected;
  }

  // ===== CREATE ORDER =====
  async function createOrder() {
    if (!state.selected) return;
    var btn = $('btnOrderNow');
    btn.disabled = true;
    btn.textContent = '⏳ Memproses...';

    try {
      var r = await fetch('/api/buy/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: state.selected,
          user_id: getUserId(),
          user_name: getUserName()
        })
      });
      var j = await r.json();
      if (!j.ok) {
        alert(j.message || 'Gagal bikin order');
        btn.disabled = false;
        btn.textContent = '🛒 Pesan Sekarang';
        return;
      }

      state.orderData = j;
      showPaymentStep(j);
    } catch(e) {
      alert('Koneksi error');
      btn.disabled = false;
      btn.textContent = '🛒 Pesan Sekarang';
    }
  }

  // ===== SHOW PAYMENT STEP =====
  function showPaymentStep(o) {
    // Set order code
    if ($('orderCode')) $('orderCode').textContent = o.order_code;
    if ($('payAmount')) $('payAmount').textContent = rp(o.total_amount);
    if ($('payBreakdown')) {
      $('payBreakdown').textContent = rp(o.price) + ' + ' + o.unique_code + ' (kode unik)';
    }

    // DANA number
    if ($('danaNumber')) {
      $('danaNumber').textContent = o.dana_number || '(belum di-set)';
    }

    // QRIS
    if (o.qris_file_id && $('qrisImg')) {
      $('qrisImg').src = o.qris_file_id;
      if ($('qrisBox')) $('qrisBox').style.display = 'block';
    } else if ($('qrisBox')) {
      $('qrisBox').style.display = 'none';
    }

    goToStep('bayar');
  }

  // ===== UPLOAD BUKTI =====
  var fileData = null;

  function handleFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File max 5 MB');
      return;
    }
    fileData = file;
    var reader = new FileReader();
    reader.onload = function(e) {
      if ($('uploadPreview')) {
        $('uploadPreview').src = e.target.result;
        $('uploadPreview').style.display = 'block';
      }
      if ($('uploadLabel')) $('uploadLabel').textContent = file.name;
      if ($('btnUpload')) $('btnUpload').disabled = false;
    };
    reader.readAsDataURL(file);
  }

  async function uploadProof() {
    if (!fileData || !state.orderData) return;
    var btn = $('btnUpload');
    btn.disabled = true;
    btn.textContent = '⏳ Mengirim...';

    try {
      var fd = new FormData();
      fd.append('order_code', state.orderData.order_code);
      fd.append('file', fileData);

      var r = await fetch('/api/buy/upload', { method: 'POST', body: fd });
      var j = await r.json();
      if (!j.ok) {
        alert(j.message || 'Gagal upload');
        btn.disabled = false;
        btn.textContent = '📸 Kirim Bukti';
        return;
      }

      // Sukses
      if ($('btnUpload')) $('btnUpload').textContent = '✅ Terkirim';
      if ($('uploadStatus')) $('uploadStatus').style.display = 'block';
    } catch(e) {
      alert('Koneksi error');
      btn.disabled = false;
      btn.textContent = '📸 Kirim Bukti';
    }
  }

  // ===== NAVIGATION =====
  function goToStep(name) {
    document.querySelectorAll('.buy-step').forEach(function(el){ el.classList.remove('active'); });
    var el = $('step' + name.charAt(0).toUpperCase() + name.slice(1));
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.backToPilih = function() {
    state.selected = null;
    state.orderData = null;
    fileData = null;
    renderPackages();
    updateOrderButton();
    goToStep('pilih');
  };

  // ===== INIT =====
  function init() {
    loadPackages();

    if ($('btnOrderNow')) {
      $('btnOrderNow').onclick = createOrder;
    }

    var fileInput = $('fileInput');
    if (fileInput) {
      fileInput.onchange = function(e) {
        handleFile(e.target.files[0]);
      };
    }

    if ($('btnUpload')) {
      $('btnUpload').onclick = uploadProof;
    }

    // Copy order code
    if ($('orderCode')) {
      $('orderCode').onclick = function() {
        var code = $('orderCode').textContent;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code);
          alert('Order code di-copy: ' + code);
        }
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
