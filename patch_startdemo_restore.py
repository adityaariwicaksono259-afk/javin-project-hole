with open('public/login.html', 'r') as f:
    html = f.read()

old = """  noteEl.textContent = 'Memulai demo...';

  try {
    var r = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ fingerprint: fp })
    });
    var j = await r.json();

    if (!j.ok) {
      errorDemo.textContent = j.message || 'Gagal memulai demo.';
      errorDemo.classList.add('show');
      btnDemo.disabled = false;
      btnDemo.textContent = 'Masih ragu? Cobain Mode Demo';"""

new = """  noteEl.textContent = 'Memulai demo...';

  // Clear localStorage dulu (biar tampilan gak nyangkut user lama)
  // Cookie Google/email TETAP aktif (pakai javin_session terpisah)
  try {
    localStorage.removeItem('javin_user_id');
    localStorage.removeItem('javin_user_name');
    localStorage.removeItem('javin_user_avatar');
    localStorage.removeItem('javin_user_code');
    localStorage.removeItem('javin_session_token');
  } catch(e) {}

  try {
    var r = await fetch('/api/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ fingerprint: fp })
    });
    var j = await r.json();

    if (!j.ok) {
      errorDemo.textContent = j.message || 'Gagal memulai demo.';
      errorDemo.classList.add('show');
      btnDemo.disabled = false;
      btnDemo.textContent = 'Masih ragu? Cobain Mode Demo';"""

if old not in html:
    print("ERROR: blok startDemo tidak ditemukan")
    exit(1)

html = html.replace(old, new, 1)
print("OK: clear localStorage ditambahkan")

with open('public/login.html', 'w') as f:
    f.write(html)

print("SELESAI")
