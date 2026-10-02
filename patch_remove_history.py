with open('public/support.html', 'r') as f:
    html = f.read()

old = '''    <!-- HISTORY -->
    <div class="sp-card" id="spHistoryCard" style="display:none">
      <div class="sp-hist-title">📋 Riwayat Laporan</div>
      <div id="spHistory"><div class="sp-empty">Belum ada laporan</div></div>
    </div>
'''

if old not in html:
    print("ERROR: blok history tidak ditemukan")
    exit(1)

html = html.replace(old, '', 1)

with open('public/support.html', 'w') as f:
    f.write(html)
print("OK: Riwayat Laporan dihapus")
