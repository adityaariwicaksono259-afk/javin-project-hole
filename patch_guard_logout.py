with open('public/demo-guard.js', 'r') as f:
    js = f.read()

old = """    // Handler — cuma tombol login (wajib)
    document.getElementById('dlpLogin').onclick = function() {
      location.href = '/login';
    };"""

new = """    // Handler — tombol login (hapus cookie demo dulu, biar Google session kembali aktif)
    document.getElementById('dlpLogin').onclick = async function() {
      this.disabled = true;
      this.textContent = 'Mengalihkan...';
      try {
        await fetch('/api/auth/logout-demo', {
          method: 'POST',
          credentials: 'same-origin'
        });
      } catch(e) {}
      // Clear localStorage demo
      try {
        localStorage.removeItem('javin_user_id');
        localStorage.removeItem('javin_user_name');
        localStorage.removeItem('javin_user_avatar');
        localStorage.removeItem('javin_user_code');
      } catch(e) {}
      location.href = '/login';
    };"""

if old not in js:
    print("ERROR: handler demo-guard tidak ditemukan")
    exit(1)

js = js.replace(old, new, 1)

with open('public/demo-guard.js', 'w') as f:
    f.write(js)

print("OK: handler login di demo-guard di-update")
