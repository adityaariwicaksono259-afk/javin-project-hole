// ================================================
// ANNOUNCEMENT BANNER — VinAPIay
// ================================================
(function(){
  var STORAGE_DISMISSED = 'vinapiay_dismissed_announces';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function getDismissed() {
    try {
      var raw = localStorage.getItem(STORAGE_DISMISSED);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function addDismissed(id) {
    try {
      var arr = getDismissed();
      if (arr.indexOf(id) === -1) {
        arr.push(id);
        // Keep max 50
        if (arr.length > 50) arr = arr.slice(-50);
        localStorage.setItem(STORAGE_DISMISSED, JSON.stringify(arr));
      }
    } catch(e) {}
  }

  function typeConfig(t) {
    var map = {
      info: { icon: 'ℹ️', gradient: 'linear-gradient(135deg, #0EA5E9, #6366F1)', border: 'rgba(14,165,233,0.3)' },
      warning: { icon: '⚠️', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: 'rgba(245,158,11,0.3)' },
      success: { icon: '✅', gradient: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'rgba(22,163,74,0.3)' },
      danger: { icon: '🚨', gradient: 'linear-gradient(135deg, #dc2626, #ef4444)', border: 'rgba(220,38,38,0.3)' },
      maintenance: { icon: '🔧', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'rgba(99,102,241,0.3)' }
    };
    return map[t] || map.info;
  }

  function injectCSS() {
    if (document.getElementById('announce-css')) return;
    var style = document.createElement('style');
    style.id = 'announce-css';
    style.textContent = `
      .ann-wrap {
        position: fixed;
        top: 70px;
        left: 14px;
        right: 14px;
        z-index: 8000;
        max-width: 560px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }
      .ann-banner {
        pointer-events: auto;
        color: #fff;
        padding: 14px 16px;
        border-radius: 16px;
        box-shadow: 0 12px 32px rgba(0,0,0,0.2);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
        transform: translateY(-120%);
        opacity: 0;
        transition: transform 0.4s cubic-bezier(.2,.9,.3,1.2), opacity 0.3s;
        position: relative;
      }
      .ann-banner.show {
        transform: translateY(0);
        opacity: 1;
      }
      .ann-icon {
        font-size: 22px;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .ann-body {
        flex: 1;
        min-width: 0;
      }
      .ann-title {
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 3px;
        letter-spacing: -0.2px;
      }
      .ann-message {
        font-size: 12px;
        line-height: 1.5;
        opacity: 0.95;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .ann-close {
        position: absolute;
        top: 6px;
        right: 8px;
        background: rgba(255,255,255,0.2);
        border: 0;
        color: #fff;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        font-size: 12px;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        line-height: 1;
      }
      .ann-close:hover {
        background: rgba(255,255,255,0.35);
      }
    `;
    document.head.appendChild(style);
  }

  function renderBanner(ann) {
    var cfg = typeConfig(ann.type);
    var banner = document.createElement('div');
    banner.className = 'ann-banner';
    banner.style.background = cfg.gradient;
    banner.innerHTML =
      '<div class="ann-icon">' + cfg.icon + '</div>' +
      '<div class="ann-body">' +
        '<div class="ann-title">' + esc(ann.title) + '</div>' +
        '<div class="ann-message">' + esc(ann.message) + '</div>' +
      '</div>' +
      '<button class="ann-close" aria-label="Tutup">✕</button>';

    banner.querySelector('.ann-close').onclick = function(e) {
      e.stopPropagation();
      banner.classList.remove('show');
      setTimeout(function() {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
      }, 300);
      addDismissed(ann.id);
    };

    return banner;
  }

  async function loadAnnouncements() {
    try {
      var r = await fetch('/api/announce/list?_=' + Date.now(), { cache: 'no-store' });
      var j = await r.json();
      if (!j.ok || !Array.isArray(j.announcements) || !j.announcements.length) return;

      var dismissed = getDismissed();
      var fresh = j.announcements.filter(function(a) {
        return dismissed.indexOf(a.id) === -1;
      });

      if (!fresh.length) return;

      injectCSS();

      var wrap = document.createElement('div');
      wrap.className = 'ann-wrap';
      wrap.id = 'annWrap';
      document.body.appendChild(wrap);

      fresh.slice(0, 3).forEach(function(ann, idx) {
        var banner = renderBanner(ann);
        wrap.appendChild(banner);
        setTimeout(function() { banner.classList.add('show'); }, 800 + idx * 200);
      });

    } catch(e) {
      console.warn('[Announce] Load error:', e.message);
    }
  }

  // Load saat page ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(loadAnnouncements, 1500);
    });
  } else {
    setTimeout(loadAnnouncements, 1500);
  }
})();
