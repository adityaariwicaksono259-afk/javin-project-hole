with open('public/login.html', 'r') as f:
    html = f.read()

old = """  // 1. Force logout session lama (biar cookie lama kehapus)
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
  } catch(e) {}

  // 2. Clear localStorage biar gak nyangkut data user lama
  try {
    localStorage.removeItem('javin_user_id');
    localStorage.removeItem('javin_user_name');
    localStorage.removeItem('javin_user_avatar');
    localStorage.removeItem('javin_user_code');
    localStorage.removeItem('javin_session_token');
  } catch(e) {}"""

new = """  // Clear localStorage biar tampilan gak nyangkut user lama
  // (Cookie Google/email TETAP aktif, karena pakai javin_session terpisah)
  try {
    localStorage.removeItem('javin_user_id');
    localStorage.removeItem('javin_user_name');
    localStorage.removeItem('javin_user_avatar');
    localStorage.removeItem('javin_user_code');
    localStorage.removeItem('javin_session_token');
  } catch(e) {}"""

if old not in html:
    print("ERROR: blok force logout tidak ditemukan")
    exit(1)

html = html.replace(old, new, 1)

with open('public/login.html', 'w') as f:
    f.write(html)

print("OK: force logout dihapus, login.html bersih")
