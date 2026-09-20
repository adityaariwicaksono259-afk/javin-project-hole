(function(){
  var params = new URLSearchParams(location.search);
  var epId = params.get('id');
  var wrap = document.getElementById('wrap');
  var headerTitle = document.getElementById('headerTitle');

  // ==== Global helper: fix avatar URL ====
  function fixAvatar(u){
    if (!u || typeof u !== 'string') return u;
    if (/^https?:\/\//.test(u)) return u;
    if (/^avatars?\//i.test(u)) return 'https://characterai.io/i/200/static/' + u;
    if (/^uploads?\//i.test(u)) return 'https://characterai.io/i/200/static/' + u;
    return u;
  }

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
    // AI folder: cek dulu apakah ini list/search atau chat
    if (folder === 'ai') {
      var descL = (ep.desc || '').toLowerCase();
      // Kalau ada indikasi list/daftar/pencarian → bukan chat
      if (/pencarian|mengembalikan daftar|daftar bot|daftar karakter|list karakter|search|mencari karakter|mencari list/i.test(descL)) {
        return 'search';
      }
      // Kalau name pake "c.ai", "character" → search juga
      if (/c\.?ai|character/i.test(name) && !/^chat/i.test(name)) {
        return 'search';
      }
      return 'chat';
    }
    if (/^chat|^ai |assistant|gpt|claude|gemini|llama|deepseek|qwen|gita|qwq|felo/i.test(name)) {
      // Tapi kalau ada "cari/daftar" di desc, bukan chat
      var dl = (ep.desc || '').toLowerCase();
      if (/pencarian|daftar|search|mencari/i.test(dl)) return 'search';
      return 'chat';
    }
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

  // ==== MEDIA (dari content-type) ====
  if (ct.indexOf('image/') !== -1) {
    var u = URL.createObjectURL(blob);
    html = '<div class="result-card"><div class="result-title">Hasil Gambar</div>' +
      '<img class="result-media" src="' + u + '">' +
      '<div class="result-actions"><a class="btn-action primary" href="' + u + '" download="javin-' + Date.now() + '.png">⬇️ Download</a>' +
      '<button class="btn-action" data-copy="' + u + '">📋 Copy URL</button></div></div>';
    return finishResult(container, html);
  }
  if (ct.indexOf('video/') !== -1) {
    var v = URL.createObjectURL(blob);
    html = '<div class="result-card"><div class="result-title">Hasil Video</div>' +
      '<video class="result-media" controls src="' + v + '"></video>' +
      '<div class="result-actions"><a class="btn-action primary" href="' + v + '" download="javin.mp4">⬇️ Download</a></div></div>';
    return finishResult(container, html);
  }
  if (ct.indexOf('audio/') !== -1) {
    var a = URL.createObjectURL(blob);
    html = '<div class="result-card"><div class="result-title">Hasil Audio</div>' +
      '<audio controls style="width:100%" src="' + a + '"></audio>' +
      '<div class="result-actions"><a class="btn-action primary" href="' + a + '" download="javin.mp3">⬇️ Download</a></div></div>';
    return finishResult(container, html);
  }

  // ==== JSON / TEXT ====
  var txt = text || '';
  var parsed = null;
  try { parsed = JSON.parse(txt); } catch(e) {}

  if (!parsed) {
    // Bukan JSON — cek URL di dalam
    var m = txt.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp|mp4|mp3)/i);
    if (m) {
      html = renderFromUrl(m[0], txt);
    } else {
      html = '<div class="result-card"><div class="result-title">Hasil</div>' +
        '<div class="result-text">' + esc(txt) + '</div></div>';
    }
    return finishResult(container, html);
  }

  // ==== JSON parsed — smart render ====
  html = smartJsonRender(parsed);
  return finishResult(container, html);
}

// ==== FINISH — attach copy handlers ====
function finishResult(container, html){
  container.innerHTML = html;
  container.classList.add('show');

  // Copy buttons
  container.querySelectorAll('[data-copy]').forEach(function(b){
    b.onclick = function(){
      if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(function(){ alert('✅ Copy!'); });
      else prompt('Copy:', b.dataset.copy);
    };
  });

  // Play/Pause button
  var btnPlay = container.querySelector('#btnPlay');
  var audioEl = container.querySelector('#audioPlayer');
  if (btnPlay && audioEl) {
    btnPlay.onclick = function(){
      if (audioEl.paused) {
        audioEl.play().then(function(){
          btnPlay.innerHTML = '⏸️ Pause';
        }).catch(function(e){
          alert('Gagal play: ' + e.message);
        });
      } else {
        audioEl.pause();
        btnPlay.innerHTML = '▶️ Play';
      }
    };
    audioEl.onended = function(){ btnPlay.innerHTML = '▶️ Play'; };
    audioEl.onerror = function(){
      btnPlay.innerHTML = '⚠️ Error';
      setTimeout(function(){ btnPlay.innerHTML = '▶️ Play'; }, 2000);
    };
  }

  // Lirik toggle
  var btnLyrics = container.querySelector('#btnLyrics');
  var lyricsBox = container.querySelector('#lyricsBox');
  if (btnLyrics && lyricsBox) {
    btnLyrics.onclick = function(){
      if (lyricsBox.style.display === 'none') {
        lyricsBox.style.display = 'block';
        btnLyrics.innerHTML = '📜 Sembunyikan Lirik';
      } else {
        lyricsBox.style.display = 'none';
        btnLyrics.innerHTML = '📜 Lihat Lirik';
      }
    };
  }

  // Search lirik (kalau nggak ada lyrics di response) — 2-STEP
  var btnSearchLy = container.querySelector('#btnSearchLyrics');
  if (btnSearchLy && lyricsBox) {
    btnSearchLy.onclick = async function(){
      btnSearchLy.disabled = true;
      btnSearchLy.innerHTML = '⏳ Mencari lirik...';
      lyricsBox.style.display = 'block';
      lyricsBox.textContent = '🔍 Step 1/2: Mencari lagu...';

      try {
        var uid = '';
        try { uid = localStorage.getItem('javin_user_id') || ''; } catch(e){}
        var q = btnSearchLy.dataset.title + (btnSearchLy.dataset.artist ? ' ' + btnSearchLy.dataset.artist : '');

        // STEP 1: Search lyric (ep100)
        var url1 = '/api/proxy?id=ep100&q=' + encodeURIComponent(q) + (uid ? '&uid=' + encodeURIComponent(uid) : '');
        var r1 = await fetch(url1);
        var txt1 = await r1.text();
        var j1 = null;
        try { j1 = JSON.parse(txt1); } catch(e){}

        if (!j1) throw new Error('Search gagal');

        // Cek kalau search langsung kasih lirik
        var directLyrics = extractLyrics(j1);
        if (directLyrics && directLyrics.length > 50) {
          lyricsBox.textContent = directLyrics;
          btnSearchLy.innerHTML = '📜 Sembunyikan Lirik';
          btnSearchLy.disabled = false;
          return;
        }

        // Cari URL genius dari response
        var geniusUrl = findGeniusUrl(j1);
        if (!geniusUrl) {
          lyricsBox.textContent = '❌ Lirik tidak ditemukan.\n\nResponse: ' + txt1.slice(0, 300);
          btnSearchLy.innerHTML = '📜 Coba Lagi';
          btnSearchLy.disabled = false;
          return;
        }

        // STEP 2: Get lyric detail (ep101)
        lyricsBox.textContent = '🔍 Step 2/2: Mengambil lirik dari Genius...';
        var url2 = '/api/proxy?id=ep101&q=' + encodeURIComponent(geniusUrl) + (uid ? '&uid=' + encodeURIComponent(uid) : '');
        var r2 = await fetch(url2);
        var txt2 = await r2.text();
        var j2 = null;
        try { j2 = JSON.parse(txt2); } catch(e){}

        var finalLyrics = null;
        if (j2) finalLyrics = extractLyrics(j2);
        if (!finalLyrics) finalLyrics = txt2;

        // Bersihin lirik
        if (typeof finalLyrics === 'string') {
          finalLyrics = finalLyrics.replace(/\\n/g, '\n').trim();
        }

        lyricsBox.textContent = finalLyrics || 'Lirik tidak ditemukan.';
        btnSearchLy.innerHTML = '📜 Sembunyikan Lirik';

      } catch(e) {
        lyricsBox.textContent = '❌ Gagal: ' + e.message;
        btnSearchLy.innerHTML = '📜 Coba Lagi';
      } finally {
        btnSearchLy.disabled = false;
      }
    };
  }
}

function extractLyrics(j, depth){
  if (depth === undefined) depth = 0;
  if (depth > 5 || !j) return null;
  if (typeof j === 'string') return j.length > 20 ? j : null;
  if (Array.isArray(j)) {
    for (var i=0;i<j.length;i++){ var r = extractLyrics(j[i], depth+1); if (r) return r; }
    return null;
  }
  if (typeof j === 'object') {
    var keys = ['lyrics','lirik','text','result','data','content','lyric'];
    for (var i=0;i<keys.length;i++){
      if (j[keys[i]] !== undefined) {
        var r = extractLyrics(j[keys[i]], depth+1);
        if (r && r.length > 20) return r;
      }
    }
  }
  return null;
}

// ==== RENDER DARI URL ====
function renderFromUrl(url, raw){
  var isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  var isVideo = /\.mp4$/i.test(url);
  if (isImg) {
    return '<div class="result-card"><div class="result-title">Hasil Gambar</div>' +
      '<img class="result-media" src="' + esc(url) + '" onerror="this.style.display=\'none\'">' +
      '<div class="result-actions"><a class="btn-action primary" href="' + esc(url) + '" download>⬇️ Download</a>' +
      '<button class="btn-action" data-copy="' + esc(url) + '">📋 Copy URL</button></div></div>';
  }
  if (isVideo) {
    return '<div class="result-card"><div class="result-title">Hasil Video</div>' +
      '<video class="result-media" controls src="' + esc(url) + '"></video></div>';
  }
  return '<div class="result-card"><div class="result-title">Hasil</div>' +
    '<div class="result-text">' + esc(raw) + '</div></div>';
}

// ==== SMART JSON RENDER ====
function smartJsonRender(j){
  var d = j.data || j.result || j.response || j;
  var out = '';

  // ==== Media URLs (image/video/audio) ====
  var media = findMediaUrl(d);
  if (media) {
    if (media.type === 'image') {
      out += '<div class="result-card"><div class="result-title">Hasil Gambar</div>' +
        '<img class="result-media" src="' + esc(media.url) + '" onerror="this.style.display=\'none\'">' +
        '<div class="result-actions"><a class="btn-action primary" href="' + esc(media.url) + '" download>⬇️ Download</a>' +
        '<button class="btn-action" data-copy="' + esc(media.url) + '">📋 Copy URL</button></div></div>';
    } else if (media.type === 'video') {
      out += '<div class="result-card"><div class="result-title">Hasil Video</div>' +
        '<video class="result-media" controls src="' + esc(media.url) + '"></video>' +
        '<div class="result-actions"><a class="btn-action primary" href="' + esc(media.url) + '" download>⬇️ Download</a></div></div>';
    } else if (media.type === 'audio') {
      out += '<div class="result-card"><div class="result-title">Hasil Audio</div>' +
        '<audio controls style="width:100%" src="' + esc(media.url) + '"></audio>' +
        '<div class="result-actions"><a class="btn-action primary" href="' + esc(media.url) + '" download>⬇️ Download</a></div></div>';
    }
  }

  // ==== Profile / Stalker card ====
  if (isProfileData(d)) {
    out += renderProfileCard(d);
  }

  // ==== Downloader / Media info ====
  if (d.title && (d.download_url || d.url || d.audio || d.video)) {
    out += renderDownloaderCard(d);
  }

  // ==== Search result list ====
  if (Array.isArray(d) && d.length > 0) {
    out += renderListCard(d);
  } else if (d.results && Array.isArray(d.results)) {
    out += renderListCard(d.results);
  } else if (d.data && Array.isArray(d.data)) {
    out += renderListCard(d.data);
  }

  // ==== Text answer (AI style) ====
  if (!out) {
    var txt = extractTextAnswer(j);
    if (txt) {
      out = '<div class="result-card"><div class="result-title">Hasil</div>' +
        '<div class="result-text">' + esc(txt) + '</div></div>';
    }
  }

  // ==== Fallback — pretty JSON ====
  if (!out) {
    out = '<div class="result-card"><div class="result-title">Hasil</div>' +
      '<div class="result-text" style="font-family:monospace;font-size:11px">' + esc(JSON.stringify(j, null, 2)) + '</div></div>';
  }

  // ==== Lyrics — cuma kalau ini tool musik ====
  var isMusicTool = !!(d.duration || d.track || d.album || d.artist || (d.result && (d.result.duration || d.result.artist)));
  var lyrics = d.lyrics || d.lirik || d.synced_lyrics || (d.result && (d.result.lyrics || d.result.lirik)) || null;
  var trackTitle = d.title || (d.result && d.result.title) || '';
  var trackArtist = d.artist || d.author || (d.result && d.result.artist) || '';

  if (isMusicTool && lyrics && typeof lyrics === 'string' && lyrics.trim().length > 3) {
    out += '<button class="btn-action" id="btnLyrics" style="margin-top:10px">📜 Lihat Lirik</button>' +
      '<div id="lyricsBox" style="display:none;margin-top:10px;background:#f8fafc;border-radius:14px;padding:16px;font-size:13px;line-height:1.8;color:#334155;white-space:pre-wrap;max-height:400px;overflow-y:auto">' + esc(lyrics.trim()) + '</div>';
  } else if (isMusicTool && trackTitle) {
    out += '<button class="btn-action" id="btnSearchLyrics" style="margin-top:10px" data-title="' + esc(trackTitle) + '" data-artist="' + esc(trackArtist) + '">📜 Cari Lirik</button>' +
      '<div id="lyricsBox" style="display:none;margin-top:10px;background:#f8fafc;border-radius:14px;padding:16px;font-size:13px;line-height:1.8;color:#334155;white-space:pre-wrap;max-height:400px;overflow-y:auto"></div>';
  }

  return out;
}

// ==== Cari media URL dalam objek ====
function findMediaUrl(obj, depth){
  if (depth === undefined) depth = 0;
  if (depth > 4 || !obj) return null;
  if (typeof obj === 'string') {
    if (/^https?:\/\//.test(obj)) {
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(obj)) return { url: obj, type: 'image' };
      if (/\.(mp4|webm)$/i.test(obj)) return { url: obj, type: 'video' };
      if (/\.(mp3|m4a|ogg|wav)$/i.test(obj)) return { url: obj, type: 'audio' };
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (var i=0;i<obj.length;i++){ var r = findMediaUrl(obj[i], depth+1); if (r) return r; }
    return null;
  }
  if (typeof obj === 'object') {
    var priority = ['url','image','img','photo','thumbnail','thumb','avatar','avatar_url','picture','pic','cover','download','download_url','link','file','media'];
    for (var i=0;i<priority.length;i++){
      if (obj[priority[i]] !== undefined) {
        var r = findMediaUrl(obj[priority[i]], depth+1);
        if (r) return r;
      }
    }
    var keys = Object.keys(obj);
    for (var k=0;k<keys.length;k++){
      var r2 = findMediaUrl(obj[keys[k]], depth+1);
      if (r2) return r2;
    }
  }
  return null;
}

// ==== Cek profile data ====
function isProfileData(d){
  if (!d || typeof d !== 'object') return false;
  var hasUser = d.username || d.user || d.name || d.nickname || d.nama;
  var hasStats = d.followers !== undefined || d.following !== undefined || d.posts !== undefined || d.followers_count !== undefined;
  return hasUser && (hasStats || d.bio || d.avatar || d.avatar_url);
}

function renderProfileCard(d){
  var name = d.name || d.nickname || d.nama || d.username || d.user;
  var uname = d.username || d.user || '';
  var avatar = fixAvatar(d.avatar || d.avatar_url || d.profile_pic || d.pp || '');
  var stats = [];
  if (d.followers !== undefined) stats.push({ v: d.followers, l: 'Followers' });
  if (d.followers_count !== undefined) stats.push({ v: d.followers_count, l: 'Followers' });
  if (d.following !== undefined) stats.push({ v: d.following, l: 'Following' });
  if (d.following_count !== undefined) stats.push({ v: d.following_count, l: 'Following' });
  if (d.posts !== undefined) stats.push({ v: d.posts, l: 'Posts' });
  if (d.posts_count !== undefined) stats.push({ v: d.posts_count, l: 'Posts' });
  if (d.likes !== undefined) stats.push({ v: d.likes, l: 'Likes' });
  if (d.hearts !== undefined) stats.push({ v: d.hearts, l: 'Hearts' });

  var statsHtml = stats.slice(0,4).map(function(s){
    return '<div style="text-align:center;padding:0 8px"><b style="display:block;font-size:16px;font-weight:800">' + esc(s.v) + '</b><small style="font-size:10px;opacity:.7;text-transform:uppercase">' + esc(s.l) + '</small></div>';
  }).join('');

  var info = '';
  var infoFields = [
    ['Bio', d.bio || d.desc || d.description],
    ['Verified', d.verified !== undefined ? (d.verified ? '✅ Ya' : '❌ Tidak') : null],
    ['Private', d.private !== undefined || d.is_private !== undefined ? (d.private || d.is_private ? '🔒 Ya' : '🌐 Tidak') : null],
    ['Lokasi', d.location || d.city],
    ['Bergabung', d.join_date || d.created_at || d.joined],
    ['ID', d.id || d.user_id || d.uid]
  ];
  infoFields.forEach(function(f){
    if (f[1]) info += '<div><b>' + esc(f[0]) + ':</b> ' + esc(f[1]) + '</div>';
  });

  var avatarHtml = avatar ? '<img src="' + esc(avatar) + '" style="width:90px;height:90px;border-radius:50%;border:3px solid rgba(255,255,255,.4);object-fit:cover;margin:0 auto 12px;display:block;background:rgba(255,255,255,.1)" onerror="this.style.display=\'none\'">' : '';

  return '<div class="result-card" style="background:linear-gradient(135deg,#0EA5E9,#6366F1);color:#fff;border:0">' +
    avatarHtml +
    '<div style="text-align:center">' +
    '<div style="font-size:20px;font-weight:800;margin-bottom:4px">' + esc(name) + '</div>' +
    (uname && uname !== name ? '<div style="font-size:13px;opacity:.85;margin-bottom:16px">@' + esc(uname) + '</div>' : '<div style="margin-bottom:12px"></div>') +
    '</div>' +
    (statsHtml ? '<div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;padding:12px 0;border-top:1px solid rgba(255,255,255,.2);border-bottom:1px solid rgba(255,255,255,.2)">' + statsHtml + '</div>' : '') +
    (info ? '<div style="margin-top:14px;font-size:12px;line-height:1.7">' + info + '</div>' : '') +
    '</div>';
}

// ==== Cek downloader data ====
function renderDownloaderCard(d){
  var title = d.title || d.name || d.filename || 'Media';
  var artist = d.artist || d.author || d.channel || '';
  var thumb = fixAvatar(d.thumbnail || d.thumb || d.cover || d.image || '');
  var duration = d.duration || d.length || '';
  var downloads = [];
  if (d.download_url) downloads.push({ label: 'Download', url: d.download_url });
  // Open URL diganti jadi Play/Pause player di bawah
  if (d.audio) downloads.push({ label: 'Audio', url: typeof d.audio === 'string' ? d.audio : (d.audio.url || '') });
  if (d.video) downloads.push({ label: 'Video', url: typeof d.video === 'string' ? d.video : (d.video.url || '') });

  var dlBtns = downloads.filter(function(x){ return x.url; }).map(function(x){
    return '<a class="btn-action primary" href="' + esc(x.url) + '" target="_blank" rel="noopener">⬇️ ' + esc(x.label) + '</a>';
  }).join('');

  // Player audio inline
  var audioSrc = d.download_url || (d.url && typeof d.url === 'string' && /\.(mp3|m4a|ogg|wav)/i.test(d.url) ? d.url : null) || (d.audio && typeof d.audio === 'string' ? d.audio : null);
  var playerHtml = '';
  if (audioSrc) {
    playerHtml = '<button class="btn-action primary" id="btnPlay" style="margin-top:4px">▶️ Play</button>' +
      '<audio id="audioPlayer" src="' + esc(audioSrc) + '" preload="none" style="display:none"></audio>';
  }

  var thumbHtml = thumb ? '<img src="' + esc(thumb) + '" style="width:100%;max-height:220px;object-fit:cover;border-radius:14px;margin-bottom:14px" onerror="this.style.display=\'none\'">' : '';

  return '<div class="result-card">' +
    '<div class="result-title">Hasil</div>' +
    thumbHtml +
    '<div style="font-size:16px;font-weight:800;margin-bottom:4px">' + esc(title) + '</div>' +
    (artist ? '<div style="font-size:13px;color:#64748b;margin-bottom:4px">' + esc(artist) + '</div>' : '') +
    (duration ? '<div style="font-size:12px;color:#94a3b8;margin-bottom:12px">⏱️ ' + esc(duration) + '</div>' : '') +
    (playerHtml || dlBtns ? '<div class="result-actions">' + playerHtml + dlBtns + '</div>' : '') +
    '</div>';
}

// ==== Render list hasil search ====
function renderListCard(arr){
  var items = arr.slice(0, 20).map(function(item){
    if (typeof item === 'string') {
      return '<div style="padding:10px 12px;background:#f8fafc;border-radius:10px;font-size:13px;word-break:break-all">' + esc(item) + '</div>';
    }
    var title = item.title || item.name || item.username || item.id || '';
    var sub = item.desc || item.description || item.bio || item.url || '';
    var thumb = fixAvatar(item.thumbnail || item.image || item.thumb || item.avatar_url || item.avatar || '');
    var thumbHtml = thumb ? '<img src="' + esc(thumb) + '" style="width:50px;height:50px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.style.display=\'none\'">' : '';
    return '<div style="display:flex;gap:10px;padding:10px 12px;background:#f8fafc;border-radius:10px;align-items:center">' +
      thumbHtml +
      '<div style="flex:1;min-width:0">' +
      '<div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px">' + esc(title) + '</div>' +
      (sub ? '<div style="font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(sub) + '</div>' : '') +
      '</div></div>';
  }).join('');
  return '<div class="result-card"><div class="result-title">Hasil (' + arr.length + ')</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' + items + '</div></div>';
}

// ==== Extract text answer dari JSON ====
function isJunkString(s){
  if (!s || typeof s !== 'string') return true;
  s = s.trim();
  if (s.length < 3) return true;
  // Skip kalau URL absolute
  if (/^https?:\/\//.test(s)) return true;
  // Skip kalau path/file (av=... .jpg, /path/, dll)
  if (/^(avatars?\/|\/|uploads?\/|files?\/)/i.test(s)) return true;
  if (/\.(jpg|jpeg|png|gif|webp|mp4|mp3|pdf|zip)$/i.test(s)) return true;
  // Skip kalau isinya cuma 1 kata tanpa spasi & nggak ada huruf biasa
  if (!/\s/.test(s) && /^[a-z0-9_\-\/\.]+$/i.test(s) && s.length < 50) return true;
  // Skip UUID-like
  if (/^[a-f0-9\-]{20,}$/i.test(s)) return true;
  return false;
}

function extractTextAnswer(j, depth){
  if (depth === undefined) depth = 0;
  if (depth > 6 || j == null) return null;
  if (typeof j === 'string') return isJunkString(j) ? null : j;

  if (Array.isArray(j)) {
    for (var i=0;i<j.length;i++){ var r = extractTextAnswer(j[i], depth+1); if (r) return r; }
    return null;
  }

  if (typeof j === 'object') {
    // Priority keys dulu
    var keys = ['answer','result','response','reply','message','text','jawaban','output','content','msg','description','desc','name','title'];
    for (var i=0;i<keys.length;i++){
      if (typeof j[keys[i]] === 'string' && !isJunkString(j[keys[i]])) return j[keys[i]];
    }
    // Recurse ke semua value
    var ks = Object.keys(j);
    for (var k=0;k<ks.length;k++){
      var r2 = extractTextAnswer(j[ks[k]], depth+1);
      if (r2 && r2.length > 5) return r2;
    }
  }
  return null;
}

function renderError(c, msg){
    c.innerHTML = '<div class="error-box">❌ ' + esc(msg) + '</div>';
    c.classList.add('show');
  }

  // ===== LOAD ENDPOINT DATA =====
  function loadEndpoints(){
    return new Promise(function(resolve){
      try {
        var cached = sessionStorage.getItem('javin_ep_cache');
        if (cached) { resolve(JSON.parse(cached)); return; }
      } catch(e){}
      fetch('/endpoints.json').then(function(r){ return r.json(); }).then(function(data){
        try { sessionStorage.setItem('javin_ep_cache', JSON.stringify(data)); } catch(e){}
        resolve(data);
      }).catch(function(){ resolve([]); });
    });
  }

  loadEndpoints().then(function(data){
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
          // Kalau HTML (bukan JSON), ambil status code aja
          if (t.trim().startsWith('<')) {
            var statusMsg = res.status === 503 ? 'Service Unavailable' :
                           res.status === 502 ? 'Bad Gateway' :
                           res.status === 504 ? 'Gateway Timeout' :
                           res.status === 500 ? 'Internal Server Error' :
                           'HTTP ' + res.status;
            throw new Error('Server upstream sedang bermasalah. ' + statusMsg + '. Coba lagi nanti atau pakai tool lain.');
          }
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
          // Cek kalau HTML error
          if (raw.trim().startsWith('<')) {
            var sm = raw.match(/<title>([^<]*)<\/title>/i);
            var errMsg = sm ? sm[1].trim() : 'Server upstream sedang bermasalah';
            bubble.textContent = '⚠️ ' + errMsg + '. Coba lagi nanti atau pakai AI lain.';
            history.push({ role: 'ai', text: '[Error]' }); save();
            return;
          }
          var answer = extractAnswer(raw);
          // Kalau answer kosong atau pendek & response aslinya array, render sebagai card
          if (!answer || answer.length < 3) {
            try {
              var jj = JSON.parse(raw);
              var arr = Array.isArray(jj) ? jj :
                        (jj.data && Array.isArray(jj.data)) ? jj.data :
                        (jj.result && Array.isArray(jj.result)) ? jj.result : null;
              if (arr && arr.length > 0) {
                bubble.innerHTML = renderListCard(arr);
                bubble.style.maxWidth = '100%';
                bubble.style.background = 'transparent';
                bubble.style.padding = '0';
                history.push({ role: 'ai', text: '[Daftar hasil: ' + arr.length + ' item]' }); save();
                return;
              }
            } catch(e){}
          }
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


function extractAnswer(raw){
  if (typeof raw !== 'string') return String(raw || '');
  try {
    var j = JSON.parse(raw);
    var found = deepSearch(j, 0);
    if (found) return found;
    return JSON.stringify(j, null, 2);
  } catch(e) {
    return raw;
  }
}

function deepSearch(obj, depth){
  if (depth > 5 || obj == null) return null;
  if (typeof obj === 'string') {
    if (obj.length > 3 && !/^https?:\/\//.test(obj)) return obj;
    return null;
  }
  if (typeof obj === 'object') {
    var priority = ['answer','result','response','reply','message','text','jawaban','output','content','data','value','msg'];
    for (var i=0;i<priority.length;i++){
      if (obj[priority[i]] !== undefined) {
        var r = deepSearch(obj[priority[i]], depth+1);
        if (r) return r;
      }
    }
    // Fallback: cari value string manapun
    var keys = Object.keys(obj);
    for (var k=0;k<keys.length;k++){
      var r2 = deepSearch(obj[keys[k]], depth+1);
      if (r2 && r2.length > 5) return r2;
    }
  }
  return null;
}


function findGeniusUrl(obj, depth){
  if (depth === undefined) depth = 0;
  if (depth > 6 || !obj) return null;
  if (typeof obj === 'string') {
    if (/genius\.com/.test(obj) && /lyrics/i.test(obj)) return obj;
    return null;
  }
  if (Array.isArray(obj)) {
    for (var i=0;i<obj.length;i++){ var r = findGeniusUrl(obj[i], depth+1); if (r) return r; }
    return null;
  }
  if (typeof obj === 'object') {
    var keys = Object.keys(obj);
    for (var k=0;k<keys.length;k++){
      var r = findGeniusUrl(obj[keys[k]], depth+1);
      if (r) return r;
    }
  }
  return null;
}

})();
