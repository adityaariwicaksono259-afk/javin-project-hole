with open('public/login.html', 'r') as f:
    html = f.read()

# ===== 1. Ganti isi tombol =====
old_btn = """    <button class="btn-demo" id="btnDemo">
      <span class="demo-icon">🎮</span>
      <span class="demo-text">
        <b>Masih ragu? Cobain Mode Demo</b>
        <small>Aktif 1 jam · 1 request gratis</small>
      </span>
    </button>
    <div class="demo-note" id="demoNote">Tanpa login, tanpa email. Langsung coba.</div>"""

new_btn = """    <button class="btn-demo" id="btnDemo">Masih ragu? Cobain Mode Demo</button>
    <div class="demo-note" id="demoNote"></div>"""

if old_btn not in html:
    print("ERROR: blok tombol tidak ditemukan")
    exit(1)

html = html.replace(old_btn, new_btn, 1)
print("OK: tombol disederhanakan")

# ===== 2. Ganti CSS .btn-demo biar centered & clean =====
old_css = """.btn-demo {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(34,211,238,0.06);
  border: 1.5px dashed rgba(34,211,238,0.45);
  color: #0f172a;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  font-family: inherit;
}
.btn-demo:hover {
  background: rgba(34,211,238,0.12);
  border-color: rgba(34,211,238,0.7);
  transform: translateY(-1px);
}
.btn-demo:active { transform: translateY(0); }
.btn-demo:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.demo-icon {
  font-size: 24px;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34,211,238,0.15);
  border-radius: 12px;
}
.demo-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.demo-text b {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}
.demo-text small {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}
.demo-note {
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 10px;
  font-weight: 500;
}"""

new_css = """.btn-demo {
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  background: transparent;
  border: 1.5px dashed rgba(34,211,238,0.4);
  color: #0f172a;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
}
.btn-demo:hover {
  background: rgba(34,211,238,0.08);
  border-color: rgba(34,211,238,0.65);
}
.btn-demo:active { transform: translateY(1px); }
.btn-demo:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.demo-note {
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 8px;
  font-weight: 500;
  min-height: 14px;
}"""

if old_css not in html:
    print("ERROR: blok CSS lama tidak ditemukan")
    exit(1)

html = html.replace(old_css, new_css, 1)
print("OK: CSS disederhanakan")

# ===== 3. Ganti CSS dark mode =====
old_dark = """body.theme-dark .btn-demo,
html[data-theme="dark"] .btn-demo {
  background: rgba(34,211,238,0.08);
  border-color: rgba(34,211,238,0.35);
  color: #e2e8f0;
}
body.theme-dark .btn-demo:hover,
html[data-theme="dark"] .btn-demo:hover {
  background: rgba(34,211,238,0.15);
  border-color: rgba(34,211,238,0.6);
}
body.theme-dark .demo-text b,
html[data-theme="dark"] .demo-text b { color: #f1f5f9; }
body.theme-dark .demo-text small,
html[data-theme="dark"] .demo-text small { color: #94a3b8; }
body.theme-dark .demo-icon,
html[data-theme="dark"] .demo-icon {
  background: rgba(34,211,238,0.2);
}
body.theme-dark .demo-note,
html[data-theme="dark"] .demo-note { color: #64748b; }"""

new_dark = """body.theme-dark .btn-demo,
html[data-theme="dark"] .btn-demo {
  color: #cbd5e1;
  border-color: rgba(34,211,238,0.3);
}
body.theme-dark .btn-demo:hover,
html[data-theme="dark"] .btn-demo:hover {
  background: rgba(34,211,238,0.1);
  border-color: rgba(34,211,238,0.55);
}
body.theme-dark .demo-note,
html[data-theme="dark"] .demo-note { color: #64748b; }"""

if old_dark not in html:
    print("WARNING: blok CSS dark tidak ditemukan (skip)")
else:
    html = html.replace(old_dark, new_dark, 1)
    print("OK: CSS dark disederhanakan")

# ===== 4. Ganti JS handler (karena udah gak ada .demo-text) =====
old_js = """  var errorDemo = document.getElementById('errorDemo');
  var noteEl = document.getElementById('demoNote');
  errorDemo.classList.remove('show');
  btnDemo.disabled = true;
  btnDemo.querySelector('.demo-text small').textContent = 'Memuat...';"""

new_js = """  var errorDemo = document.getElementById('errorDemo');
  var noteEl = document.getElementById('demoNote');
  errorDemo.classList.remove('show');
  btnDemo.disabled = true;
  btnDemo.textContent = 'Memuat...';
  noteEl.textContent = '';"""

if old_js not in html:
    print("WARNING: JS blok 1 tidak ditemukan")
else:
    html = html.replace(old_js, new_js, 1)
    print("OK: JS blok 1 diupdate")

old_js2 = """      errorDemo.textContent = j.message || 'Gagal memulai demo.';
      errorDemo.classList.add('show');
      btnDemo.disabled = false;
      btnDemo.querySelector('.demo-text small').textContent = 'Aktif 1 jam · 1 request gratis';
      return;"""

new_js2 = """      errorDemo.textContent = j.message || 'Gagal memulai demo.';
      errorDemo.classList.add('show');
      btnDemo.disabled = false;
      btnDemo.textContent = 'Masih ragu? Cobain Mode Demo';
      return;"""

if old_js2 not in html:
    print("WARNING: JS blok 2 tidak ditemukan")
else:
    html = html.replace(old_js2, new_js2, 1)
    print("OK: JS blok 2 diupdate")

old_js3 = """    errorDemo.textContent = 'Koneksi error. Coba lagi.';
    errorDemo.classList.add('show');
    btnDemo.disabled = false;
    btnDemo.querySelector('.demo-text small').textContent = 'Aktif 1 jam · 1 request gratis';
  }"""

new_js3 = """    errorDemo.textContent = 'Koneksi error. Coba lagi.';
    errorDemo.classList.add('show');
    btnDemo.disabled = false;
    btnDemo.textContent = 'Masih ragu? Cobain Mode Demo';
  }"""

if old_js3 not in html:
    print("WARNING: JS blok 3 tidak ditemukan")
else:
    html = html.replace(old_js3, new_js3, 1)
    print("OK: JS blok 3 diupdate")

with open('public/login.html', 'w') as f:
    f.write(html)

print("SELESAI")
