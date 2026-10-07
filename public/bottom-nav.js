// ============================================
// JAVIN LIQUID BOTTOM NAV
// SVG icons + liquid bubble animation
// ============================================

(function() {
  'use strict';

  var ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    inbox: '<svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    profil: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  };

  var NAV_ITEMS = [
    { id: 'home',     href: '/home',     icon: 'home',     label: 'Home' },
    { id: 'search',   href: '/search',   icon: 'search',   label: 'Search' },
    { id: 'settings', href: '/settings', icon: 'settings', label: 'Setting' },
    { id: 'inbox',    href: '/inbox',    icon: 'inbox',    label: 'Inbox' },
    { id: 'profil',   href: '/profil',   icon: 'profil',   label: 'Profil' }
  ];

  function detectActiveId() {
    var path = (location.pathname || '/').toLowerCase();
    if (path === '/' || path.indexOf('home') !== -1) return 'home';
    if (path.indexOf('search') !== -1) return 'search';
    if (path.indexOf('setting') !== -1) return 'settings';
    if (path.indexOf('inbox') !== -1 || path.indexOf('notif') !== -1) return 'inbox';
    if (path.indexOf('profil') !== -1) return 'profil';
    return 'home';
  }

  function buildNav() {
    var activeId = detectActiveId();

    var nav = document.createElement('nav');
    nav.className = 'jv-nav';
    nav.id = 'jvNav';

    // Bubble dengan SVG icon aktif
    var activeItem = NAV_ITEMS.filter(function(x){ return x.id === activeId; })[0] || NAV_ITEMS[0];
    var bubble = document.createElement('div');
    bubble.className = 'jv-nav-bubble';
    bubble.id = 'jvNavBubble';
    bubble.innerHTML = ICONS[activeItem.icon];
    nav.appendChild(bubble);

    // Items
    NAV_ITEMS.forEach(function(item) {
      var a = document.createElement('a');
      a.className = 'jv-nav-item' + (item.id === activeId ? ' active' : '');
      a.href = item.href;
      a.dataset.id = item.id;
      a.dataset.icon = item.icon;

      var icon = document.createElement('span');
      icon.className = 'jv-nav-icon';
      icon.innerHTML = ICONS[item.icon];

      var label = document.createElement('span');
      label.className = 'jv-nav-label';
      label.textContent = item.label;

      a.appendChild(icon);
      a.appendChild(label);
      nav.appendChild(a);
    });

    document.body.appendChild(nav);
    return { nav: nav, bubble: bubble, activeId: activeId };
  }

  function positionBubble(bubble, activeItem, animate) {
    if (!bubble || !activeItem) return;

    setTimeout(function() {
      var nav = bubble.parentElement;
      if (!nav) return;

      var navRect = nav.getBoundingClientRect();
      var itemRect = activeItem.getBoundingClientRect();
      var leftPos = (itemRect.left - navRect.left) + (itemRect.width / 2) - 27;

      if (animate) {
        bubble.classList.add('bounce');
        setTimeout(function() {
          bubble.classList.remove('bounce');
        }, 500);
      }

      bubble.style.left = leftPos + 'px';
    }, animate ? 30 : 80);
  }

  function init() {
    // Hapus nav existing
    var existing = document.getElementById('jvNav');
    if (existing) existing.remove();

    var built = buildNav();
    var bubble = built.bubble;
    var nav = built.nav;

    var activeItem = nav.querySelector('.jv-nav-item.active');
    positionBubble(bubble, activeItem, false);

    // Handle klik
    nav.querySelectorAll('.jv-nav-item').forEach(function(el) {
      el.addEventListener('click', function(e) {
        var id = el.dataset.id;
        if (id === built.activeId) return;

        e.preventDefault();

        // Update active
        nav.querySelectorAll('.jv-nav-item').forEach(function(x) {
          x.classList.remove('active');
        });
        el.classList.add('active');

        // Update bubble icon
        var iconKey = el.dataset.icon;
        if (ICONS[iconKey]) {
          bubble.innerHTML = ICONS[iconKey];
        }

        // Geser bubble + bounce
        positionBubble(bubble, el, true);

        // Navigate setelah animasi
        setTimeout(function() {
          location.href = el.href;
        }, 350);
      });
    });

    // Resize handler
    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        var active = nav.querySelector('.jv-nav-item.active');
        positionBubble(bubble, active, false);
      }, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
