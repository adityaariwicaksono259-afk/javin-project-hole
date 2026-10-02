with open('public/app.js', 'r') as f:
    code = f.read()

old = """  async function ensureUserId() {
    // 1. Coba load dari layer manapun
    var existing = await loadIdFromAny();
    if (existing) {
      saveIdToAll(existing); // re-save ke semua layer
      return existing;
    }

    // 2. Generate baru (dari fingerprint atau random)
    var newId = null;"""

new = """  async function ensureUserId() {
    // 0. Prioritas: cek cookie session (javin_demo / javin_session)
    // Kalau ada session, pakai user_code dari server
    try {
      var hasSession = document.cookie.indexOf('javin_demo=') !== -1 ||
                       document.cookie.indexOf('javin_session=') !== -1;
      if (hasSession) {
        var r0 = await fetch('/api/auth/me', {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        var j0 = await r0.json();
        if (j0 && j0.ok && j0.logged_in && j0.user && j0.user.user_code) {
          var serverCode = j0.user.user_code;
          // Simpan sebagai user_id (bukan JH-XXXX)
          saveIdToAll(serverCode);
          console.log('[UserID] Using session user_code:', serverCode);
          return serverCode;
        }
      }
    } catch(e) {
      console.warn('[UserID] Session check failed:', e.message);
    }

    // 1. Coba load dari layer manapun
    var existing = await loadIdFromAny();
    if (existing) {
      saveIdToAll(existing); // re-save ke semua layer
      return existing;
    }

    // 2. Generate baru (dari fingerprint atau random)
    var newId = null;"""

if old not in code:
    print("ERROR: ensureUserId tidak ditemukan")
    exit(1)

code = code.replace(old, new, 1)
print("OK: ensureUserId cek session dulu")

with open('public/app.js', 'w') as f:
    f.write(code)

print("SELESAI")
