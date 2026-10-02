with open('public/demo-guard.js', 'r') as f:
    js = f.read()

# ===== 1. Update konten popup =====
old_popup = """    var overlay = document.createElement('div');
    overlay.id = POPUP_ID;
    overlay.innerHTML = ''
      + '<div class="dlp-backdrop"></div>'
      + '<div class="dlp-modal">'
      + '  <div class="dlp-icon">🔒</div>'
      + '  <div class="dlp-title">Limit Demo Habis</div>'
      + '  <div class="dlp-msg">' + (message || 'Login untuk lanjut, gratis.') + '</div>'
      + '  <div class="dlp-stats">'
      + '    <div>Login gratis & dapat <b>15 request/hari</b></div>'
      + '    <div>Atau upgrade paket untuk limit lebih besar</div>'
      + '  </div>'
      + '  <button class="dlp-btn-primary" id="dlpLogin">Login Sekarang</button>'
      + '  <button class="dlp-btn-ghost" id="dlpClose">Nanti aja</button>'
      + '</div>';"""

new_popup = """    var overlay = document.createElement('div');
    overlay.id = POPUP_ID;
    overlay.innerHTML = ''
      + '<div class="dlp-backdrop"></div>'
      + '<div class="dlp-modal">'
      + '  <div class="dlp-icon">🔒</div>'
      + '  <div class="dlp-title">Mode Demo Selesai</div>'
      + '  <div class="dlp-msg">' + (message || 'Login dengan Google untuk melanjutkan.') + '</div>'
      + '  <div class="dlp-stats">'
      + '    <div>Akun Google dapat <b>20 request/hari</b></div>'
      + '    <div>Bisa upgrade paket untuk limit lebih besar</div>'
      + '    <div>Data & akses tersimpan permanen</div>'
      + '  </div>'
      + '  <button class="dlp-btn-primary" id="dlpLogin">Login dengan Google</button>'
      + '</div>';"""

if old_popup not in js:
    print("ERROR: blok popup tidak ditemukan")
    exit(1)

js = js.replace(old_popup, new_popup, 1)
print("OK: konten popup di-update")

# ===== 2. Hapus handler tombol 'Nanti aja' =====
old_handler = """    // Handler
    document.getElementById('dlpLogin').onclick = function() {
      location.href = '/login';
    };
    document.getElementById('dlpClose').onclick = function() {
      overlay.remove();
      css.remove();
    };"""

new_handler = """    // Handler — cuma tombol login (wajib)
    document.getElementById('dlpLogin').onclick = function() {
      location.href = '/login';
    };"""

if old_handler in js:
    js = js.replace(old_handler, new_handler, 1)
    print("OK: handler di-update (wajib login)")
else:
    print("WARNING: handler popup tidak ditemukan")

# ===== 3. Hapus CSS .dlp-btn-ghost =====
old_css = "      + '.dlp-btn-ghost{width:100%;padding:11px;background:transparent;color:#64748b;border:0;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}'\n      + '.dlp-btn-ghost:hover{background:rgba(148,163,184,0.1)}'\n"

if old_css in js:
    js = js.replace(old_css, '', 1)
    print("OK: CSS ghost button dihapus")
else:
    print("WARNING: CSS ghost button tidak ditemukan")

with open('public/demo-guard.js', 'w') as f:
    f.write(js)

print("SELESAI")
