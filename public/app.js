
// === Custom username + Profile card ===
(function(){
  function updateHeaderName(){
    var el = document.getElementById('headerName');
    var av = document.getElementById('profileAvatar');
    if (!el) return;
    var saved = null;
    try { saved = localStorage.getItem('javin_display_name'); } catch(e){}
    var name = (saved && saved.trim()) ? saved.trim() : 'Javin';
    el.textContent = name;
    if (av) av.textContent = name.charAt(0).toUpperCase();
  }

  function openProfileEditor(){
    var modal = document.getElementById('editNameModal');
    var input = document.getElementById('enmInput');
    var counter = document.getElementById('enmCount');
    var counterBox = counter ? counter.parentElement : null;

    if (!modal || !input) {
      // Fallback ke prompt kalau modal nggak ada
      var current = localStorage.getItem('javin_display_name') || 'Javin';
      var newName = prompt('Ubah nama tampilan:', current);
      if (newName !== null && newName.trim()) {
        localStorage.setItem('javin_display_name', newName.trim().slice(0, 20));
        updateHeaderName();
      }
      return;
    }

    var current = localStorage.getItem('javin_display_name') || 'Javin';
    input.value = current;
    counter.textContent = current.length;
    if (counterBox) counterBox.classList.toggle('warn', current.length > 18);

    modal.style.display = 'flex';
    setTimeout(function(){ input.focus(); input.select(); }, 150);

    // Counter update
    input.oninput = function(){
      counter.textContent = input.value.length;
      if (counterBox) counterBox.classList.toggle('warn', input.value.length > 18);
    };

    // Save
    var saveBtn = document.getElementById('enmSave');
    saveBtn.onclick = function(){
      var val = input.value.trim().slice(0, 20);
      if (!val) {
        try { localStorage.removeItem('javin_display_name'); } catch(e){}
      } else {
        try { localStorage.setItem('javin_display_name', val); } catch(e){}
      }
      updateHeaderName();
      modal.style.display = 'none';
      input.oninput = null;
    };

    // Cancel
    var cancelBtn = document.getElementById('enmCancel');
    cancelBtn.onclick = function(){
      modal.style.display = 'none';
      input.oninput = null;
    };

    // Enter = save
    input.onkeydown = function(e){
      if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
      if (e.key === 'Escape') { cancelBtn.click(); }
    };

    // Click overlay = close
    modal.onclick = function(e){
      if (e.target === modal) cancelBtn.click();
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    updateHeaderName();
    // Click di SELURUH area profile card
    var card = document.getElementById('profileCard');
    if (card) {
      card.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        openProfileEditor();
      };
    }
  });

  // Update juga setelah identify selesai
  setTimeout(updateHeaderName, 1500);
  setTimeout(updateHeaderName, 3000);
})();

// === LOAD SETTINGS (theme, scale, dll) ===
(function(){
  function applySettings() {
    try {
      var raw = localStorage.getItem('vinapiay_settings');
      var s = raw ? JSON.parse(raw) : { theme: 'light', uiIos: true, anim3d: true, scale: '1' };
      var body = document.body;
      
      // Theme
      var theme = s.theme || 'light';
      var eff = theme;
      if (theme === 'auto') {
        eff = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      body.classList.toggle('theme-dark', eff === 'dark');
      body.classList.toggle('theme-light', eff === 'light');
      
      // UI iOS
      body.classList.toggle('ui-ios', s.uiIos !== false);
      
      // Anim 3D
      body.classList.toggle('anim-3d', s.anim3d !== false);
      
      // Scale
      body.classList.remove('scale-12', 'scale-14');
      if (s.scale === '1.2') body.classList.add('scale-12');
      if (s.scale === '1.4') body.classList.add('scale-14');
      
      console.log('[Theme] Applied:', theme, '→', eff);
    } catch(e) {
      console.error('[Theme] Error:', e.message);
    }
  }
  
  // Apply immediately (biar nggak flicker)
  if (document.body) applySettings();
  else document.addEventListener('DOMContentLoaded', applySettings);
  
  // Apply saat balik dari settings page
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') applySettings();
  });
  window.addEventListener('focus', applySettings);
})();

// === Auto-hide splash screen ===
(function(){
  function hideSplash(){
    var s = document.getElementById('splashScreen');
    if (s && !s.classList.contains('hide')) {
      s.classList.add('hide');
      setTimeout(function(){ s.style.display = 'none'; }, 700);
    }
  }
  // Hide setelah 1.5 detik (maks 2.5 detik)
  setTimeout(hideSplash, 1500);
  window.addEventListener('load', function(){ setTimeout(hideSplash, 800); });
  setTimeout(hideSplash, 2500);
})();

function maskHost(u){return String(u||"").replace(/https?:\/\/[^\/\s"']*/gi,"")||"/";}
function maskUrl(t){return String(t||'').replace(/https?:\/\/[^"\s,}\)\]]+/gi,function(u){try{return '\u2026'+new URL(u).pathname}catch(e){return u}}).replace(/(api\.|apii\.)?nexadev\.my\.id/gi,'javin').replace(/api\.nexaadev\.my\.id/gi,'javin').replace(/clooud\.my\.id/gi,'javin');}
let endpoints=[],active='ALL';
const order=['AI','Tools','Downloader','Anime','Canvas','Random','Search','SMM','Berita','Info','Islami','Uploader','Other'];
const $=s=>document.querySelector(s);
fetch('/endpoints.json').then(function(r){ return r.json(); }).then(function(data){
  endpoints = data;
  var cats = Array.from(new Set(data.map(function(x){ return x.folder; })));
  renderCats(cats);
  render();
  // Bind search input
  setTimeout(function(){
    var si = document.getElementById('search');
    if (si && !si.__bound) {
      si.__bound = true;
      si.addEventListener('input', render);
      si.addEventListener('keyup', render);
      console.log('[Search] bound');
    }
  }, 300);
});
function renderCats(cats){
  var sorted = cats.sort((a,b) => {
    var ai = order.indexOf(a) < 0 ? 99 : order.indexOf(a);
    var bi = order.indexOf(b) < 0 ? 99 : order.indexOf(b);
    return ai - bi;
  });
  var el = document.getElementById('categories');
  if (!el) return;
  el.innerHTML = '<button class="fx-cat active" data-c="ALL">Semua <small>' + endpoints.length + '</small></button>' +
    sorted.map(function(c){ return '<button class="fx-cat" data-c="' + esc(c) + '">' + esc(c) + ' <small>' + endpoints.filter(function(x){ return x.folder === c; }).length + '</small></button>'; }).join('');
  document.querySelectorAll('.fx-cat').forEach(function(b){
    b.onclick = function(){
      active = b.dataset.c;
      document.querySelectorAll('.fx-cat').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      render();
    };
  });
}

function render(){
  try {
    var searchEl = document.getElementById('search');
    var q = (searchEl && searchEl.value ? searchEl.value : '').trim().toLowerCase();
    var qClean = q.replace(/[\s_-]+/g, '');
    var grid = document.getElementById('grid');
    if (!grid) return;

    // Kalau ada query → search GLOBAL (nggak peduli kategori)
    // Kalau nggak ada query → tampil by kategori
    var pool = endpoints;
    if (!q) {
      pool = endpoints.filter(function(x){
        return active === 'ALL' || x.folder === active;
      });
      if (!pool.length) {
        grid.innerHTML = '<div class="fx-empty"><div class="fx-empty-icon">🔍</div>Tidak ada tool</div>';
        return;
      }
      grid.innerHTML = pool.map(card).join('');
      document.querySelectorAll('.fx-card').forEach(function(el){
        el.onclick = function(){ openEp(el.dataset.id); };
      });
      return;
    }

    // ==== FUZZY SEARCH ====
    var scored = [];
    pool.forEach(function(x){
      var name = (x.name || '').toLowerCase();
      var nameClean = name.replace(/[\s_-]+/g, '');
      var sub = (x.subfolder || '').toLowerCase();
      var subClean = sub.replace(/[\s_-]+/g, '');
      var folder = (x.folder || '').toLowerCase();
      var desc = (x.desc || '').toLowerCase();
      var path = (x.path || '').toLowerCase();

      var score = 0;

      if (nameClean === qClean) score += 1000;
      else if (nameClean.indexOf(qClean) === 0) score += 800;
      else if (nameClean.indexOf(qClean) !== -1) score += 600;

      if (subClean === qClean) score += 500;
      else if (subClean.indexOf(qClean) !== -1) score += 300;

      if (folder.indexOf(qClean) !== -1) score += 150;
      if (desc.indexOf(q) !== -1) score += 50;
      if (path.indexOf(q) !== -1) score += 30;

      if (score > 0) {
        score += Math.max(0, 50 - nameClean.length);
        scored.push({ ep: x, score: score });
      }
    });

    scored.sort(function(a, b){ return b.score - a.score; });

    if (!scored.length) {
      grid.innerHTML = '<div class="fx-empty"><div class="fx-empty-icon">🔍</div>Tidak ada hasil untuk "' + q + '"</div>';
      return;
    }

    grid.innerHTML = scored.map(function(s){ return card(s.ep); }).join('');
    document.querySelectorAll('.fx-card').forEach(function(el){
      el.onclick = function(){ openEp(el.dataset.id); };
    });
  } catch (err) {
    console.error('[render] error:', err);
    var grid2 = document.getElementById('grid');
    if (grid2) grid2.innerHTML = '<div class="fx-empty">⚠️ Error: ' + (err.message || 'unknown') + '</div>';
  }
}

function card(x){
  var badge = x.subfolder || x.folder;
  return '<div class="fx-card" data-id="' + esc(x.catalogId) + '">' +
    '<div class="fx-card-body">' +
      '<div class="fx-card-title">' +
        '<h3>' + esc(x.name) + '</h3>' +
        '<span class="fx-badge">' + esc(badge) + '</span>' +
      '</div>' +
      '<div class="fx-card-desc">' + esc(x.desc || 'Tap untuk pakai tool ini') + '</div>' +
    '</div>' +
    '<div class="fx-card-arrow">›</div>' +
  '</div>';
}

function openEp(id){
  var x = endpoints.find(function(e){ return e.catalogId === id; });
  if (!x) return;
  if (x.redirect) { window.location.href = x.redirect; return; }
  window.location.href = '/tool?id=' + encodeURIComponent(id);
}

function openEp(id){
  var x = endpoints.find(e => e.catalogId === id);
  if (!x) return;
  if (x.redirect) { window.location.href = x.redirect; return; }
  window.location.href = '/tool?id=' + encodeURIComponent(id);
}

async function execute(x){
  var result=$('#result');
  result.innerHTML='<div class="result">MENGHUBUNGI SERVER...</div>';
  var qs=[];
  document.querySelectorAll('[data-p]').forEach(function(i){if(i.value)qs.push(encodeURIComponent(i.dataset.p)+'='+encodeURIComponent(i.value));});
  var uid='';try{uid=localStorage.getItem('javin_user_id')||''}catch(e){}
  var url='/api/proxy?id='+encodeURIComponent(x.catalogId)+(uid?'&uid='+encodeURIComponent(uid):'')+(qs.length?'&'+qs.join('&'):'');
  try{
    var r=await fetch(url);
    var type=r.headers.get('content-type')||'';
    var ext=(type.split('/')[1]||'bin').split(';')[0].trim();
    var fname='javin-'+x.catalogId+'-'+Date.now()+'.'+ext;
    if(!r.ok){
      var t=await r.text();
      result.innerHTML='<pre class="result">HTTP '+r.status+'\n'+esc(maskUrl(t))+'</pre>';
      return;
    }
    if(type.indexOf('image/')!==-1){
      var blob=await r.blob();
      var src=URL.createObjectURL(blob);
      result.innerHTML='<div class="result"><img class="media" src="'+src+'"><div class="media-actions"><a class="btn-dl" href="'+src+'" download="'+fname+'">\u2b07 Download Gambar</a></div><div class="media-info">by Javin \u00b7 HTTP '+r.status+' \u00b7 '+esc(type.split(';')[0])+'</div></div>';
    } else if(type.indexOf('video/')!==-1){
      var blob=await r.blob();
      var src=URL.createObjectURL(blob);
      result.innerHTML='<div class="result"><video class="media" controls src="'+src+'"></video><div class="media-actions"><a class="btn-dl" href="'+src+'" download="'+fname+'">\u2b07 Download Video</a></div><div class="media-info">by Javin \u00b7 HTTP '+r.status+'</div></div>';
    } else if(type.indexOf('audio/')!==-1){
      var blob=await r.blob();
      var src=URL.createObjectURL(blob);
      result.innerHTML='<div class="result"><audio controls style="width:100%" src="'+src+'"></audio><div class="media-actions"><a class="btn-dl" href="'+src+'" download="'+fname+'">\u2b07 Download Audio</a></div><div class="media-info">by Javin \u00b7 HTTP '+r.status+'</div></div>';
    } else {
      var t=await r.text();
      var pretty;try{pretty=JSON.stringify(JSON.parse(t),null,2)}catch(e){pretty=t}
      result.innerHTML='<pre class="result">HTTP '+r.status+'\n'+esc(maskUrl(pretty))+'</pre>';
    }
  }
  catch(e){result.innerHTML='<pre class="result">ERROR\n'+esc(e.message)+'</pre>'}
  finally{if(window.refreshUserStatus)setTimeout(window.refreshUserStatus,500)}
}
$('#close').onclick=()=>$('#modal').classList.add('hidden');$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modal').classList.add('hidden')};
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

// === USER ID — MULTI-LAYER PERSISTENCE ===
(function(){
  var KEY_LOCAL = 'javin_user_id';
  var KEY_COOKIE = 'javin_uid';
  var KEY_IDB = 'javin_user_db';
  var KEY_FP = 'javin_fp_cache';

  // ============ Helper: Cookie (expiry 10 tahun) ============
  function setCookie(name, value, days) {
    try {
      var d = new Date();
      d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
      document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
    } catch(e) {}
  }

  function getCookie(name) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|;\s*)' + name + '=([^;]+)'));
      return m ? decodeURIComponent(m[1]) : null;
    } catch(e) { return null; }
  }

  // ============ Helper: IndexedDB ============
  function idbSet(key, value) {
    return new Promise(function(resolve){
      try {
        if (!window.indexedDB) return resolve(false);
        var req = indexedDB.open(KEY_IDB, 1);
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data');
          }
        };
        req.onsuccess = function(e) {
          var db = e.target.result;
          try {
            var tx = db.transaction('data', 'readwrite');
            tx.objectStore('data').put(value, key);
            tx.oncomplete = function(){ resolve(true); };
            tx.onerror = function(){ resolve(false); };
          } catch(err) { resolve(false); }
        };
        req.onerror = function(){ resolve(false); };
      } catch(e) { resolve(false); }
    });
  }

  function idbGet(key) {
    return new Promise(function(resolve){
      try {
        if (!window.indexedDB) return resolve(null);
        var req = indexedDB.open(KEY_IDB, 1);
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data');
          }
        };
        req.onsuccess = function(e) {
          var db = e.target.result;
          try {
            var tx = db.transaction('data', 'readonly');
            var getReq = tx.objectStore('data').get(key);
            getReq.onsuccess = function(){ resolve(getReq.result || null); };
            getReq.onerror = function(){ resolve(null); };
          } catch(err) { resolve(null); }
        };
        req.onerror = function(){ resolve(null); };
      } catch(e) { resolve(null); }
    });
  }

  // ============ Save ID ke semua layer ============
  function saveIdToAll(uid) {
    if (!uid) return;
    try { localStorage.setItem(KEY_LOCAL, uid); } catch(e) {}
    setCookie(KEY_COOKIE, uid, 3650);
    idbSet('user_id', uid);
    console.log('[UserID] Saved:', uid, 'to localStorage + cookie + IndexedDB');
  }

  // ============ Load ID dari layer manapun ============
  async function loadIdFromAny() {
    // 1. Coba localStorage
    try {
      var l = localStorage.getItem(KEY_LOCAL);
      if (l && /^JH-[A-Z0-9]{6}$/.test(l)) {
        console.log('[UserID] Found in localStorage');
        return l;
      }
    } catch(e) {}

    // 2. Coba cookie
    var c = getCookie(KEY_COOKIE);
    if (c && /^JH-[A-Z0-9]{6}$/.test(c)) {
      console.log('[UserID] Found in cookie');
      // Restore ke localStorage
      try { localStorage.setItem(KEY_LOCAL, c); } catch(e) {}
      return c;
    }

    // 3. Coba IndexedDB
    var idb = await idbGet('user_id');
    if (idb && /^JH-[A-Z0-9]{6}$/.test(idb)) {
      console.log('[UserID] Found in IndexedDB');
      try { localStorage.setItem(KEY_LOCAL, idb); } catch(e) {}
      setCookie(KEY_COOKIE, idb, 3650);
      return idb;
    }

    console.log('[UserID] No ID found in any layer');
    return null;
  }

  // ============ Fingerprint Generator (STABIL) ============
  async function generateFingerprint() {
    var parts = [];
    var components = {};

    // UA + Platform
    var ua = navigator.userAgent || '';
    var platform = navigator.platform || '';
    var lang = navigator.language || '';
    parts.push('ua=' + ua);
    parts.push('pl=' + platform);
    parts.push('lang=' + lang);
    components.ua = ua;
    components.platform = platform;
    components.lang = lang;

    // Screen
    var screenStr = screen.width + 'x' + screen.height;
    var dpr = window.devicePixelRatio || 1;
    parts.push('scr=' + screenStr);
    parts.push('dep=' + screen.colorDepth);
    parts.push('dpr=' + dpr);
    components.screen = screenStr;
    components.dpr = String(dpr);

    // Hardware
    var cores = navigator.hardwareConcurrency || 0;
    var mem = navigator.deviceMemory || 0;
    var touch = navigator.maxTouchPoints || 0;
    parts.push('cores=' + cores);
    parts.push('mem=' + mem);
    parts.push('touch=' + touch);
    components.cores = String(cores);
    components.mem = String(mem);
    components.touch = String(touch);

    // Timezone
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e) {}
    parts.push('tz=' + tz);
    components.tz = tz;

    // WebGL
    var gpu = '';
    try {
      var gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
        }
      }
    } catch(e) {}
    parts.push('gpu=' + gpu);
    components.gpu = gpu;

    // Hash
    var raw = parts.join('||');
    var buf = new TextEncoder().encode(raw);
    var hashBuf = await crypto.subtle.digest('SHA-256', buf);
    var arr = Array.from(new Uint8Array(hashBuf));
    var hash = arr.map(function(b){ return b.toString(16).padStart(2, '0'); }).join('');

    return { hash: hash, components: components };
  }

  // ============ Ensure ID ============
  async function ensureUserId() {
    // 1. Coba load dari layer manapun
    var existing = await loadIdFromAny();
    if (existing) {
      saveIdToAll(existing); // re-save ke semua layer
      return existing;
    }

    // 2. Generate baru (dari fingerprint atau random)
    var newId = null;
    try {
      var fpResult = await generateFingerprint();
      var fp = fpResult.hash;
      var components = fpResult.components;
      try { localStorage.setItem(KEY_FP, fp); } catch(e) {}

      var r = await fetch('/api/user/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fp: fp, components: components })
      });
      var j = await r.json();
      if (j.ok && j.uid) {
        newId = j.uid;
      }
    } catch(e) {
      console.warn('[UserID] Identify failed:', e.message);
    }

    // 3. Fallback: random ID
    if (!newId) {
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      var rand = '';
      for (var i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
      newId = 'JH-' + rand;
    }

    saveIdToAll(newId);
    return newId;
  }

  // Expose
  window.ensureUserId = ensureUserId;

  // Init: ensure + render
  ensureUserId().then(function(uid) {
    var el = document.getElementById('userId');
    if (el) el.textContent = uid;
    if (window.refreshUserStatus) setTimeout(window.refreshUserStatus, 300);
  });

  // Visibility change: re-check ID
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') {
      ensureUserId().then(function(uid){
        var el = document.getElementById('userId');
        if (el) el.textContent = uid;
      });
    }
  });
})();

// === ADMIN PANEL ===
(function(){
  var panel=document.getElementById('adminPanel');
  var launch=document.getElementById('adminLaunch');
  var closeBtn=document.getElementById('adminToggle');
  if(!panel||!launch)return;

  var loggedIn=false;

  function openPanel(){
    panel.classList.add('open');
    // Auto scroll ke panel biar langsung keliatan
    setTimeout(function(){
      panel.scrollIntoView({behavior:'smooth',block:'start'});
    }, 80);
  }
  function closePanel(){panel.classList.remove('open')}

  function getUserId(){
    try{return localStorage.getItem('javin_user_id')||'JH-ANON'}catch(e){return 'JH-ANON'}
  }

  function fmtTime(ts){
    if(!ts)return '-';
    var d=new Date(Number(ts));
    if(isNaN(d.getTime()))return '-';
    return d.toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }

  function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  async function checkSession(){
    try{
      var r=await fetch('/api/admin/check');
      if(!r.ok)return false;
      var j=await r.json();
      return j&&j.ok;
    }catch(e){return false}
  }

  async function doLogin(){
    var u=prompt('Username admin:');
    if(u===null)return false;
    var p=prompt('Password admin:');
    if(p===null)return false;
    try{
      var r=await fetch('/api/admin/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username:u,password:p})
      });
      var j=await r.json();
      if(j.ok){loggedIn=true;return true}
      alert(j.message||'Login gagal.');
      return false;
    }catch(e){alert('Error: '+e.message);return false}
  }

  // ==== Tabs ====
  var tabs=panel.querySelectorAll('.admin-tab');
  var panes=panel.querySelectorAll('.admin-pane');
  tabs.forEach(function(t){
    t.onclick=function(){
      tabs.forEach(function(x){x.classList.remove('active')});
      panes.forEach(function(x){x.classList.remove('active')});
      t.classList.add('active');
      var name=t.dataset.tab;
      var p=panel.querySelector('.admin-pane[data-pane="'+name+'"]');
      if(p)p.classList.add('active');
      if(name==='users')loadUsers();
      if(name==='logs')loadLogs();
      if(name==='config')loadConfig();
    };
  });

  // ==== USERS ====
  async function loadUsers(){
    var tb=document.getElementById('userTbody');
    if(!tb)return;
    tb.innerHTML='<tr><td colspan="6" class="tbl-empty">Loading...</td></tr>';
    try{
      var r=await fetch('/api/admin/users');
      if(r.status===401){loggedIn=false;alert('Session expired. Login ulang.');closePanel();return}
      var j=await r.json();
      if(!j.ok){tb.innerHTML='<tr><td colspan="6" class="tbl-empty">'+escHtml(j.message||'Gagal')+'</td></tr>';return}
      var filter=(document.getElementById('userSearch').value||'').toLowerCase();
      var list=(j.users||[]).filter(function(u){return !filter||u.id.toLowerCase().indexOf(filter)!==-1});
      if(!list.length){tb.innerHTML='<tr><td colspan="6" class="tbl-empty">Belum ada user.</td></tr>';return}
      tb.innerHTML=list.map(function(u){
        return '<tr>'
          +'<td><code>'+escHtml(u.id)+'</code></td>'
          +'<td>'+u.extra_limit+'</td>'
          +'<td>'+u.today+'</td>'
          +'<td>'+u.total_request+'</td>'
          +'<td>'+fmtTime(u.last_seen)+'</td>'
          +'<td><button class="tbl-btn" data-edit="'+escHtml(u.id)+'" data-lim="'+u.extra_limit+'">Edit</button> '
          +'<button class="tbl-btn danger" data-del="'+escHtml(u.id)+'">Hapus</button></td>'
          +'</tr>';
      }).join('');
      tb.querySelectorAll('[data-edit]').forEach(function(b){
        b.onclick=function(){
          document.getElementById('adminUserId').value=b.dataset.edit;
          document.getElementById('adminExtraLimit').value=b.dataset.lim;
          document.getElementById('adminExtraLimit').focus();
        };
      });
      tb.querySelectorAll('[data-del]').forEach(function(b){
        b.onclick=async function(){
          if(!confirm('Hapus user '+b.dataset.del+'? Log-nya ikut terhapus.'))return;
          var rr=await fetch('/api/admin/users?id='+encodeURIComponent(b.dataset.del),{method:'DELETE'});
          var jj=await rr.json();
          alert(jj.message||'OK');
          loadUsers();
        };
      });
    }catch(e){tb.innerHTML='<tr><td colspan="6" class="tbl-empty">Error: '+escHtml(e.message)+'</td></tr>'}
  }

  document.getElementById('adminAddLimit').onclick=async function(){
    if(!loggedIn){alert('Login dulu.');return}
    var uid=document.getElementById('adminUserId').value.trim();
    var extra=parseInt(document.getElementById('adminExtraLimit').value||'0');
    if(!uid){alert('User ID wajib.');return}
    if(isNaN(extra)||extra<1||extra>15){alert('Limit harus 1-15.');return}
    var r=await fetch('/api/admin/users',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:uid,extra_limit:extra})
    });
    var j=await r.json();
    alert(j.message||'OK');
    if(j.ok)loadUsers();
  };
  document.getElementById('userReload').onclick=loadUsers;
  document.getElementById('userSearch').oninput=loadUsers;

  // ==== LOGS ====
  async function loadLogs(){
    var tb=document.getElementById('logTbody');
    if(!tb)return;
    tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Loading...</td></tr>';
    try{
      var uid=(document.getElementById('logFilterUid').value||'').trim();
      var url='/api/admin/logs?limit=200'+(uid?'&uid='+encodeURIComponent(uid):'');
      var r=await fetch(url);
      if(r.status===401){loggedIn=false;alert('Session expired.');closePanel();return}
      var j=await r.json();
      if(!j.ok){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">'+escHtml(j.message||'Gagal')+'</td></tr>';return}
      var list=j.logs||[];
      if(!list.length){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Belum ada log.</td></tr>';return}
      tb.innerHTML=list.map(function(l){
        var color=l.status>=200&&l.status<300?'#4ade80':(l.status>=400?'#f87171':'#fbbf24');
        return '<tr>'
          +'<td>'+fmtTime(l.created_at)+'</td>'
          +'<td><code>'+escHtml(l.user_id||'-')+'</code></td>'
          +'<td>'+escHtml(l.endpoint_id)+'</td>'
          +'<td style="color:'+color+'">'+l.status+'</td>'
          +'</tr>';
      }).join('');
    }catch(e){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Error: '+escHtml(e.message)+'</td></tr>'}
  }
  document.getElementById('logReload').onclick=loadLogs;
  document.getElementById('logFilterUid').oninput=loadLogs;
  document.getElementById('logClear').onclick=async function(){
    if(!loggedIn){alert('Login dulu.');return}
    if(!confirm('Hapus SEMUA log?'))return;
    var r=await fetch('/api/admin/logs',{method:'DELETE'});
    var j=await r.json();
    alert(j.message||'OK');
    loadLogs();
  };

  // ==== CONFIG ====
  async function loadConfig(){
    var tb=document.getElementById('configTbody');
    if(!tb)return;
    tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Loading...</td></tr>';
    try{
      var r=await fetch('/api/admin/config');
      if(r.status===401){loggedIn=false;alert('Session expired.');closePanel();return}
      var j=await r.json();
      if(!j.ok){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">'+escHtml(j.message||'Gagal')+'</td></tr>';return}
      var list=j.config||[];
      if(!list.length){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Belum ada config.</td></tr>';return}
      tb.innerHTML=list.map(function(c){
        return '<tr>'
          +'<td><code>'+escHtml(c.key)+'</code></td>'
          +'<td>'+escHtml(c.value)+'</td>'
          +'<td>'+fmtTime(c.updated_at)+'</td>'
          +'<td><button class="tbl-btn" data-k="'+escHtml(c.key)+'" data-v="'+escHtml(c.value)+'">Edit</button></td>'
          +'</tr>';
      }).join('');
      tb.querySelectorAll('[data-k]').forEach(function(b){
        b.onclick=function(){
          document.getElementById('configKey').value=b.dataset.k;
          document.getElementById('configValue').value=b.dataset.v;
        };
      });
    }catch(e){tb.innerHTML='<tr><td colspan="4" class="tbl-empty">Error: '+escHtml(e.message)+'</td></tr>'}
  }
  document.getElementById('configReload').onclick=loadConfig;
  document.getElementById('configSave').onclick=async function(){
    if(!loggedIn){alert('Login dulu.');return}
    var key=document.getElementById('configKey').value.trim();
    var value=document.getElementById('configValue').value;
    if(!key){alert('Key wajib.');return}
    var r=await fetch('/api/admin/config',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({key:key,value:value})
    });
    var j=await r.json();
    alert(j.message||'OK');
    if(j.ok)loadConfig();
  };

  // ==== Open panel ====
  // ==== Auto-rotate session tiap 10 menit ====
  var __rotateTimer = null;
  async function autoRotate(){
    if (!loggedIn) return;
    try {
      var r = await fetch('/api/admin/rotate', { method: 'POST' });
      if (!r.ok) {
        console.warn('[ROTATE] Failed, HTTP', r.status);
        if (r.status === 401) {
          loggedIn = false;
          closePanel();
          alert('Session expired. Login ulang.');
        }
      }
    } catch(e) {
      console.warn('[ROTATE] Error:', e.message);
    }
  }
  function startRotateTimer(){
    if (__rotateTimer) clearInterval(__rotateTimer);
    __rotateTimer = setInterval(autoRotate, 10 * 60 * 1000); // 10 menit
  }
  function stopRotateTimer(){
    if (__rotateTimer) { clearInterval(__rotateTimer); __rotateTimer = null; }
  }

    // Admin login di-handle sama admin-2fa.js
  window.__adminReloadPanel = function(){
    loggedIn = true;
    openPanel();
    loadUsers();
  };

  launch.onclick = function(e){
    e.preventDefault();
  };
  // Auto-open panel kalau abis login (sessionStorage flag)
  function __checkAdminFlag(){
    try {
      var flag = sessionStorage.getItem('admin_just_logged_in');
      if (flag !== '1') return;
      sessionStorage.removeItem('admin_just_logged_in');

      // Verify session dulu
      fetch('/api/admin/check', { credentials: 'same-origin' })
        .then(function(r){ return r.json(); })
        .then(function(j){
          if (j && j.ok) {
            loggedIn = true;
            openPanel();
            loadUsers();
            startRotateTimer();
            console.log('[ADMIN] Panel auto-opened via sessionStorage flag');
          } else {
            console.warn('[ADMIN] Session invalid, nggak buka panel');
          }
        })
        .catch(function(e){
          console.error('[ADMIN] Check error:', e);
        });
    } catch(e) {
      console.error('[ADMIN] Flag check error:', e);
    }
  }
  setTimeout(__checkAdminFlag, 800);

  if(closeBtn)closeBtn.onclick=function(){ stopRotateTimer(); closePanel(); };
})();


// === USER LIMIT BADGE ===
(function(){
  var lastFetch = 0;
  var MIN_GAP = 300;

  async function refreshUserStatus(force){
    var now = Date.now();
    if(!force && now - lastFetch < MIN_GAP) return;
    lastFetch = now;

    var uid = (typeof localStorage !== 'undefined') ? localStorage.getItem('javin_user_id') : null;
    if(!uid) return;
    var el = document.getElementById('userLimit');
    if(!el) return;
    try{
      var r = await fetch('/api/user/me?uid=' + encodeURIComponent(uid) + '&t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      var j = await r.json();
      if(!j.ok) return;
      var remain = Number(j.remaining) || 0;
      var limit = Number(j.limit) || 0;
      el.textContent = remain + '/' + limit;
      var pct = limit > 0 ? (remain / limit) : 0;
      if(remain <= 0) el.style.color = '#f87171';
      else if(pct > 0.5) el.style.color = '#4ade80';
      else if(pct > 0.2) el.style.color = '#fbbf24';
      else el.style.color = '#f87171';
    }catch(e){}
  }

  window.refreshUserStatus = refreshUserStatus;

  // Refresh pertama setelah load
  setTimeout(function(){ refreshUserStatus(true); }, 400);

  // Polling tiap 8 detik (biar sinkron kalau di tab lain ada request)
  setInterval(function(){ refreshUserStatus(true); }, 8000);

  // Refresh saat tab kembali aktif (user balik dari tab lain)
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible') refreshUserStatus(true);
  });

  // Refresh saat window fokus lagi
  window.addEventListener('focus', function(){ refreshUserStatus(true); });
// ==== PREMIUM KEYS ====
  async function loadKeys(){
    var tb = document.getElementById('keysTbody');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="6" class="tbl-empty">Loading...</td></tr>';
    try {
      var r = await fetch('/api/admin/premium-keys?_=' + Date.now(), { cache: 'no-store' });
      if (r.status === 401) {
        tb.innerHTML = '<tr><td colspan="6" class="tbl-empty">🔒 Sesi habis. <button class="tbl-btn" onclick="location.reload()">Login Ulang</button></td></tr>';
        return;
      }
      if (!r.ok) {
        var txt = await r.text();
        tb.innerHTML = '<tr><td colspan="6" class="tbl-empty">HTTP ' + r.status + ' — ' + escHtml(txt.slice(0,100)) + '</td></tr>';
        return;
      }
      var j = await r.json();
      if (!j.ok) { tb.innerHTML = '<tr><td colspan="6" class="tbl-empty">' + escHtml(j.message || 'Gagal') + '</td></tr>'; return; }
      var filter = (document.getElementById('keysSearch').value || '').toLowerCase();
      var list = (j.keys || []).filter(function(k){
        if (!filter) return true;
        return (k.key + ' ' + (k.label || '') + ' ' + (k.owner_id || '')).toLowerCase().indexOf(filter) !== -1;
      });
      if (!list.length) { tb.innerHTML = '<tr><td colspan="6" class="tbl-empty">Belum ada key.</td></tr>'; return; }
      tb.innerHTML = list.map(function(k){
        var statusColor = k.status === 'active' ? '#4ade80' : (k.status === 'exhausted' ? '#fbbf24' : '#f87171');
        var owner = k.owner_id ? '<code>' + escHtml(k.owner_id) + '</code>' : '<span style="color:#666">- belum dipakai -</span>';
        return '<tr>'
          + '<td><code style="color:#a98cff;font-weight:700">' + escHtml(k.key) + '</code></td>'
          + '<td>' + escHtml(k.label || '-') + '</td>'
          + '<td>' + owner + '</td>'
          + '<td>' + k.used_count + '/' + k.max_uses + '</td>'
          + '<td style="color:' + statusColor + '">' + escHtml(k.status) + '</td>'
          + '<td>'
          + '<button class="tbl-btn" data-copy="' + escHtml(k.key) + '">Copy</button>'
          + (k.status === 'active' ? '<button class="tbl-btn danger" data-revoke="' + escHtml(k.key) + '">Revoke</button>' : '')
          + '<button class="tbl-btn danger" data-del="' + escHtml(k.key) + '">Hapus</button>'
          + '</td>'
          + '</tr>';
      }).join('');
      tb.querySelectorAll('[data-copy]').forEach(function(b){
        b.onclick = function(){
          var k = b.dataset.copy;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(k).then(function(){ alert('✅ Copied: ' + k); });
          } else {
            prompt('Copy manual:', k);
          }
        };
      });
      tb.querySelectorAll('[data-revoke]').forEach(function(b){
        b.onclick = async function(){
          if (!confirm('Revoke key ' + b.dataset.revoke + '? User tidak bisa pakai lagi.')) return;
          var rr = await fetch('/api/admin/premium-keys?key=' + encodeURIComponent(b.dataset.revoke) + '&mode=revoke', { method: 'DELETE' });
          var jj = await rr.json();
          alert(jj.message || 'OK');
          loadKeys();
        };
      });
      tb.querySelectorAll('[data-del]').forEach(function(b){
        b.onclick = async function(){
          if (!confirm('HAPUS PERMANEN key ' + b.dataset.del + '?')) return;
          var rr = await fetch('/api/admin/premium-keys?key=' + encodeURIComponent(b.dataset.del) + '&mode=delete', { method: 'DELETE' });
          var jj = await rr.json();
          alert(jj.message || 'OK');
          loadKeys();
        };
      });
    } catch(e) {
      tb.innerHTML = '<tr><td colspan="6" class="tbl-empty">Error: ' + escHtml(e.message) + '</td></tr>';
    }
  }

  var keysReload = document.getElementById('keysReload');
  if (keysReload) keysReload.onclick = loadKeys;
  var keysSearch = document.getElementById('keysSearch');
  if (keysSearch) keysSearch.oninput = loadKeys;

  var btnGen = document.getElementById('btnGenKeys');
  if (btnGen) btnGen.onclick = async function(){
    var label = (document.getElementById('newKeyLabel').value || '').trim();
    var maxUses = parseInt(document.getElementById('newKeyMax').value) || 5;
    if (!label) { alert('Isi nama pemilik dulu.'); return; }
    if (maxUses < 1 || maxUses > 100) { alert('Kuota harus 1-100.'); return; }
    btnGen.disabled = true;
    btnGen.textContent = '⏳ Generating...';
    var res = document.getElementById('genKeyResult');
    res.className = 'result show info';
    res.textContent = 'Membuat key...';
    try {
      var r = await fetch('/api/admin/premium-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label, max_uses: maxUses, quantity: 1 })
      });
      var j = await r.json();
      if (j.ok && j.keys && j.keys[0]) {
        var k = j.keys[0];
        res.className = 'result show ok';
        res.textContent = '✅ Key dibuat!\n\nKey: ' + k + '\nPemilik: ' + label + '\nKuota: ' + maxUses + 'x';
        // Auto copy
        try {
          if (navigator.clipboard) await navigator.clipboard.writeText(k);
          res.textContent += '\n\n📋 Otomatis di-copy ke clipboard';
        } catch(e) {}
      } else {
        res.className = 'result show err';
        res.textContent = '❌ ' + (j.message || 'Gagal generate key.');
      }
      loadKeys();
    } catch(e) {
      res.className = 'result show err';
      res.textContent = '❌ Network error: ' + e.message;
    } finally {
      btnGen.disabled = false;
      btnGen.textContent = '🎲 Generate Key';
    }
  };

  // ==== BACKUP ====
  async function loadBackup() {
    var info = document.getElementById('backupInfo');
    if (!info) return;
    info.innerHTML = '<div style="color:#888">Loading...</div>';
    try {
      var r = await fetch('/api/admin/backup');
      if (r.status === 401) { info.innerHTML = '<div style="color:#ff9aad">🔒 Sesi habis. Login ulang.</div>'; return; }
      var j = await r.json();
      if (!j.ok) { info.innerHTML = '<div style="color:#ff9aad">Error: ' + (j.message || 'Gagal') + '</div>'; return; }

      var rows = Object.entries(j.summary || {}).map(function (kv) {
        return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="color:#a98cff">' + kv[0] + '</span><span style="color:#fff;font-weight:700">' + kv[1] + ' rows</span></div>';
      }).join('');

      info.innerHTML = '<div style="font-weight:700;color:#a98cff;margin-bottom:8px">📊 Isi Database</div>' + rows;
    } catch (e) {
      info.innerHTML = '<div style="color:#ff9aad">Error: ' + e.message + '</div>';
    }
  }

  var btnBackupRefresh = document.getElementById('backupRefresh');
  if (btnBackupRefresh) btnBackupRefresh.onclick = loadBackup;

  var btnBackupRun = document.getElementById('backupRun');
  if (btnBackupRun) btnBackupRun.onclick = async function () {
    if (!confirm('Jalankan backup sekarang? File bakal dikirim ke Telegram.')) return;
    var res = document.getElementById('backupResult');
    btnBackupRun.disabled = true;
    btnBackupRun.textContent = '⏳ Backup...';
    res.style.display = 'block';
    res.innerHTML = '<div class="result show info">Membuat backup...</div>';
    try {
      var r = await fetch('/api/admin/backup', { method: 'POST' });
      var j = await r.json();
      if (j.ok) {
        var tgMsg = j.telegram && j.telegram.ok ? '✅ Terkirim ke Telegram' : '⚠️ Gagal kirim: ' + (j.telegram && j.telegram.reason);
        res.innerHTML = '<div class="result show ok">' +
          '✅ Backup berhasil!\n\n' +
          '📄 ' + j.filename + '\n' +
          '📊 ' + j.total_rows + ' rows\n' +
          '📦 ' + (j.size_bytes / 1024).toFixed(1) + ' KB\n' +
          tgMsg + '</div>';
        loadBackup();
      } else {
        res.innerHTML = '<div class="result show err">❌ ' + (j.message || 'Gagal') + '</div>';
      }
    } catch (e) {
      res.innerHTML = '<div class="result show err">❌ Network error: ' + e.message + '</div>';
    } finally {
      btnBackupRun.disabled = false;
      btnBackupRun.textContent = '📦 Backup Sekarang';
    }
  };

  // Patch tab click handler biar load keys pas diklik
  var origTabClick = null;
  tabs.forEach(function(t){
    if (t.dataset.tab === 'config') {
      var currentClick = t.onclick;
      t.onclick = function(e) {
        if (currentClick) currentClick.call(t, e);
        if (t.dataset.tab === 'config') loadConfig();
      };
    }
    if (t.dataset.tab === 'keys') {
      var currentClick2 = t.onclick;
      t.onclick = function(e) {
        if (currentClick2) currentClick2.call(t, e);
        loadKeys();
      };
    }

    if (t.dataset.tab === 'backup') {
      var currentClick3 = t.onclick;
      t.onclick = function(e) {
        if (currentClick3) currentClick3.call(t, e);
        loadBackup();
      };
    }
  });

})();



