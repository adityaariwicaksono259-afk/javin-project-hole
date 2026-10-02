with open('public/index.html', 'r') as f:
    html = f.read()

# Sisipin modal konfirmasi sebelum editNameModal
anchor = '<div id="editNameModal" class="enm-overlay" style="display:none">'

modal_html = '''<!-- LOGOUT CONFIRM MODAL -->
<div id="logoutModal" class="lc-overlay" style="display:none">
  <div class="lc-modal">
    <div class="lc-icon">🚪</div>
    <div class="lc-title">Logout Sekarang?</div>
    <div class="lc-msg">Kamu akan keluar dari akun ini. Yakin mau lanjut?</div>
    <div class="lc-buttons">
      <button class="lc-btn ghost" id="lcCancel">Batal</button>
      <button class="lc-btn danger" id="lcConfirm">Logout</button>
    </div>
  </div>
</div>

<style>
.lc-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(3,6,15,0.75);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box;
  animation: lcFade .2s ease;
}
@keyframes lcFade { from { opacity: 0 } to { opacity: 1 } }
.lc-modal {
  background: #fff; border-radius: 20px;
  padding: 28px 24px 22px;
  width: 100%; max-width: 340px;
  text-align: center;
  box-shadow: 0 24px 80px rgba(0,0,0,0.35);
  animation: lcSlide .25s ease;
}
@keyframes lcSlide {
  from { transform: translateY(20px) scale(.96); opacity: 0 }
  to { transform: translateY(0) scale(1); opacity: 1 }
}
.lc-icon { font-size: 48px; margin-bottom: 12px; }
.lc-title {
  font-size: 18px; font-weight: 800; color: #0f172a;
  margin-bottom: 8px; letter-spacing: -0.3px;
}
.lc-msg {
  font-size: 13px; color: #64748b; line-height: 1.5;
  margin-bottom: 20px;
}
.lc-buttons { display: flex; gap: 8px; }
.lc-btn {
  flex: 1; padding: 13px;
  border-radius: 12px; border: 0;
  font-family: inherit;
  font-size: 13px; font-weight: 800;
  cursor: pointer;
  transition: all .15s;
}
.lc-btn.ghost {
  background: rgba(148,163,184,0.12);
  color: #475569;
}
.lc-btn.ghost:hover { background: rgba(148,163,184,0.22); }
.lc-btn.danger {
  background: #dc2626;
  color: #fff;
}
.lc-btn.danger:hover { background: #b91c1c; }
.lc-btn:active { transform: translateY(1px); }
.lc-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }
body.theme-dark .lc-modal { background: #0f172a; }
body.theme-dark .lc-title { color: #f1f5f9; }
body.theme-dark .lc-msg { color: #94a3b8; }
body.theme-dark .lc-btn.ghost { background: rgba(255,255,255,0.08); color: #cbd5e1; }
body.theme-dark .lc-btn.ghost:hover { background: rgba(255,255,255,0.15); }
</style>

'''

if 'id="logoutModal"' in html:
    print("SKIP: logoutModal udah ada")
else:
    if anchor not in html:
        print("ERROR: anchor editNameModal tidak ditemukan")
        exit(1)
    html = html.replace(anchor, modal_html + anchor, 1)
    print("OK: logout modal ditambahkan")

with open('public/index.html', 'w') as f:
    f.write(html)
