// INBOX — VinAPIay
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var allTickets = [];
  var activeFilter = 'all';
  var openedId = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function fmtTime(ts) {
    if (!ts) return '-';
    var d = new Date(Number(ts));
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function typeInfo(t) {
    var map = {
      bug: { icon: '🐛', label: 'Bug Report' },
      saran: { icon: '💡', label: 'Saran' },
      lainnya: { icon: '📨', label: 'Pesan' }
    };
    return map[t] || { icon: '📨', label: 'Pesan' };
  }

  function statusInfo(s) {
    var map = {
      open: { label: '⏳ Menunggu', cls: 'open' },
      replied: { label: '✅ Dibalas', cls: 'replied' },
      closed: { label: '🔒 Ditutup', cls: 'closed' }
    };
    return map[s] || { label: s, cls: 'open' };
  }

  function renderTickets() {
    var list = $('ibList');
    var filtered = allTickets.filter(function(t) {
      return activeFilter === 'all' || t.status === activeFilter;
    });

    if (!filtered.length) {
      list.innerHTML =
        '<div class="ib-empty">' +
          '<div class="ib-empty-icon">📭</div>' +
          '<div class="ib-empty-title">Belum ada pesan</div>' +
          '<div class="ib-empty-sub">' + (activeFilter === 'all' ? 'Kamu belum pernah kirim pesan support.' : 'Tidak ada tiket dengan status ini.') + '</div>' +
          (activeFilter === 'all' ? '<a href="/support">💬 Kirim Pesan</a>' : '') +
        '</div>';
      return;
    }

    list.innerHTML = filtered.map(function(t) {
      var ti = typeInfo(t.type);
      var si = statusInfo(t.status);
      var isOpen = openedId === t.id;
      var hasReply = t.admin_reply && t.admin_reply.trim().length > 0;

      var replyHtml = '';
      if (hasReply) {
        replyHtml = '<div class="ib-reply-box">' +
          '<div class="ib-label">💬 Balasan Admin</div>' +
          '<div class="ib-message reply">' + esc(t.admin_reply) + '</div>' +
          '<div class="ib-date">' + fmtTime(t.updated_at) + '</div>' +
        '</div>';
      } else {
        replyHtml = '<div class="ib-reply-box">' +
          '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:8px">⏳ Menunggu balasan admin...</div>' +
        '</div>';
      }

      return '<div class="ib-card' + (isOpen ? ' open' : '') + '" data-id="' + t.id + '">' +
        '<div class="ib-head">' +
          '<div class="ib-type">' +
            '<div class="ib-type-icon">' + ti.icon + '</div>' +
            '<div style="min-width:0;flex:1">' +
              '<div class="ib-type-title">' + esc(t.title || ti.label) + '</div>' +
              '<div class="ib-id">#' + t.id + ' · ' + esc(ti.label) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="ib-status ' + si.cls + '">' + si.label + '</div>' +
        '</div>' +
        '<div class="ib-label">📩 Pesan Kamu</div>' +
        '<div class="ib-message">' + esc(t.message) + '</div>' +
        '<div class="ib-date">' + fmtTime(t.created_at) + '</div>' +
        replyHtml +
      '</div>';
    }).join('');

    list.querySelectorAll('.ib-card').forEach(function(card) {
      card.onclick = function(e) {
        if (e.target.tagName === 'A') return;
        var id = parseInt(card.dataset.id);
        openedId = (openedId === id) ? null : id;
        renderTickets();
      };
    });
  }

  async function loadTickets() {
    var list = $('ibList');
    list.innerHTML = '<div class="ib-load">⏳ Memuat...</div>';

    var uid = '';
    try { uid = localStorage.getItem('javin_user_id') || ''; } catch(e) {}

    if (!uid) {
      list.innerHTML =
        '<div class="ib-empty">' +
          '<div class="ib-empty-icon">🔒</div>' +
          '<div class="ib-empty-title">ID kamu belum ke-set</div>' +
          '<div class="ib-empty-sub">Buka halaman utama dulu biar ID kamu dibuat.</div>' +
          '<a href="/">← Ke Beranda</a>' +
        '</div>';
      return;
    }

    try {
      var r = await fetch('/api/support/my-tickets?user_id=' + encodeURIComponent(uid) + '&_=' + Date.now(), {
        cache: 'no-store'
      });

      var ct = r.headers.get('content-type') || '';
      if (ct.indexOf('application/json') === -1) {
        throw new Error('Server balikin non-JSON (HTTP ' + r.status + ')');
      }

      var j = await r.json();
      if (!j.ok) throw new Error(j.message || 'Gagal load');

      allTickets = j.tickets || [];
      renderTickets();
    } catch(e) {
      list.innerHTML =
        '<div class="ib-empty">' +
          '<div class="ib-empty-icon">⚠️</div>' +
          '<div class="ib-empty-title">Gagal memuat</div>' +
          '<div class="ib-empty-sub">' + esc(e.message) + '</div>' +
        '</div>';
    }
  }

  // Tab handlers
  document.querySelectorAll('.ib-tab').forEach(function(tab) {
    tab.onclick = function() {
      activeFilter = tab.dataset.filter;
      document.querySelectorAll('.ib-tab').forEach(function(x){ x.classList.remove('active'); });
      tab.classList.add('active');
      renderTickets();
    };
  });

  // Refresh saat tab aktif
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') loadTickets();
  });

  window.loadTickets = loadTickets;
  loadTickets();
})();
