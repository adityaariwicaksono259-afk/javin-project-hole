with open('public/login.html', 'r') as f:
    html = f.read()

old = """.btn-demo {
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
}"""

new = """.btn-demo {
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(34,211,238,0.08);
  border: 1.5px solid rgba(34,211,238,0.55);
  color: #0891b2;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  display: block;
  line-height: 1.4;
}
.btn-demo:hover {
  background: rgba(34,211,238,0.15);
  border-color: #22d3ee;
  color: #0e7490;
}
.btn-demo:active { transform: translateY(1px); }
.btn-demo:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}"""

if old not in html:
    print("ERROR: blok CSS tombol tidak ditemukan")
    exit(1)

html = html.replace(old, new, 1)
print("OK: CSS tombol diperkuat")

# Dark mode juga diperkuat
old_dark = """body.theme-dark .btn-demo,
html[data-theme="dark"] .btn-demo {
  color: #cbd5e1;
  border-color: rgba(34,211,238,0.3);
}
body.theme-dark .btn-demo:hover,
html[data-theme="dark"] .btn-demo:hover {
  background: rgba(34,211,238,0.1);
  border-color: rgba(34,211,238,0.55);
}"""

new_dark = """body.theme-dark .btn-demo,
html[data-theme="dark"] .btn-demo {
  color: #22d3ee;
  background: rgba(34,211,238,0.1);
  border-color: rgba(34,211,238,0.5);
}
body.theme-dark .btn-demo:hover,
html[data-theme="dark"] .btn-demo:hover {
  background: rgba(34,211,238,0.18);
  border-color: #22d3ee;
  color: #67e8f9;
}"""

if old_dark not in html:
    print("WARNING: CSS dark tidak ditemukan (skip)")
else:
    html = html.replace(old_dark, new_dark, 1)
    print("OK: CSS dark diperkuat")

with open('public/login.html', 'w') as f:
    f.write(html)

print("SELESAI")
