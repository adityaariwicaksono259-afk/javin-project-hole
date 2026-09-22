// ================================================
// MY ORDERS — VinAPIay
// ================================================
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var allOrders = [];
  var activeFilter = 'all';

  function rp(n) {
    return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
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

  function statusLabel(s) {
    var map = {
      waiting_payment: '⏳ Belum Bayar',
      pending_review: '🔍 Diverifikasi',
      approved: '✅ Berhasil',
      rejected: '❌ Ditolak',
      cancelled: '🚫 Dibatalkan'
    };
    return map[s] || s;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function renderOrders() {
    var list = $('orderList');
    var filtered = allOrders.filter(function(o) {
      return activeFilter === 'all' || o.status === activeFilter;
    });

    if (!filtered.length) {
      list.innerHTML =
        '<div class="mo-empty">' +
          '<div class="mo-empty-icon">📭</div>' +
          '<div class="mo-empty-title">Belum ada pesanan</div>' +
          '<div class="mo-empty-sub">' + (activeFilter === 'all' ? 'Kamu belum pernah beli key premium.' : 'Tidak ada pesanan dengan status ini.') + '</div>' +
          (activeFilter === 'all' ? '<a href="/buy">💎 Beli Key Sekarang</a>' : '') +
        '</div>';
      return;
    }

    list.innerHTML = filtered.map(function(o) {
      var statusClass = 'mo-status ' + (o.status || 'waiting_payment');
      var statusText = statusLabel(o.status);

      // Bikin key list kalau approved
      var keysHtml = '';
      if (o.status === 'approved' && o.key_generated) {
        var keys = String(o.key_generated).split(',').map(function(k){ return k.trim(); }).filter(Boolean);
        if (keys.length) {
          keysHtml = '<div class="mo-keys">' +
            '<div class="mo-keys-title">🔑 Key Kamu (' + keys.length + ')</div>' +
            keys.map(function(k){
              return '<div class="mo-key">' +
                '<code>' + esc(k) + '</code>' +
                '<button data-key="' + esc(k) + '">📋 Copy</button>' +
              '</div>';
            }).join('') +
          '</div>';
        }
      }

      // Note admin kalau rejected
      var noteHtml = '';
      if (o.status === 'rejected' && o.admin_note) {
        noteHtml = '<div class="mo-note">📝 Alasan: ' + esc(o.admin_note) + '</div>';
      }

      return '<div class="mo-card">' +
        '<div class="mo-header">' +
          '<div class="mo-code">' + esc(o.order_code) + '</div>' +
          '<div class="' + statusClass + '">' + statusText + '</div>' +
        '</div>' +
        '<div class="mo-row"><span>Paket</span><b>' + o.package_qty + ' Key</b></div>' +
        '<div class="mo-row"><span>Total</span><b class="mo-price">' + rp(o.package_price) + '</b></div>' +
        '<div class="mo-row"><span>Dibuat</span><b>' + fmtTime(o.created_at) + '</b></div>' +
        '<div class="mo-row"><span>Update</span><b>' + fmtTime(o.updated_at) + '</b></div>' +
        keysHtml +
        noteHtml +
      '</div>';
    }).join('');

    // Bind copy button
    list.querySelectorAll('[data-key]').forEach(function(btn) {
      btn.onclick = function() {
        var k = btn.dataset.key;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(k).then(function(){ 
            btn.textContent = '✅ Copied';
            setTimeout(function(){ btn.textContent = '📋 Copy'; }, 2000);
          });
        } else {
          showPrompt('', 'Copy key:', {icon: '✏️', value: k});
        }
      };
    });
  }

  async function loadOrders() {
    var list = $('orderList');
    list.innerHTML = '<div class="mo-load">⏳ Memuat pesanan...</div>';

    var uid = '';
    try { uid = localStorage.getItem('javin_user_id') || ''; } catch(e) {}

    if (!uid) {
      list.innerHTML =
        '<div class="mo-empty">' +
          '<div class="mo-empty-icon">🔒</div>' +
          '<div class="mo-empty-title">ID kamu belum ke-set</div>' +
          '<div class="mo-empty-sub">Buka halaman utama dulu biar ID kamu dibuat.</div>' +
          '<a href="/">← Ke Beranda</a>' +
        '</div>';
      return;
    }

    try {
      var r = await fetch('/api/buy/status?user_id=' + encodeURIComponent(uid) + '&_=' + Date.now(), {
        cache: 'no-store'
      });
      var j = await r.json();

      if (!j.ok) throw new Error(j.message || 'Gagal load pesanan');

      allOrders = j.orders || [];
      renderOrders();
    } catch(e) {
      list.innerHTML =
        '<div class="mo-empty">' +
          '<div class="mo-empty-icon">⚠️</div>' +
          '<div class="mo-empty-title">Gagal memuat</div>' +
          '<div class="mo-empty-sub">' + esc(e.message) + '</div>' +
        '</div>';
    }
  }

  // Tab handlers
  document.querySelectorAll('.mo-tab').forEach(function(t) {
    t.onclick = function() {
      activeFilter = t.dataset.filter;
      document.querySelectorAll('.mo-tab').forEach(function(x){ x.classList.remove('active'); });
      t.classList.add('active');
      renderOrders();
    };
  });

  // Auto-refresh tiap 30 detik (kalau ada order pending)
  setInterval(function() {
    var hasPending = allOrders.some(function(o){
      return o.status === 'pending_review' || o.status === 'waiting_payment';
    });
    if (hasPending && document.visibilityState === 'visible') {
      loadOrders();
    }
  }, 30000);

  // Refresh saat tab aktif
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') loadOrders();
  });

  loadOrders();
})();
