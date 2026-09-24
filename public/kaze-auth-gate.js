/* ===== KAZE Auth Gate ===== */
(function(){
'use strict';

// Skip kalau di halaman login / public
if (location.pathname === '/login.html' || location.pathname === '/login') return;
var publicPaths = ['/maintenance.html', '/maintenance'];
for (var i = 0; i < publicPaths.length; i++) {
  if (location.pathname.indexOf(publicPaths[i]) === 0) return;
}

// Cek session via cookie
fetch('/api/auth/me', { credentials: 'same-origin' })
  .then(function(r){ return r.json(); })
  .then(function(j){
    if (j && j.ok && j.logged_in) {
      try {
        localStorage.setItem('javin_user_id', j.user.user_code);
        localStorage.setItem('javin_user_name', j.user.name || '');
        localStorage.setItem('javin_user_avatar', j.user.avatar || '');
      } catch(e){}
      return;
    }
    // Belum login → redirect
    location.replace('/login.html');
  })
  .catch(function(){ /* fail-open */ });
})();
