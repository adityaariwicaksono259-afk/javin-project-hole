with open('public/support.html', 'r') as f:
    html = f.read()

# ===== 1. Fix bubble CSS — kecilin padding + line-height =====
old_bubble = """.sp-bubble{
  padding:14px 16px;border-radius:16px;margin-bottom:12px;
  font-size:13px;line-height:1.65;white-space:pre-wrap;
  animation:bubbleIn .4s ease;
}"""

new_bubble = """.sp-bubble{
  padding:10px 14px;border-radius:14px;margin-bottom:10px;
  font-size:13px;line-height:1.5;
  animation:bubbleIn .4s ease;
  word-break:break-word;
}"""

if old_bubble in html:
    html = html.replace(old_bubble, new_bubble, 1)
    print("OK: bubble CSS di-fix")
else:
    print("ERROR: blok bubble tidak ditemukan")

# ===== 2. Hapus hero sub text =====
old_sub = '    <div class="sp-hero-sub">Pilih kategori, kirim laporan, bot kami balas otomatis</div>\n'
if old_sub in html:
    html = html.replace(old_sub, '', 1)
    print("OK: hero sub dihapus")
else:
    print("ERROR: hero sub tidak ditemukan")

# ===== 3. Fix label margin =====
old_label = """.sp-bubble-label{
  font-size:10px;text-transform:uppercase;letter-spacing:.5px;
  font-weight:700;margin-bottom:6px;opacity:.8;
}"""

new_label = """.sp-bubble-label{
  font-size:10px;text-transform:uppercase;letter-spacing:.5px;
  font-weight:700;margin-bottom:4px;opacity:.8;
}"""

if old_label in html:
    html = html.replace(old_label, new_label, 1)
    print("OK: label margin di-fix")

with open('public/support.html', 'w') as f:
    f.write(html)

print("SELESAI")
