with open('public/index.html', 'r') as f:
    html = f.read()

# Sisipin modal profile baru SEBELUM editNameModal
anchor = '<div id="editNameModal" class="enm-overlay" style="display:none">'

modal_html = '''<!-- PROFILE MODAL (ala WhatsApp) -->
<div id="profileModal" class="pf-overlay" style="display:none">
  <div class="pf-modal">
    <button class="pf-close" id="pfClose">✕</button>

    <!-- Header: Foto -->
    <div class="pf-header">
      <div class="pf-avatar-wrap" id="pfAvatarWrap">
        <div class="pf-avatar" id="pfAvatar">J</div>
        <img id="pfAvatarImg" class="pf-avatar-img" style="display:none" alt="">
        <div class="pf-avatar-overlay">
          <span>📷</span>
        </div>
        <input type="file" id="pfAvatarInput" accept="image/*" style="display:none">
      </div>
      <div class="pf-upload-hint" id="pfUploadHint">Tap foto untuk ganti</div>
    </div>

    <!-- Body: Info -->
    <div class="pf-body">
      <div class="pf-field">
        <div class="pf-label">Kode User</div>
        <div class="pf-value mono" id="pfUserCode">-</div>
      </div>

      <div class="pf-field">
        <div class="pf-label">Nama Tampilan</div>
        <div class="pf-value-row">
          <div class="pf-value" id="pfDisplayName">-</div>
          <button class="pf-edit-btn" id="pfEditName">✏️</button>
        </div>
      </div>

      <div class="pf-field">
        <div class="pf-label">Status Login</div>
        <div class="pf-value">
          <span class="pf-status-dot" id="pfStatusDot"></span>
          <span id="pfStatusText">-</span>
        </div>
      </div>

      <div class="pf-field">
        <div class="pf-label">Tier</div>
        <div class="pf-value">
          <span class="pf-tier-badge" id="pfTier">-</span>
        </div>
      </div>

      <div class="pf-field">
        <div class="pf-label">Limit Harian</div>
        <div class="pf-value">
          <span id="pfLimit">-</span>
          <span class="pf-limit-reset" id="pfLimitReset"></span>
        </div>
      </div>

      <div class="pf-field">
        <div class="pf-label">Bergabung</div>
        <div class="pf-value" id="pfJoined">-</div>
      </div>
    </div>

    <!-- Footer: Logout -->
    <div class="pf-footer">
      <button class="pf-logout" id="pfLogout">🚪 Logout</button>
    </div>
  </div>
</div>

'''

if 'id="profileModal"' in html:
    print("SKIP: modal profile udah ada")
else:
    if anchor not in html:
        print("ERROR: anchor editNameModal tidak ditemukan")
        exit(1)
    html = html.replace(anchor, modal_html + anchor, 1)
    print("OK: modal profile ditambahkan")

with open('public/index.html', 'w') as f:
    f.write(html)

print("SELESAI")
