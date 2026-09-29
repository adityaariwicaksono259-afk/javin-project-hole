// Notification bell — cek tiket yang udah dibalas admin
(function(){
  'use strict';

  var STORAGE_KEY = 'vinapiay_settings';
  var READ_KEY = 'javin_notif_last_read';
  var POLL_MS = 60000; // cek tiap 1 menit
  var tickets = [];
  var lastReadId = 0;

  function getUserId() {
    try { return localStorage.getItem('javin_user_id') || ''; } catch(e) { return ''; }
  }

  function getLastRead() {
    try { return parseInt(localStorage.getItem(READ_KEY) || '0', 10) || 0; } catch(e) { return 0; }
  }

  function setLastRead(id) {
    try { localStorage.setItem(READ_KEY, String(id)); } catch(e) {}
  }

  function hasUnread() {
    return tickets.some(function(t) {
      return t.status === 'resolved' && t.admin_reply && t.id > lastReadId;
    });
  }

  function updateBadge() {
    var badge = document.getElementById('notifBadge');
    if (!badge) return;
    badge.style.display = hasUnread() ? 'block' : 'none';
  }

  function esc(s) {
    return String(s || '').replace(/[&<>]/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function categoryClass(type) {
    if (type === 'bug') return 'bug';
    if (type === 'error') return 'error';
    if (type === 'saran') return 'saran';
    if (type === 'pembelian') return 'pembelian';
    return '';
  }

  function categoryLabel(type) {
    return { bug: '🐛 Bug', error: '⚠️ Error', saran: '💡 Saran', pembelian: '💰 Pembelian' }[type] || type;
  }

  function fmtDate(ts) {
    try {
      var d = new Date(ts);
      return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch(e) { return '-'; }
  }

  function renderModal() {
    var body = document.getElementById('nfBody');
    if (!body) return;

    // Filter cuma yang ada balasan admin
    var replied = tickets.filter(function(t) { return t.admin_reply && t.status === 'resolved'; });

    if (!replied.length) {
      body.innerHTML = '<div class="nf-empty">Belum ada balasan dari admin</div>';
      return;
    }

    var html = '';
    replied.forEach(function(t) {
      var unread = t.id > lastReadId;
      html += '<div class="nf-item ' + (unread ? 'unread' : '') + '">';
      html += '<div class="nf-item-head">';
      html += '<span class="nf-tag ' + categoryClass(t.type) + '">' + categoryLabel(t.type) + '</span>';
      html += '<span class="nf-id">#' + t.id + '</span>';
      html += '</div>';
      if (t.title) html += '<div class="nf-title">' + esc(t.title) + '</div>';
      html += '<div class="nf-msg">' + esc((t.message || '').slice(0, 200)) + '</div>';
      html += '<div class="nf-reply">';
      html += '<div class="nf-reply-label">✅ Balasan Admin</div>';
      html += esc(t.admin_reply);
      html += '</div>';
      html += '</div>';
    });
    body.innerHTML = html;
  }

  function ensureModal() {
    if (document.getElementById('nfOverlay')) return;
    var el = document.createElement('div');
    el.id = 'nfOverlay';
    el.className = 'nf-overlay';
    el.innerHTML = ''
      + '<div class="nf-modal" onclick="event.stopPropagation()">'
      + '  <div class="nf-head">'
      + '    <h3>🔔 Notifikasi</h3>'
      + '    <button class="nf-close" onclick="if(window.notif) window.notif.close()">✕</button>'
      + '  </div>'
      + '  <div class="nf-body" id="nfBody">'
      + '    <div class="nf-empty">Memuat...</div>'
      + '  </div>'
      + '</div>';
    el.onclick = function() { if (window.notif) window.notif.close(); };
    document.body.appendChild(el);
  }

  function loadTickets() {
    var uid = getUserId();
    if (!uid) return Promise.resolve([]);
    return fetch('/api/support/my-tickets?user_id=' + encodeURIComponent(uid) + '&_=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(j){
        tickets = (j && j.tickets) ? j.tickets : [];
        updateBadge();
        return tickets;
      })
      .catch(function(){ return []; });
  }

  function open() {
    ensureModal();
    renderModal();
    var ov = document.getElementById('nfOverlay');
    if (ov) ov.classList.add('show');
    // Tandai semua tiket resolved sebagai udah dibaca
    var maxId = 0;
    tickets.forEach(function(t) {
      if (t.status === 'resolved' && t.admin_reply && t.id > maxId) maxId = t.id;
    });
    if (maxId > 0) {
      lastReadId = maxId;
      setLastRead(maxId);
      // Update badge setelah 1 detik (biar user liat animasi)
      setTimeout(function() {
        updateBadge();
        // Re-render tanpa highlight
        renderModal();
      }, 800);
    }
  }

  function close() {
    var ov = document.getElementById('nfOverlay');
    if (ov) ov.classList.remove('show');
  }

  function init() {
    lastReadId = getLastRead();
    ensureModal();
    // Load awal
    loadTickets();
    // Poll tiap menit
    setInterval(loadTickets, POLL_MS);
    // Re-check saat tab aktif lagi
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') loadTickets();
    });
  }

  window.notif = {
    open: open,
    close: close,
    refresh: loadTickets,
    getTickets: function() { return tickets; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
