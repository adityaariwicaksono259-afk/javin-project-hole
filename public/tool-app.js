(function(){
  var params = new URLSearchParams(location.search);
  var epId = params.get('id');
  var wrap = document.getElementById('wrap');
  var headerTitle = document.getElementById('headerTitle');

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  if (!epId) {
    wrap.innerHTML = '<div class="notfound"><h2>❌ Tool tidak ditemukan</h2><p>Parameter id tidak ada.</p><a href="/">Kembali ke Beranda</a></div>';
    return;
  }

  // ===== DETECT TYPE =====
  function detectType(ep){
    var name = (ep.name||'').toLowerCase();
    var desc = (ep.desc||'').toLowerCase();
    var folder = (ep.folder||'').toLowerCase();
    var out = (ep.outputType||'').toLowerCase();
    var txt = name + ' ' + desc;

    if (out === 'image' || out === 'binary-png') return 'image';
    if (out === 'video' || out === 'mp4') return 'video';
    if (out === 'audio') return 'audio';

    if (folder === 'canvas') return 'image';
    if (/remover|remove.*background|remini|upscale|hd quality|hd gambar|wink|enhance|pixel art|beautiful|hd image/i.test(txt)) return 'image';

    if (folder === 'stalker' || /stalker|stalk|lacak|cek profil/i.test(name)) return 'stalker';
    if (folder === 'ai' || /^chat|^ai |assistant|gpt|claude|gemini|llama|deepseek|qwen|gita|qwq|felo/i.test(name)) return 'chat';
    if (folder === 'downloader' || /downloader|download/i.test(name)) return 'downloader';
    if (folder === 'search' || /search|cari|pencarian/i.test(name)) return 'search';
    if (folder === 'games') return 'no-input';

    var reqParams = (ep.params||[]).filter(function(p){ return p.r; });
    if (reqParams.length === 0) return 'no-input';
    return 'simple';
  }

  // ===== BUILD FORM =====
  function buildForm(type, ep){
    var allParams = ep.params || [];
    var reqParams = allParams.filter(function(p){ return p.r; });

    if (type === 'no-input') return '<button class="submit" id="btnSubmit">🚀 Jalankan</button>';

    if (type === 'image') {
      var imgParam = null;
      for (var i=0;i<allParams.length;i++){
        var n = (allParams[i].n||'').toLowerCase().trim();
        if (['image','url','img','photo','ppurl','avatar','pas_photo'].indexOf(n) !== -1) { imgParam = allParams[i]; break; }
      }
      var otherParams = allParams.filter(function(p){ return p !== imgParam; });
      var extra = '';
      otherParams.forEach(function(p){
        extra += '<div class="field"><label>' + esc(p.n) + (p.r?' <span style="color:#dc2626">*</span>':'') + (p.d?' <small>(' + esc(p.d) + ')</small>':'') + '</label><input type="text" data-p="' + esc(p.n) + '" placeholder="' + esc(p.d||p.n) + '"></div>';
      });
      return '<button class="alt-toggle" id="btnAltUrl">🔗 Pakai Direct URL</button>' +
        '<div id="modeUrl" style="display:none" class="field"><label>Image URL</label><input type="url" id="imageUrlInput" placeholder="https://...jpg"></div>' +
        '<div id="modeUpload">' +
        '<div class="drop" id="dropZone"><div class="drop-icon">☁️</div><div class="drop-text">Klik untuk pilih atau <b>Drag & Drop</b></div><div class="drop-sub">JPG, PNG, WEBP · Maks 5 MB</div><input type="file" id="fileInput" accept="image/*"></div>' +
        '<div class="preview" id="preview"><img id="previewImg"><button class="preview-clear" id="btnClear">✕</button></div>' +
        '</div>' + extra +
        '<button class="submit" id="btnSubmit" disabled>🚀 Proses Sekarang</button>';
    }

    if (type === 'stalker') {
      var u = allParams[0] || { n: 'username', d: 'Username' };
      for (var i=0;i<allParams.length;i++){
        var n = (allParams[i].n||'').toLowerCase().trim();
        if (['username','user','q','query'].indexOf(n) !== -1) { u = allParams[i]; break; }
      }
      return '<div class="field"><label>' + esc(u.n) + ' <span style="color:#dc2626">*</span></label><input type="text" id="stalkInput" data-p="' + esc(u.n) + '" placeholder="' + esc(u.d||'Masukkan username') + '"></div>' +
        '<button class="submit" id="btnSubmit" disabled>🔍 ' + esc(ep.name) + '</button>';
    }

    if (type === 'downloader') {
      var d = allParams[0] || { n: 'url', d: 'URL' };
      return '<div class="field"><label>' + esc(d.n) + ' <span style="color:#dc2626">*</span></label><input type="url" id="dlInput" data-p="' + esc(d.n) + '" placeholder="' + esc(d.d||'https://...') + '"></div>' +
        '<button class="submit" id="btnSubmit" disabled>⬇️ Download</button>';
    }

    if (type === 'search') {
      var q = allParams[0] || { n: 'q', d: 'Kata kunci' };
      return '<div class="field"><label>' + esc(q.n) + ' <span style="color:#dc2626">*</span></label><input type="text" id="searchInput" data-p="' + esc(q.n) + '" placeholder="' + esc(q.d||'Cari...') + '"></div>' +
        '<button class="submit" id="btnSubmit" disabled>🔎 Cari</button>';
    }

    // Simple
    var fields = '';
    allParams.forEach(function(p){
      var t = /url/i.test(p.n) ? 'url' : 'text';
      fields += '<div class="field"><label>' + esc(p.n) + (p.r?' <span style="color:#dc2626">*</span>':'') + (p.d?' <small>(' + esc(p.d) + ')</small>':'') + '</label><input type="' + t + '" data-p="' + esc(p.n) + '" placeholder="' + esc(p.d||p.n) + '"' + (p.r?' data-required="1"':'') + '></div>';
    });
    return fields + '<button class="submit" id="btnSubmit"' + (reqParams.length === 0 ? '' : ' disabled') + '>🚀 Kirim</button>';
  }

  // ===== RENDER RESULT =====
  function renderResult(container, ct, blob, text){
    ct = (ct||'').toLowerCase();
    var html = '';

    if (ct.indexOf('image/') !== -1) {
      var u = URL.createObjectURL(blob);
      html = '<div class="result-card"><div class="result-title">Hasil Gambar</div>' +
        '<img class="result-media" src="' + u + '">' +
        '<div class="result-actions"><a class="btn-action primary" href="' + u + '" download="javin-' + Date.now() + '.png">⬇️ Download</a>' +
        '<button class="btn-action" data-copy="' + u + '">📋 Copy URL</button></div></div>';
    } else if (ct.indexOf('video/') !== -1) {
      var v = URL.createObjectURL(blob);
      html = '<div class="result-card"><div class="result-title">Hasil Video</div>' +
        '<video class="result-media" controls src="' + v + '"></video>' +
        '<div class="result-actions"><a class="btn-action primary" href="' + v + '" download="javin.mp4">⬇️ Download</a></div></div>';
    } else if (ct.indexOf('audio/') !== -1) {
      var a = URL.createObjectURL(blob);
      html = '<div class="result-card"><div class="result-title">Hasil Audio</div>' +
        '<audio controls style="width:100%" src="' + a + '"></audio>' +
        '<div class="result-actions"><a class="btn-action primary" href="' + a + '" download="javin.mp3">⬇️ Download</a></div></div>';
    } else {
      var txt = text || '';
      var display = txt;
      try {
        var j = JSON.parse(txt);
        var keys = ['answer','result','response','message','text','reply','data','output','content','jawaban'];
        for (var i=0;i<keys.length;i++){
          var v = j[keys[i]];
          if (typeof v === 'string' && v.length > 2) { display = v; break; }
          if (v && typeof v === 'object' && v.text) { display = v.text; break; }
        }
        if (display === txt) display = JSON.stringify(j, null, 2);
      } catch(e) {}

      // Deteksi URL gambar/video di response
      var m = txt.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp|mp4|mp3)/i);
      if (m) {
        var url = m[0];
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
          html = '<div class="result-card"><div class="result-title">Hasil Gambar</div>' +
            '<img class="result-media" src="' + esc(url) + '" onerror="this.style.display=\'none\'">' +
            '<div class="result-actions"><a class="btn-action primary" href="' + esc(url) + '" download>⬇️ Download</a>' +
            '<button class="btn-action" data-copy="' + esc(url) + '">📋 Copy URL</button></div></div>';
        } else if (/\.mp4$/i.test(url)) {
          html = '<div class="result-card"><div class="result-title">Hasil Video</div>' +
            '<video class="result-media" controls src="' + esc(url) + '"></video></div>';
        } else {
          html = '<div class="result-card"><div class="result-title">Hasil</div><div class="result-text">' + esc(display) + '</div></div>';
        }
      } else {
        html = '<div class="result-card"><div class="result-title">Hasil</div><div class="result-text">' + esc(display) + '</div></div>';
      }
    }

    container.innerHTML = html;
    container.classList.add('show');
    container.querySelectorAll('[data-copy]').forEach(function(b){
      b.onclick = function(){
        if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(function(){ alert('✅ Copy!'); });
        else prompt('Copy:', b.dataset.copy);
      };
    });
  }

  function renderError(c, msg){
    c.innerHTML = '<div class="error-box">❌ ' + esc(msg) + '</div>';
    c.classList.add('show');
  }

  // ===== LOAD ENDPOINT DATA =====
  fetch('/endpoints.json').then(function(r){ return r.json(); }).then(function(data){
    var ep = data.find(function(x){ return x.catalogId === epId; });
    if (!ep) {
      wrap.innerHTML = '<div class="notfound"><h2>❌ Tool tidak ditemukan</h2><p>Endpoint <b>' + esc(epId) + '</b> nggak ada.</p><a href="/">Kembali ke Beranda</a></div>';
      return;
    }

    document.title = ep.name + ' — JAVIN';
    headerTitle.textContent = ep.name;

    if (ep.redirect) { window.location.href = ep.redirect; return; }

    var type = detectType(ep);

    if (type === 'chat') { renderChatMode(ep); return; }

    // ===== RENDER FORM =====
    wrap.innerHTML =
      '<div class="hero">' +
        '<div class="badge">' + esc(ep.folder) + (ep.subfolder ? ' · ' + esc(ep.subfolder) : '') + '</div>' +
        '<h1 class="title">' + esc(ep.name) + '</h1>' +
        '<p class="desc">' + esc(ep.desc || 'Tool siap membantu.') + '</p>' +
      '</div>' +
      '<div class="card">' + buildForm(type, ep) + '</div>' +
      '<div class="result-wrap" id="resultWrap"></div>';

    var btnSubmit = document.getElementById('btnSubmit');
    var resultWrap = document.getElementById('resultWrap');
    var dropZone = document.getElementById('dropZone');
    var fileInput = document.getElementById('fileInput');
    var preview = document.getElementById('preview');
    var previewImg = document.getElementById('previewImg');
    var btnClear = document.getElementById('btnClear');
    var btnAltUrl = document.getElementById('btnAltUrl');
    var modeUrl = document.getElementById('modeUrl');
    var modeUpload = document.getElementById('modeUpload');
    var imageUrlInput = document.getElementById('imageUrlInput');
    var uploadedUrl = null;
    var pickedFile = null;

    function updateState(){
      if (!btnSubmit) return;
      if (type === 'image') {
        var hasImg = pickedFile || (imageUrlInput && imageUrlInput.value.trim());
        var reqEls = document.querySelectorAll('[data-required="1"]');
        var ok = true;
        reqEls.forEach(function(i){ if (!i.value.trim()) ok = false; });
        btnSubmit.disabled = !(hasImg && ok);
        return;
      }
      var req = document.querySelectorAll('[data-required="1"]');
      if (req.length === 0) {
        var any = document.querySelectorAll('.field input, .field textarea');
        if (any.length === 0) return;
        var filled = false;
        any.forEach(function(i){ if (i.value.trim()) filled = true; });
        btnSubmit.disabled = !filled;
      } else {
        var ok = true;
        req.forEach(function(i){ if (!i.value.trim()) ok = false; });
        btnSubmit.disabled = !ok;
      }
    }

    if (type === 'image') {
      if (btnAltUrl) btnAltUrl.onclick = function(){
        var isUrl = modeUrl.style.display !== 'none';
        modeUrl.style.display = isUrl ? 'none' : 'block';
        modeUpload.style.display = isUrl ? 'block' : 'none';
        btnAltUrl.textContent = isUrl ? '🔗 Pakai Direct URL' : '📤 Pakai Upload';
        updateState();
      };

      if (dropZone) {
        dropZone.onclick = function(){ fileInput.click(); };
        ['dragover','dragenter'].forEach(function(ev){ dropZone.addEventListener(ev, function(e){ e.preventDefault(); dropZone.classList.add('hover'); }); });
        ['dragleave','drop'].forEach(function(ev){ dropZone.addEventListener(ev, function(e){ e.preventDefault(); dropZone.classList.remove('hover'); }); });
        dropZone.addEventListener('drop', function(e){ if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
      }

      if (fileInput) fileInput.onchange = function(e){ if (e.target.files[0]) handleFile(e.target.files[0]); };

      function handleFile(f){
        if (f.size > 5*1024*1024) { alert('Max 5 MB'); return; }
        var r = new FileReader();
        r.onload = function(e){
          previewImg.src = e.target.result;
          preview.classList.add('show');
          dropZone.style.display = 'none';
          pickedFile = f;
          updateState();
        };
        r.readAsDataURL(f);
      }

      if (btnClear) btnClear.onclick = function(){
        preview.classList.remove('show');
        dropZone.style.display = 'block';
        fileInput.value = '';
        pickedFile = null;
        updateState();
      };

      if (imageUrlInput) imageUrlInput.oninput = updateState;
    }

    document.querySelectorAll('.field input, .field textarea').forEach(function(el){ el.oninput = updateState; });
    updateState();

    async function doSubmit(){
      if (!btnSubmit) return;
      var orig = btnSubmit.textContent;
      btnSubmit.disabled = true;
      btnSubmit.textContent = '⏳ Memproses...';
      resultWrap.classList.remove('show');

      try {
        // Upload gambar kalau ada
        if (type === 'image' && pickedFile && !uploadedUrl) {
          btnSubmit.textContent = '⏳ Upload gambar...';
          var fd = new FormData();
          fd.append('file', pickedFile);
          var ur = await fetch('/api/imgtourl', { method: 'POST', body: fd });
          var uj = await ur.json();
          if (!uj.ok) throw new Error(uj.message || 'Upload gagal');
          uploadedUrl = uj.url;
        }

        // Kumpulin params
        var q = 'id=' + encodeURIComponent(epId);
        document.querySelectorAll('[data-p]').forEach(function(inp){
          var v = inp.value.trim();
          if (v) q += '&' + encodeURIComponent(inp.dataset.p) + '=' + encodeURIComponent(v);
        });

        // Image mode: tambahin URL
        if (type === 'image') {
          var pName = 'url';
          for (var i=0;i<(ep.params||[]).length;i++){
            var nn = (ep.params[i].n||'').toLowerCase().trim();
            if (['image','url','img','photo','ppurl','avatar','pas_photo'].indexOf(nn) !== -1) { pName = ep.params[i].n; break; }
          }
          var finalUrl = uploadedUrl || (imageUrlInput ? imageUrlInput.value.trim() : '');
          if (!finalUrl) throw new Error('Masukkan gambar atau URL');
          q += '&' + encodeURIComponent(pName) + '=' + encodeURIComponent(finalUrl);
        }

        // UID user
        var uid = '';
        try { uid = localStorage.getItem('javin_user_id') || ''; } catch(e){}
        if (uid) q += '&uid=' + encodeURIComponent(uid);

        var res = await fetch('/api/proxy?' + q);
        var ct = res.headers.get('content-type') || '';

        if (!res.ok) {
          var t = await res.text();
          try { var ej = JSON.parse(t); t = ej.message || ej.error || t; } catch(e){}
          throw new Error(t.slice(0, 200));
        }

        if (ct.indexOf('image/') !== -1 || ct.indexOf('video/') !== -1 || ct.indexOf('audio/') !== -1) {
          var blob = await res.blob();
          renderResult(resultWrap, ct, blob, '');
        } else {
          var txt = await res.text();
          renderResult(resultWrap, ct, null, txt);
        }

        resultWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch(e) {
        renderError(resultWrap, e.message);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = orig;
      }
    }

    if (btnSubmit) btnSubmit.onclick = doSubmit;

    document.querySelectorAll('.field input').forEach(function(el){
      el.addEventListener('keydown', function(e){ if (e.key === 'Enter' && !btnSubmit.disabled) doSubmit(); });
    });

  }).catch(function(e){
    wrap.innerHTML = '<div class="notfound"><h2>❌ Gagal memuat</h2><p>' + esc(e.message) + '</p><a href="/">Kembali</a></div>';
  });

  // ===== CHAT MODE =====
  function renderChatMode(ep){
    var uid = '';
    try { uid = localStorage.getItem('javin_user_id') || ''; } catch(e){}
    var history = [];
    var STORAGE = 'javin_chat_' + epId;
    try { var sv = localStorage.getItem(STORAGE); if (sv) history = JSON.parse(sv) || []; } catch(e){}

    wrap.innerHTML =
      '<div class="hero">' +
        '<div class="badge">' + esc(ep.folder) + '</div>' +
        '<h1 class="title">' + esc(ep.name) + '</h1>' +
        '<p class="desc">' + esc(ep.desc || 'AI siap bantu jawab.') + '</p>' +
      '</div>' +
      '<div class="card">' +
        '<div class="chat-list" id="chatList"></div>' +
        '<div class="chat-input-row">' +
          '<textarea id="chatInput" placeholder="Ketik pesan..." rows="1"></textarea>' +
          '<button id="btnSubmit">➤</button>' +
        '</div>' +
      '</div>';

    var chatList = document.getElementById('chatList');
    var chatInput = document.getElementById('chatInput');
    var btnSend = document.getElementById('btnSubmit');

    function save(){ try { localStorage.setItem(STORAGE, JSON.stringify(history.slice(-20))); } catch(e){} }
    function addBubble(text, role){
      var d = document.createElement('div');
      d.className = 'chat-bubble ' + (role === 'user' ? 'user' : 'ai');
      d.textContent = text;
      chatList.appendChild(d);
      chatList.scrollTop = chatList.scrollHeight;
    }

    history.forEach(function(m){ addBubble(m.text, m.role); });

    async function send(){
      var txt = chatInput.value.trim();
      if (!txt) return;
      chatInput.value = '';
      chatInput.style.height = 'auto';
      addBubble(txt, 'user');
      history.push({ role: 'user', text: txt }); save();

      btnSend.disabled = true;
      addBubble('...', 'ai');
      var bubble = chatList.lastChild;

      try {
        var p = (ep.params && ep.params[0] && ep.params[0].n) || 'q';
        var q = 'id=' + encodeURIComponent(epId) + '&' + encodeURIComponent(p) + '=' + encodeURIComponent(txt);
        if (uid) q += '&uid=' + encodeURIComponent(uid);

        var res = await fetch('/api/proxy?' + q);
        var ct = res.headers.get('content-type') || '';

        if (ct.indexOf('image/') !== -1) {
          var blob = await res.blob();
          var url = URL.createObjectURL(blob);
          bubble.innerHTML = '<img src="' + url + '" style="max-width:100%;border-radius:10px">';
          history.push({ role: 'ai', text: '[Gambar]' }); save();
        } else {
          var raw = await res.text();
          var answer = raw;
          try {
            var j = JSON.parse(raw);
            var keys = ['answer','result','response','message','text','reply','data','output','content','jawaban'];
            for (var i=0;i<keys.length;i++){
              var v = j[keys[i]];
              if (typeof v === 'string' && v.length > 0) { answer = v; break; }
            }
            if (answer === raw) answer = JSON.stringify(j, null, 2);
          } catch(e){}
          bubble.textContent = answer;
          history.push({ role: 'ai', text: answer }); save();
        }
      } catch(e) {
        bubble.textContent = '❌ Error: ' + e.message;
      } finally {
        btnSend.disabled = false;
        chatInput.focus();
      }
    }

    btnSend.onclick = send;
    chatInput.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    chatInput.addEventListener('input', function(){
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  }

})();
