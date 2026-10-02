with open('public/login.html', 'r') as f:
    html = f.read()

# ===== 1. Load fingerprint.js sebelum script login =====
# Cari baris script terakhir sebelum JS utama
anchor_load = "<script>"
# Kita cari script pertama di body (bukan di head)
# Cara aman: cari pattern yang unik, misal "var btnDemo"

# ===== 2. Ganti handler startDemo biar kirim fingerprint =====
old_handler = """async function startDemo() {
  var errorDemo = document.getElementById('errorDemo');
  var noteEl = document.getElementById('demoNote');
  errorDemo.classList.remove('show');
  btnDemo.disabled = true;
  btnDemo.textContent = 'Memuat...';
  noteEl.textContent = '';

  try {
    var r = await fetch('/api/auth/demo', {
      method: 'POST',
      credentials: 'same-origin'
    });
    var j = await r.json();"""

new_handler = """async function startDemo() {
  var errorDemo = document.getElementById('errorDemo');
  var noteEl = document.getElementById('demoNote');
  errorDemo.classList.remove('show');
  btnDemo.disabled = true;
  btnDemo.textContent = 'Memuat...';
  noteEl.textContent = 'Cek device...';

  // Ambil fingerprint device
  var fp = '';
  try {
    if (window.getFingerprint) {
      fp = await window.getFingerprint();
    }
  } catch(e) {}

  if (!fp || fp.length < 16) {
    errorDemo.textContent = 'Gagal cek device. Coba refresh halaman.';
    errorDemo.classList.add('show');
    btnDemo.disabled = false;
    btnDemo.textContent = 'Masih ragu? Cobain Mode Demo';
    noteEl.textContent = '';
    return;
  }

  noteEl.textContent = 'Memulai demo...';

  try {
    var r = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ fingerprint: fp })
    });
    var j = await r.json();"""

if old_handler not in html:
    print("ERROR: handler startDemo tidak ditemukan")
    exit(1)

html = html.replace(old_handler, new_handler, 1)
print("OK: handler startDemo di-update (fingerprint)")

# ===== 3. Load fingerprint.js sebelum </body> =====
if '/fingerprint.js' not in html:
    html = html.replace('</body>', '<script src="/fingerprint.js"></script>\n</body>', 1)
    print("OK: fingerprint.js di-load")
else:
    print("SKIP: fingerprint.js udah ada")

with open('public/login.html', 'w') as f:
    f.write(html)

print("SELESAI")
