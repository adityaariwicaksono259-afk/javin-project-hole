/* ===== KAZE Widgets v10 — Sound dari API ===== */
(function(){
'use strict';

['betoStrip','betoBgLayer','betoStyle','betoHeaderWrap','betoAudio'].forEach(function(id){
  var el = document.getElementById(id);
  if (el) el.remove();
});

var CONFIG = {
  videoUrl: '',
  soundApiUrl: '/api/sound/current',
  accent: '#22d3ee',
  accentDim: 'rgba(14,165,233,.4)',
  storageKey: 'javin_sound_enabled',
  volume: 0.4,
  refreshMs: 5 * 60 * 1000
};

var css = document.createElement('style');
css.id = 'betoStyle';
css.textContent = `
#betoBgLayer{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
#betoBgVideo{position:absolute;top:-5%;left:-5%;width:110%;height:110%;object-fit:cover;opacity:.95;filter:saturate(1.2) brightness(.95)}
#betoBgOverlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.2));animation:betoBgShift 20s ease-in-out infinite alternate}
@keyframes betoBgShift{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(20deg) brightness(1.05)}}
#bgCanvas{position:absolute;inset:0;width:100%;height:100%;opacity:.35}
#betoStrip{display:flex;align-items:center;justify-content:space-around;gap:6px;padding:5px 10px;margin:0;width:100%;background:rgba(10,10,10,.88);border-top:1px solid ${CONFIG.accentDim};border-bottom:1px solid ${CONFIG.accentDim};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:monospace;font-size:11px;color:${CONFIG.accent};user-select:none;box-sizing:border-box;box-shadow:0 4px 16px rgba(0,0,0,.25);position:relative;z-index:10}
#betoStrip .item{display:flex;align-items:center;gap:5px;padding:3px 6px;border-radius:6px;background:${CONFIG.accent}11;white-space:nowrap}
#betoStrip .label{opacity:.7;font-size:10px}
#betoStrip .sep{width:1px;height:14px;background:${CONFIG.accentDim}}
#betoStrip .music-viz{display:inline-flex;align-items:flex-end;gap:2px;height:11px}
#betoStrip .music-viz .bar{width:2px;background:${CONFIG.accent};border-radius:2px;animation:betoBounce 1.2s ease-in-out infinite alternate}
#betoStrip .music-viz .bar:nth-child(1){height:4px;animation-delay:0s}
#betoStrip .music-viz .bar:nth-child(2){height:9px;animation-delay:.2s}
#betoStrip .music-viz .bar:nth-child(3){height:6px;animation-delay:.4s}
#betoStrip .music-viz .bar:nth-child(4){height:11px;animation-delay:.1s}
#betoStrip .music-viz .bar:nth-child(5){height:7px;animation-delay:.3s}
#betoStrip .music-viz.paused .bar{animation-play-state:paused;opacity:.3}
#betoStrip .music-viz.no-sound .bar{background:#666}
@keyframes betoBounce{0%{transform:scaleY(.3)}100%{transform:scaleY(1)}}
#betoMusicBtn{background:${CONFIG.accent}22;border:1px solid ${CONFIG.accentDim};color:${CONFIG.accent};padding:1px 6px;border-radius:5px;font-size:10px;cursor:pointer;font-family:inherit}
#betoBatteryBar{width:24px;height:10px;border:1px solid ${CONFIG.accent};border-radius:2px;position:relative;padding:1px}
#betoBatteryBar::after{content:'';position:absolute;right:-3px;top:3px;width:2px;height:4px;background:${CONFIG.accent};border-radius:0 2px 2px 0}
#betoBatteryFill{height:100%;background:${CONFIG.accent};border-radius:1px;transition:width .5s}
#betoBatteryFill.low{background:#ef4444}
`;
document.head.appendChild(css);

var bgLayer = document.createElement('div');
bgLayer.id = 'betoBgLayer';
document.documentElement.appendChild(bgLayer);

if (CONFIG.videoUrl) {
  var vid = document.createElement('video');
  vid.id = 'betoBgVideo';
  vid.autoplay = true; vid.muted = true; vid.loop = true; vid.playsInline = true;
  vid.style.transition = 'opacity .4s ease';
  var src = document.createElement('source');
  src.src = CONFIG.videoUrl; src.type = 'video/mp4';
  vid.appendChild(src);
  bgLayer.appendChild(vid);

  // Smooth loop: fade out-in 400ms sebelum habis
  vid.addEventListener('loadedmetadata', function(){
    vid.addEventListener('timeupdate', function(){
      var t = vid.currentTime;
      var d = vid.duration;
      if (!d) return;
      if (d - t < 0.4) {
        // Fade out
        vid.style.opacity = Math.max(0, (d - t) / 0.4);
      } else if (t < 0.4) {
        // Fade in
        vid.style.opacity = Math.min(1, t / 0.4);
      } else if (vid.style.opacity !== '1') {
        vid.style.opacity = '1';
      }
    });
  });
}

var ov = document.createElement('div');
ov.id = 'betoBgOverlay';
bgLayer.appendChild(ov);

var canvas = document.createElement('canvas');
canvas.id = 'bgCanvas';
bgLayer.appendChild(canvas);
var ctx = canvas.getContext('2d'), W, H, ps = [];
function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize(); addEventListener('resize', resize);
for (var i = 0; i < 60; i++) {
  ps.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+.4,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,a:Math.random()*.5+.15});
}
(function draw(){
  ctx.clearRect(0,0,W,H);
  for (var i=0;i<ps.length;i++){
    for (var j=i+1;j<ps.length;j++){
      var dx=ps[i].x-ps[j].x, dy=ps[i].y-ps[j].y, d=Math.hypot(dx,dy);
      if (d<140){
        ctx.strokeStyle='rgba(34,211,238,'+((1-d/140)*.15)+')';
        ctx.lineWidth=.6;
        ctx.beginPath(); ctx.moveTo(ps[i].x,ps[i].y); ctx.lineTo(ps[j].x,ps[j].y); ctx.stroke();
      }
    }
  }
  ps.forEach(function(p){
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0||p.x>W)p.vx*=-1;
    if(p.y<0||p.y>H)p.vy*=-1;
    ctx.beginPath();
    ctx.fillStyle='rgba(125,211,252,'+p.a+')';
    ctx.arc(p.x,p.y,p.r,0,6.283); ctx.fill();
  });
  requestAnimationFrame(draw);
})();

function findHeaderEl(){
  var candidates = document.querySelectorAll('nav, header, .navbar, .header, [class*="header"], [class*="navbar"], [class*="appbar"], [class*="topbar"]');
  var best = null, bestTop = Infinity;
  for (var i = 0; i < candidates.length; i++){
    var el = candidates[i];
    var r = el.getBoundingClientRect();
    if (r.top >= -10 && r.top < 130 && r.height > 30 && r.height < 200) {
      if (r.top < bestTop) { bestTop = r.top; best = el; }
    }
  }
  return best;
}

function buildStrip(){
  var strip = document.createElement('div');
  strip.id = 'betoStrip';
  strip.innerHTML =
    '<div class="item"><span class="label">🕐</span><span id="betoClock">--:--:--</span></div>' +
    '<div class="sep"></div>' +
    '<div class="item"><span class="label">🔋</span><span id="betoBattText">--%</span>' +
      '<div id="betoBatteryBar"><div id="betoBatteryFill" style="width:0%"></div></div>' +
    '</div>' +
    '<div class="sep"></div>' +
    '<div class="item">' +
      '<div class="music-viz paused no-sound" id="betoViz">' +
        '<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>' +
      '</div>' +
      '<button id="betoMusicBtn">🔇</button>' +
    '</div>';
  return strip;
}

function mountStrip(){
  var header = findHeaderEl();
  if (!header) {
    var old = document.getElementById('betoStrip');
    if (old) old.remove();
    var s = buildStrip();
    s.style.position = 'fixed';
    s.style.top = '0'; s.style.left = '0'; s.style.right = '0';
    s.style.zIndex = '2147483647';
    document.body.insertBefore(s, document.body.firstChild);
    return true;
  }
  var cs = getComputedStyle(header);
  if (cs.display.indexOf('flex') !== -1 && cs.flexDirection.indexOf('row') !== -1) {
    var parent = header.parentNode;
    var wrapper = document.createElement('div');
    wrapper.id = 'betoHeaderWrap';
    wrapper.style.cssText = 'display:flex;flex-direction:column;width:100%;';
    parent.insertBefore(wrapper, header);
    wrapper.appendChild(header);
    header.style.width = '100%';
    wrapper.appendChild(buildStrip());
  } else {
    header.appendChild(buildStrip());
  }
  return true;
}

function initWidgets(){
  var ck = document.getElementById('betoClock');
  var bt = document.getElementById('betoBattText');
  var bf = document.getElementById('betoBatteryFill');
  var mBtn = document.getElementById('betoMusicBtn');
  var viz = document.getElementById('betoViz');
  if (!ck || !mBtn) return false;

  function pad(n){ return String(n).padStart(2,'0'); }
  function tick(){
    var d = new Date();
    ck.textContent = pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
  }
  tick(); setInterval(tick, 1000);

  if (navigator.getBattery) {
    navigator.getBattery().then(function(b){
      function u(){
        var p = Math.round(b.level*100);
        bt.textContent = (b.charging?'⚡':'') + p + '%';
        bf.style.width = p + '%';
        bf.classList.toggle('low', p <= 20);
      }
      u();
      b.addEventListener('levelchange', u);
      b.addEventListener('chargingchange', u);
    });
  } else { bt.textContent = 'N/A'; }

  var audio = document.createElement('audio');
  audio.id = 'betoAudio';
  audio.loop = true;
  audio.volume = CONFIG.volume;
  audio.preload = 'auto';
  document.documentElement.appendChild(audio);

  var currentSoundId = null;
  var enabled = (localStorage.getItem(CONFIG.storageKey) === null) ? true : localStorage.getItem(CONFIG.storageKey) === '1';

  function updateUI(){
    mBtn.textContent = enabled ? '🔊' : '🔇';
    if (!currentSoundId){
      viz.classList.add('no-sound');
      viz.classList.add('paused');
    } else {
      viz.classList.remove('no-sound');
      if (enabled) viz.classList.remove('paused');
      else viz.classList.add('paused');
    }
  }

  function playMusic(){
    if (!currentSoundId) return;
    var pr = audio.play();
    if (pr && pr.catch) pr.catch(function(){});
  }
  function stopMusic(){ audio.pause(); }

  function loadSound(url, id){
    if (currentSoundId === id) return;
    currentSoundId = id;
    audio.src = url;
    audio.load();
    if (enabled) playMusic();
    updateUI();
  }

  function fetchSound(){
    fetch(CONFIG.soundApiUrl, { cache: 'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(j){
        if (j && j.ok && j.sound){
          var url = j.sound.url;
          if (url.indexOf('?') === -1) url += '?id=' + encodeURIComponent(j.sound.id);
          loadSound(url, j.sound.id);
        } else {
          currentSoundId = null;
          updateUI();
        }
      })
      .catch(function(e){ console.warn('BETOx1 fetch sound fail', e); });
  }

  mBtn.addEventListener('click', function(){
    enabled = !enabled;
    localStorage.setItem(CONFIG.storageKey, enabled ? '1' : '0');
    updateUI();
    if (enabled) playMusic(); else stopMusic();
  });

  var kick = function(){
    if (enabled && audio.paused && currentSoundId) playMusic();
    document.removeEventListener('click', kick);
    document.removeEventListener('touchstart', kick);
  };
  document.addEventListener('click', kick);
  document.addEventListener('touchstart', kick);

  fetchSound();
  setInterval(fetchSound, CONFIG.refreshMs);

  window.addEventListener('storage', function(e){
    if (e.key === CONFIG.storageKey){
      enabled = e.newValue === '1';
      updateUI();
      if (enabled) playMusic(); else stopMusic();
    }
  });

  window.JavinSound = {
    enable:  function(){ enabled = true;  localStorage.setItem(CONFIG.storageKey, '1'); updateUI(); playMusic(); },
    disable: function(){ enabled = false; localStorage.setItem(CONFIG.storageKey, '0'); updateUI(); stopMusic(); },
    toggle:  function(){ enabled = !enabled; localStorage.setItem(CONFIG.storageKey, enabled ? '1':'0'); updateUI(); enabled ? playMusic() : stopMusic(); return enabled; },
    isOn:    function(){ return enabled; },
    setVolume: function(v){ CONFIG.volume = Math.max(0, Math.min(1, v)); audio.volume = CONFIG.volume; },
    refresh: fetchSound
  };

  return true;
}

var tries = 0;
function boot(){
  tries++;
  var ok = mountStrip();
  if (ok && document.getElementById('betoClock')) {
    initWidgets();
    console.log('BETOx1 v10 ready (try ' + tries + ')');
  } else if (tries < 20) {
    setTimeout(boot, 200);
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 100); });
} else {
  setTimeout(boot, 100);
}

})();
