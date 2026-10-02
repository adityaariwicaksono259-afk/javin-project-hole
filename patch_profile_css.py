with open('public/index.html', 'r') as f:
    html = f.read()

# Cari </head> buat sisipin CSS
anchor = '</head>'

css = '''<style>
/* ===== PROFILE MODAL (ala WhatsApp) ===== */
.pf-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(3,6,15,0.75);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box;
  animation: pfFade .2s ease;
}
@keyframes pfFade { from { opacity: 0 } to { opacity: 1 } }

.pf-modal {
  background: #fff; border-radius: 24px;
  width: 100%; max-width: 400px; max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,0.35);
  overflow: hidden;
  position: relative;
  animation: pfSlide .25s ease;
}
@keyframes pfSlide {
  from { transform: translateY(20px) scale(.97); opacity: 0 }
  to { transform: translateY(0) scale(1); opacity: 1 }
}

.pf-close {
  position: absolute; top: 14px; right: 14px;
  z-index: 10;
  background: rgba(0,0,0,0.06); border: 0;
  width: 36px; height: 36px; border-radius: 12px;
  font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #64748b;
  transition: background .15s;
}
.pf-close:hover { background: rgba(0,0,0,0.12); }

.pf-header {
  padding: 32px 20px 20px;
  text-align: center;
  background: linear-gradient(180deg, #ecf7ed 0%, #fff 100%);
}
.pf-avatar-wrap {
  position: relative;
  display: inline-block;
  cursor: pointer;
}
.pf-avatar, .pf-avatar-img {
  width: 100px; height: 100px; border-radius: 50%;
  object-fit: cover;
  border: 4px solid #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}
.pf-avatar {
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #0EA5E9, #6366F1);
  color: #fff;
  font-size: 40px; font-weight: 800;
}
.pf-avatar-overlay {
  position: absolute; inset: 0;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
  opacity: 0;
  transition: opacity .2s;
}
.pf-avatar-wrap:hover .pf-avatar-overlay { opacity: 1; }
.pf-avatar-wrap:active .pf-avatar-overlay { opacity: 1; }
.pf-upload-hint {
  font-size: 11px; color: #64748b; margin-top: 10px;
  font-weight: 500;
}

.pf-body {
  padding: 4px 20px 16px;
  overflow-y: auto;
  flex: 1;
}
.pf-field {
  padding: 14px 0;
  border-bottom: 1px solid rgba(148,163,184,0.12);
}
.pf-field:last-child { border-bottom: none; }
.pf-label {
  font-size: 10px; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 1px;
  font-weight: 700;
  margin-bottom: 6px;
}
.pf-value {
  font-size: 14px; color: #0f172a;
  font-weight: 600;
  word-break: break-word;
}
.pf-value.mono {
  font-family: monospace;
  font-size: 13px;
  letter-spacing: 0.5px;
}
.pf-value-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
}
.pf-edit-btn {
  background: rgba(14,165,233,0.1);
  border: 0;
  width: 32px; height: 32px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.pf-edit-btn:hover { background: rgba(14,165,233,0.2); }

.pf-status-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  margin-right: 6px;
  vertical-align: middle;
}
.pf-status-dot.google { background: #22c55e; }
.pf-status-dot.demo { background: #f59e0b; }

.pf-tier-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pf-tier-badge.free { background: #f1f5f9; color: #64748b; }
.pf-tier-badge.demo { background: rgba(245,158,11,0.15); color: #d97706; }
.pf-tier-badge.basic { background: rgba(34,197,94,0.15); color: #16a34a; }
.pf-tier-badge.pro { background: rgba(99,102,241,0.15); color: #6366F1; }
.pf-tier-badge.unlimited { background: rgba(168,85,247,0.15); color: #9333ea; }

.pf-limit-reset {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  margin-left: 6px;
}

.pf-footer {
  padding: 14px 20px 20px;
  border-top: 1px solid rgba(148,163,184,0.12);
}
.pf-logout {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 1.5px solid rgba(239,68,68,0.3);
  background: rgba(239,68,68,0.06);
  color: #dc2626;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all .15s;
}
.pf-logout:hover {
  background: rgba(239,68,68,0.12);
  border-color: #dc2626;
}
.pf-logout:active { transform: translateY(1px); }
.pf-logout:disabled {
  opacity: .6; cursor: not-allowed; transform: none;
}

/* Dark mode */
body.theme-dark .pf-modal, html[data-theme="dark"] .pf-modal { background: #0f172a; }
body.theme-dark .pf-header, html[data-theme="dark"] .pf-header {
  background: linear-gradient(180deg, rgba(30,41,59,0.8) 0%, #0f172a 100%);
}
body.theme-dark .pf-close, html[data-theme="dark"] .pf-close {
  background: rgba(255,255,255,0.08); color: #cbd5e1;
}
body.theme-dark .pf-close:hover, html[data-theme="dark"] .pf-close:hover {
  background: rgba(255,255,255,0.15);
}
body.theme-dark .pf-value, html[data-theme="dark"] .pf-value { color: #f1f5f9; }
body.theme-dark .pf-field, html[data-theme="dark"] .pf-field {
  border-bottom-color: rgba(255,255,255,0.06);
}
body.theme-dark .pf-footer, html[data-theme="dark"] .pf-footer {
  border-top-color: rgba(255,255,255,0.06);
}
body.theme-dark .pf-avatar, body.theme-dark .pf-avatar-img,
html[data-theme="dark"] .pf-avatar, html[data-theme="dark"] .pf-avatar-img {
  border-color: #0f172a;
}
</style>
'''

if 'PROFILE MODAL (ala WhatsApp)' in html:
    print("SKIP: CSS profile udah ada")
else:
    if anchor not in html:
        print("ERROR: </head> tidak ditemukan")
        exit(1)
    html = html.replace(anchor, css + anchor, 1)
    print("OK: CSS profile ditambahkan")

with open('public/index.html', 'w') as f:
    f.write(html)

print("SELESAI")
