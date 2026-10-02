with open('public/login.html', 'r') as f:
    html = f.read()

anchor = """.card {
  position: relative;
  z-index: 2;
}
</style>"""

new_css = """.card {
  position: relative;
  z-index: 2;
}

/* ===== DEMO MODE ===== */
.demo-divider {
  position: relative;
  text-align: center;
  margin: 18px 0 14px;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.demo-divider::before,
.demo-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: calc(50% - 30px);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(148,163,184,0.35), transparent);
}
.demo-divider::before { left: 0; }
.demo-divider::after { right: 0; }
.demo-divider span {
  background: transparent;
  padding: 0 12px;
  position: relative;
}

.btn-demo {
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
}

/* Dark mode */
body.theme-dark .btn-demo,
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
html[data-theme="dark"] .demo-note { color: #64748b; }
body.theme-dark .demo-divider::before,
body.theme-dark .demo-divider::after,
html[data-theme="dark"] .demo-divider::before,
html[data-theme="dark"] .demo-divider::after {
  background: linear-gradient(90deg, transparent, rgba(148,163,184,0.25), transparent);
}
</style>"""

if anchor not in html:
    print("ERROR: anchor CSS tidak ditemukan")
    exit(1)

html = html.replace(anchor, new_css, 1)

with open('public/login.html', 'w') as f:
    f.write(html)

print("OK: CSS demo ditambahkan")
