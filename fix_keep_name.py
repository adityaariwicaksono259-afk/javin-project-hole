with open('public/app.js', 'r') as f:
    code = f.read()

old = """          try {
            localStorage.removeItem('javin_user_id');
            localStorage.removeItem('javin_user_name');
            localStorage.removeItem('javin_user_avatar');
            localStorage.removeItem('javin_user_code');
            localStorage.removeItem('javin_session_token');
            localStorage.removeItem('javin_display_name');
            localStorage.removeItem('javin_avatar_url');
          } catch(e) {}"""

new = """          try {
            localStorage.removeItem('javin_user_id');
            localStorage.removeItem('javin_user_name');
            localStorage.removeItem('javin_user_avatar');
            localStorage.removeItem('javin_user_code');
            localStorage.removeItem('javin_session_token');
            // javin_display_name & javin_avatar_url DIPERTAHANKAN
            // biar nama & foto profil tetap sama pas login lagi
          } catch(e) {}"""

if old not in code:
    print("ERROR: blok clear localStorage tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)

with open('public/app.js', 'w') as f:
    f.write(code)
print("OK: javin_display_name dipertahankan")
