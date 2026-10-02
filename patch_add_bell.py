with open('public/index.html', 'r') as f:
    html = f.read()

# Sisipkan bell sebelum tombol /buy
anchor = '''    <a href="/buy" title="Beli Key"'''
bell = '''    <button id="notifBell" title="Notifikasi" onclick="if(window.notif) window.notif.open()" style="width:44px;height:44px;flex-shrink:0;border-radius:14px;background:#fff;border:1px solid rgba(148,163,184,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;color:#0f172a;box-sizing:border-box;cursor:pointer;position:relative">
      🔔
      <span id="notifBadge" style="display:none;position:absolute;top:6px;right:6px;width:9px;height:9px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 0 0 2px rgba(239,68,68,0.25)"></span>
    </button>
'''
if anchor not in html:
    print("ERROR: anchor /buy tidak ditemukan")
    exit(1)

if 'notifBell' in html:
    print("SKIP: bell udah ada")
else:
    html = html.replace(anchor, bell + anchor, 1)
    print("OK: bell icon ditambahkan")

# Tambah script notif.js sebelum </body> (kalau belum ada)
if '/notif.js' not in html:
    html = html.replace('</body>', '<script src="/notif.js"></script>\n</body>', 1)
    print("OK: notif.js di-load")

with open('public/index.html', 'w') as f:
    f.write(html)
print("SELESAI")
