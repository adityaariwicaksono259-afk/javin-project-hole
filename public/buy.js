// ================================================
// BUY PAGE LOGIC — VinAPIay
// ================================================
(function(){
  var $ = function(id){ return document.getElementById(id); };

  var state = {
    packages: [],
    selected: null,
    orderCode: null,
    pickedFile: null,
    qrisUrl: null
  };

  // ==== Format rupiah ====
  function rp(n) {
    return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
  }

  // ==== Load paket dari server ====
  async function loadPackages() {
    try {
      var r = await fetch('/api/buy/create', { cache: 'no-store' });
      var j = await r.json();

      if (!j.ok) throw new Error(j.message || 'Gagal load');

      state.packages = j.packages || [];
      state.hasQris = j.has_qris;

      if (!state.packages.length) {
        $('pkgList').innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">Paket belum tersedia.</div>';
        return;
      }

      renderPackages();
    } catch(e) {
      $('pkgList').innerHTML = '<div style="text-align:center;padding:20px;color:#dc2626">Error: ' + e.message + '</div>';
    }
  }

  function renderPackages() {
    var html = state.packages.map(function(p, i) {
      var badge = p.bonus ? '<div class="buy-pkg-badge">HEMAT ' + rp(p.bonus) + '</div>' : '';
      var icon = p.qty === 1 ? '🔑' : (p.qty <= 3 ? '🔑🔑' : '💎');
      return '<div class="buy-pkg" data-idx="' + i + '">' +
        badge +
        '<div class="buy-pkg-icon">' + icon + '</div>' +
        '<div class="buy-pkg-info">' +
          '<div class="buy-pkg-name">' + (p.label || (p.qty + ' Key')) + '</div>' +
          '<div class="buy-pkg-desc">' + p.qty + 'x generate premium</div>' +
        '</div>' +
        '<div class="buy-pkg-price">' + rp(p.price) + '</div>' +
      '</div>';
    }).join('');

    $('pkgList').innerHTML = html;

    document.querySelectorAll('.buy-pkg').forEach(function(el) {
      el.onclick = function() {
        document.querySelectorAll('.buy-pkg').forEach(function(x){ x.classList.remove('selected'); });
        el.classList.add('selected');
        state.selected = state.packages[parseInt(el.dataset.idx)];
        setTimeout(function(){ createOrder(); }, 250);
      };
    });
  }

  // ==== Create order ====
  async function createOrder() {
    if (!state.selected) return;

    try {
      var uid = '';
      try { uid = localStorage.getItem('javin_user_id') || ''; } catch(e) {}
      var uname = '';
      try { uname = localStorage.getItem('javin_display_name') || ''; } catch(e) {}

      var r = await fetch('/api/buy/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_qty: state.selected.qty,
          user_id: uid,
          user_name: uname
        })
      });
      var j = await r.json();
      if (!j.ok) throw new Error(j.message || 'Gagal bikin order');

      state.orderCode = j.order_code;
      state.qrisUrl = j.qris_file_id || null;

      $('orderCode').textContent = j.order_code;
      $('orderPkg').textContent = j.package.label || (j.package.qty + ' Key');
      $('orderTotal').textContent = rp(j.package.price);

      // QRIS
      if (j.has_qris && j.qris_file_id) {
        // Kalau file_id dari Telegram, kita nggak bisa langsung tampil.
        // Fallback: pakai gambar QRIS lokal di /qris.jpg
        $('qrisImg').innerHTML = '<img src="/qris.png" alt="QRIS" onerror="this.outerHTML=\'<div style=&quot;padding:30px;color:#94a3b8;text-align:center&quot;>⚠️ QRIS belum di-set admin. Hubungi @JekyNobb.</div>\'">';
      } else {
        $('qrisImg').innerHTML = '<div style="padding:30px;color:#94a3b8;text-align:center">⚠️ QRIS belum di-set admin.<br><br>Hubungi <b>@JekyNobb</b> via Telegram.</div>';
      }

      goToStep('bayar');
    } catch(e) {
      alert('Error: ' + e.message);
      document.querySelectorAll('.buy-pkg').forEach(function(x){ x.classList.remove('selected'); });
    }
  }

  // ==== Step navigation ====
  function goToStep(name) {
    document.querySelectorAll('.buy-step').forEach(function(el){ el.classList.remove('active'); });
    var el = $('step' + name.charAt(0).toUpperCase() + name.slice(1));
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.backToPilih = function() {
    state.selected = null;
    state.orderCode = null;
    resetFile();
    goToStep('pilih');
  };

  // ==== File upload ====
  var drop = $('dropZone');
  var fileInput = $('fileInput');
  var preview = $('preview');
  var previewImg = $('previewImg');
  var btnUpload = $('btnUpload');
  var btnClear = $('btnClear');

  function handleFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      alert('File harus gambar (JPG/PNG/WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File max 5 MB');
      return;
    }

    state.pickedFile = file;
    var reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      preview.classList.add('show');
      drop.style.display = 'none';
      btnUpload.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  function resetFile() {
    state.pickedFile = null;
    preview.classList.remove('show');
    drop.style.display = 'block';
    fileInput.value = '';
    btnUpload.disabled = true;
    $('resultBox').style.display = 'none';
  }

  if (drop) {
    drop.onclick = function() { fileInput.click(); };

    ['dragover','dragenter'].forEach(function(ev){
      drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.add('hover'); });
    });
    ['dragleave','drop'].forEach(function(ev){
      drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.remove('hover'); });
    });
    drop.addEventListener('drop', function(e){
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
  }

  if (fileInput) fileInput.onchange = function(e) {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  };

  if (btnClear) btnClear.onclick = resetFile;

  // ==== Upload bukti ====
  if (btnUpload) {
    btnUpload.onclick = async function() {
      if (!state.pickedFile) return;
      if (!state.orderCode) { alert('Order belum dibuat'); return; }

      btnUpload.disabled = true;
      btnUpload.textContent = '⏳ Mengirim...';

      try {
        var fd = new FormData();
        fd.append('order_code', state.orderCode);
        fd.append('file', state.pickedFile);

        var r = await fetch('/api/buy/upload', { method: 'POST', body: fd });
        var j = await r.json();

        if (!j.ok) throw new Error(j.message || 'Gagal upload');

        $('succCode').textContent = state.orderCode;
        goToStep('sukses');
      } catch(e) {
        var box = $('resultBox');
        box.className = 'buy-result err';
        box.style.display = 'block';
        box.textContent = '❌ ' + e.message;
        btnUpload.disabled = false;
        btnUpload.textContent = '📤 Kirim Bukti';
      }
    };
  }

  // Init
  loadPackages();
})();
