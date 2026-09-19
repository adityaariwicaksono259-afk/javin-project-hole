// Space Background Animation — Canvas
(function(){
  var canvas = document.getElementById('spaceBg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W, H, DPR;
  var stars = [];
  var planets = [];
  var meteors = [];
  var nebulas = [];
  var sun = { x: 0, y: 0, r: 0 };

  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    init();
  }

  function init(){
    // Stars — 3 layers (parallax)
    stars = [];
    for (var i = 0; i < 180; i++) {
      var layer = i < 100 ? 1 : (i < 150 ? 2 : 3);
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        layer: layer,
        speed: 0.02 + layer * 0.03,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.03,
        brightness: 0.5 + Math.random() * 0.5
      });
    }

    // Nebulas
    nebulas = [
      { x: W * 0.15, y: H * 0.25, r: W * 0.5, color: 'rgba(112,69,255,0.14)', vx: 0.05, vy: 0.03 },
      { x: W * 0.85, y: H * 0.7, r: W * 0.6, color: 'rgba(64,150,255,0.10)', vx: -0.04, vy: -0.02 },
      { x: W * 0.5, y: H * 0.5, r: W * 0.7, color: 'rgba(180,60,220,0.08)', vx: 0.02, vy: 0.04 }
    ];

    // Sun (center)
    sun = { x: W * 0.5, y: H * 0.55, r: Math.min(W, H) * 0.035 };

    // Planets orbiting the sun
    planets = [];
    var palette = [
      { color: '#8b6fff', dist: 0.14, r: 0.012, speed: 0.00020, glow: 'rgba(139,111,255,0.6)' },
      { color: '#ff8c42', dist: 0.22, r: 0.016, speed: 0.00014, glow: 'rgba(255,140,66,0.5)' },
      { color: '#4ade80', dist: 0.30, r: 0.010, speed: 0.00010, glow: 'rgba(74,222,128,0.5)' },
      { color: '#60a5fa', dist: 0.38, r: 0.014, speed: 0.00008, glow: 'rgba(96,165,250,0.55)' },
      { color: '#f87171', dist: 0.46, r: 0.008, speed: 0.00006, glow: 'rgba(248,113,113,0.5)' }
    ];
    for (var i = 0; i < palette.length; i++) {
      var p = palette[i];
      planets.push({
        color: p.color,
        glow: p.glow,
        dist: Math.min(W, H) * p.dist,
        r: Math.min(W, H) * p.r,
        angle: Math.random() * Math.PI * 2,
        speed: p.speed,
        hasRing: i === 3
      });
    }
  }

  function spawnMeteor(){
    if (Math.random() < 0.005 && meteors.length < 3) {
      var startX = Math.random() * W;
      meteors.push({
        x: startX,
        y: -20,
        vx: (Math.random() - 0.5) * 2,
        vy: 4 + Math.random() * 3,
        len: 30 + Math.random() * 60,
        life: 1
      });
    }
  }

  var t = 0;

  function draw(){
    t++;

    // Clear with slight trail for motion blur
    ctx.fillStyle = 'rgba(3,3,10,0.35)';
    ctx.fillRect(0, 0, W, H);

    // Nebulas
    for (var i = 0; i < nebulas.length; i++) {
      var nb = nebulas[i];
      nb.x += nb.vx;
      nb.y += nb.vy;
      if (nb.x < -nb.r) nb.x = W + nb.r;
      if (nb.x > W + nb.r) nb.x = -nb.r;
      if (nb.y < -nb.r) nb.y = H + nb.r;
      if (nb.y > H + nb.r) nb.y = -nb.r;

      var grad = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
      grad.addColorStop(0, nb.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(nb.x, nb.y, nb.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stars
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y += s.speed;
      if (s.y > H + 5) { s.y = -5; s.x = Math.random() * W; }

      var twinkle = 0.5 + Math.sin(t * s.twinkleSpeed + s.phase) * 0.5;
      var alpha = s.brightness * twinkle;

      ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sun
    var sunPulse = 1 + Math.sin(t * 0.02) * 0.05;
    var sunGrad = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.r * 4 * sunPulse);
    sunGrad.addColorStop(0, 'rgba(255,220,120,0.9)');
    sunGrad.addColorStop(0.3, 'rgba(255,150,60,0.5)');
    sunGrad.addColorStop(1, 'rgba(255,100,30,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r * 4 * sunPulse, 0, Math.PI * 2);
    ctx.fill();

    // Sun core
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
    ctx.fill();

    // Orbit rings
    for (var i = 0; i < planets.length; i++) {
      var p = planets[i];
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, p.dist, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Planets
    for (var i = 0; i < planets.length; i++) {
      var p = planets[i];
      p.angle += p.speed;

      var px = sun.x + Math.cos(p.angle) * p.dist;
      var py = sun.y + Math.sin(p.angle) * p.dist * 0.85; // ellipsis

      // Glow
      var glowGrad = ctx.createRadialGradient(px, py, 0, px, py, p.r * 5);
      glowGrad.addColorStop(0, p.glow);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(px, py, p.r * 5, 0, Math.PI * 2);
      ctx.fill();

      // Planet body
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();

      // Ring (jika ada)
      if (p.hasRing) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(px, py, p.r * 2.2, p.r * 0.7, 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Meteors
    spawnMeteor();
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life -= 0.008;

      if (m.life <= 0 || m.y > H + 50) {
        meteors.splice(i, 1);
        continue;
      }

      var mgrad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 10, m.y - m.len);
      mgrad.addColorStop(0, 'rgba(255,255,255,' + m.life + ')');
      mgrad.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.strokeStyle = mgrad;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 10, m.y - m.len);
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
  console.log('[SpaceBG] Loaded');
})();

// === Auto-hide splash setelah load ===
(function(){
  function hideSplash(){
    var s = document.getElementById('splashScreen');
    if (s && !s.classList.contains('hide')) {
      s.classList.add('hide');
      setTimeout(function(){ s.style.display = 'none'; }, 700);
    }
  }
  // Hide setelah 2 detik (atau lebih cepet kalau page udah ready)
  if (document.readyState === 'complete') {
    setTimeout(hideSplash, 1500);
  } else {
    window.addEventListener('load', function(){ setTimeout(hideSplash, 1500); });
    // Fallback max 3.5 detik
    setTimeout(hideSplash, 3500);
  }
})();
