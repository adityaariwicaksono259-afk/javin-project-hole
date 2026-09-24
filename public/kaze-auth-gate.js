/* ===== KAZE Auth Gate v2 — cookie + localStorage fallback ===== */
(function(){
'use strict';

if (location.pathname === '/login.html' || location.pathname === '/login') return;
var publicPaths = ['/maintenance.html', '/maintenance'];
for (var i = 0; i < publicPaths.length; i++) {
  if (location.pathname.indexOf(publicPaths[i]) === 0) return;
}

function tryRestoreFromLocal(){
  var token = '';
  try { token = localStorage.getItem('javin_session_token') || ''; } catch(e){}
  if (!token) return Promise.resolve(false);

  return fetch('/api/auth/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ session_token: token })
  })
    .then(function(r){ return r.json(); })
    .then(function(j){
      if (j && j.ok) {
        try {
          localStorage.setItem('javin_user_id', j.user.user_code);
          localStorage.setItem('javin_user_name', j.user.name || '');
          localStorage.setItem('javin_user_avatar', j.user.avatar || '');
        } catch(e){}
        return true;
      }
      // Token invalid/expired → bersihin
      try { localStorage.removeItem('javin_session_token'); } catch(e){}
      return false;
    })
    .catch(function(){ return false; });
}

// Step 1: cek cookie session
fetch('/api/auth/me', { credentials: 'same-origin' })
  .then(function(r){ return r.json(); })
  .then(function(j){
    if (j && j.ok && j.logged_in) {
      try {
        localStorage.setItem('javin_user_id', j.user.user_code);
        localStorage.setItem('javin_user_name', j.user.name || '');
        localStorage.setItem('javin_user_avatar', j.user.avatar || '');
      } catch(e){}
      return; // sudah login, biarkan
    }
    // Step 2: cookie gak ada → coba restore dari localStorage
    return tryRestoreFromLocal().then(function(ok){
      if (!ok) location.replace('/login.html');
    });
  })
  .catch(function(){
    // Kalau /api/auth/me error (offline dll) → coba restore
    tryRestoreFromLocal().then(function(ok){
      if (!ok) location.replace('/login.html');
    });
  });
})();
