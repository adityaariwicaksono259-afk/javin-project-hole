with open('public/login.html', 'r') as f:
    html = f.read()

# ===== 1. Tambah tombol demo di step 1 =====
old_btn = """    <button class="btn-primary" id="btnSend">Kirim Kode / Link</button>
    <div class="loading" id="loading1">Mengirim...</div>
    <div class="success" id="success1"></div>
    <div class="error" id="error1"></div>
  </div>"""

new_btn = """    <button class="btn-primary" id="btnSend">Kirim Kode / Link</button>
    <div class="loading" id="loading1">Mengirim...</div>
    <div class="success" id="success1"></div>
    <div class="error" id="error1"></div>

    <div class="demo-divider"><span>atau</span></div>
    <button class="btn-demo" id="btnDemo">
      <span class="demo-icon">🎮</span>
      <span class="demo-text">
        <b>Masih ragu? Cobain Mode Demo</b>
        <small>Aktif 1 jam · 1 request gratis</small>
      </span>
    </button>
    <div class="demo-note" id="demoNote">Tanpa login, tanpa email. Langsung coba.</div>
    <div class="error" id="errorDemo"></div>
  </div>"""

if old_btn not in html:
    print("ERROR: anchor tombol tidak ditemukan")
    exit(1)

html = html.replace(old_btn, new_btn, 1)
print("OK: tombol demo ditambahkan")

# ===== 2. Tambah JS handler demo (sebelum "// Cek udah login") =====
old_js = """// Cek udah login
fetch('/api/auth/me', { credentials: 'same-origin' })"""

new_js = """// ===== TOMBOL DEMO =====
var btnDemo = document.getElementById('btnDemo');
if (btnDemo) {
  btnDemo.addEventListener('click', startDemo);
}

async function startDemo() {
  var errorDemo = document.getElementById('errorDemo');
  var noteEl = document.getElementById('demoNote');
  errorDemo.classList.remove('show');
  btnDemo.disabled = true;
  btnDemo.querySelector('.demo-text small').textContent = 'Memuat...';

  try {
    var r = await fetch('/api/auth/demo', {
      method: 'POST',
      credentials: 'same-origin'
    });
    var j = await r.json();

    if (!j.ok) {
      errorDemo.textContent = j.message || 'Gagal memulai demo.';
      errorDemo.classList.add('show');
      btnDemo.disabled = false;
      btnDemo.querySelector('.demo-text small').textContent = 'Aktif 1 jam · 1 request gratis';
      return;
    }

    // Sukses
    try {
      localStorage.setItem('javin_user_id', j.user_code);
      localStorage.setItem('javin_user_name', 'Demo User');
    } catch(e){}
    noteEl.textContent = 'Demo aktif! Mengalihkan...';
    setTimeout(function(){ location.replace('/?demo=1'); }, 800);
  } catch(e) {
    errorDemo.textContent = 'Koneksi error. Coba lagi.';
    errorDemo.classList.add('show');
    btnDemo.disabled = false;
    btnDemo.querySelector('.demo-text small').textContent = 'Aktif 1 jam · 1 request gratis';
  }
}

// Cek udah login
fetch('/api/auth/me', { credentials: 'same-origin' })"""

if old_js not in html:
    print("ERROR: anchor JS login tidak ditemukan")
    exit(1)

html = html.replace(old_js, new_js, 1)
print("OK: JS handler demo ditambahkan")

with open('public/login.html', 'w') as f:
    f.write(html)

print("SELESAI")
