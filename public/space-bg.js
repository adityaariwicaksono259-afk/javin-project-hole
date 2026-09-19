// Realistic Space Background v3 — Canvas
// Elements: stars (multi-layer + sparkle), nebula (noise), galaxy spiral, planets, meteors, comets
(function(){
  var canvas = document.getElementById('spaceBg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: false });

  var W, H, DPR;
  var stars = [];
  var sparkleStars = [];
  var planets = [];
  var meteors = [];
  var comets = [];
  var nebulaBlobs = [];
  var galaxy = null;
  var sun = null;
  var t = 0;

  function rand(min, max){ return Math.random() * (max - min) + min; }
  function randInt(min, max){ return Math.floor(rand(min, max + 1)); }

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

  // ============ INIT ============
  function init(){
    var isSmall = Math.min(W, H) < 600;
    var starCount = isSmall ? 500 : 900;
    var sparkleCount = isSmall ? 12 : 20;
    var blobCount = isSmall ? 6 : 10;

    // ==== STARS (4 layers parallax) ====
    stars = [];
    for (var i = 0; i < starCount; i++) {
      var r = Math.random();
      var layer = r < 0.5 ? 1 : r < 0.75 ? 2 : r < 0.92 ? 3 : 4;
      var size = layer === 4 ? rand(0.9, 1.6) : layer === 3 ? rand(0.6, 1.0) : layer === 2 ? rand(0.4, 0.8) : rand(0.2, 0.6);

      // warna bintang realistis: putih, biru, kuning, oranye
      var colorR = Math.random();
      var color;
      if (colorR < 0.55) color = '255,255,255';      // putih
      else if (colorR < 0.7) color = '200,220,255';  // biru muda
      else if (colorR < 0.85) color = '255,240,200'; // kuning
      else if (colorR < 0.95) color = '255,200,150'; // oranye
      else color = '255,150,150';                    // merah

      stars.push({
        x: rand(0, W), y: rand(0, H),
        r: size, layer: layer,
        speed: 0.02 * layer,
        color: color,
        twinkle: rand(0.008, 0.025),
        phase: rand(0, Math.PI * 2),
        baseAlpha: 0.4 + (layer / 4) * 0.5
      });
    }

    // ==== SPARKLE STARS (bintang terang dengan flare 4-point) ====
    sparkleStars = [];
    for (var i = 0; i < sparkleCount; i++) {
      sparkleStars.push({
        x: rand(0, W), y: rand(0, H),
        size: rand(1.2, 2.5),
        pulse: rand(0.01, 0.025),
        phase: rand(0, Math.PI * 2),
        flareLen: rand(8, 20),
        alpha: rand(0.7, 1.0)
      });
    }

    // ==== NEBULA BLOBS (banyak layer buat noise effect) ====
    nebulaBlobs = [];
    var nebulaColors = [
      'rgba(60,120,220,0.10)',   // biru
      'rgba(120,60,200,0.09)',   // ungu
      'rgba(200,140,80,0.07)',   // emas
      'rgba(80,180,200,0.08)',   // cyan
      'rgba(180,60,120,0.06)',   // pink
      'rgba(30,50,120,0.12)'     // biru tua
    ];
    for (var i = 0; i < blobCount * 3; i++) {
      nebulaBlobs.push({
        x: rand(-W * 0.2, W * 1.2),
        y: rand(-H * 0.2, H * 1.2),
        r: rand(Math.min(W,H) * 0.25, Math.min(W,H) * 0.7),
        color: nebulaColors[i % nebulaColors.length],
        vx: rand(-0.05, 0.05),
        vy: rand(-0.05, 0.05),
        phase: rand(0, Math.PI * 2),
        pulse: rand(0.002, 0.006)
      });
    }

    // ==== GALAXY SPIRAL (opsional, di background) ====
    galaxy = {
      x: W * 0.85,
      y: H * 0.15,
      r: Math.min(W, H) * 0.5,
      angle: 0,
      rotationSpeed: 0.00015,
      arms: 3
    };

    // ==== SUN ====
    sun = {
      x: W * 0.5,
      y: H * 0.55,
      r: Math.min(W, H) * 0.03,
      pulse: 0
    };

    // ==== PLANETS ====
    planets = [];
    var palette = [
      { color1: '#4a7fb5', color2: '#1a3a5c', dist: 0.15, r: 0.014, speed: 0.00022, atmo: 'rgba(100,150,220,0.4)' },
      { color1: '#d97d4a', color2: '#7a3a15', dist: 0.24, r: 0.017, speed: 0.00016, atmo: 'rgba(220,140,80,0.35)' },
      { color1: '#5a8a6a', color2: '#2a4a35', dist: 0.33, r: 0.011, speed: 0.00011, atmo: 'rgba(120,180,140,0.3)' },
      { color1: '#c8b878', color2: '#6a5a38', dist: 0.42, r: 0.015, speed: 0.00008, atmo: 'rgba(220,200,150,0.4)', hasRing: true, ringColor: 'rgba(200,180,140,0.5)' },
      { color1: '#8a6a9a', color2: '#3a2a4a', dist: 0.50, r: 0.009, speed: 0.00006, atmo: 'rgba(160,120,200,0.35)' }
    ];
    for (var i = 0; i < palette.length; i++) {
      var p = palette[i];
      planets.push({
        color1: p.color1,
        color2: p.color2,
        atmo: p.atmo,
        hasRing: !!p.hasRing,
        ringColor: p.ringColor || null,
        dist: Math.min(W, H) * p.dist,
        r: Math.min(W, H) * p.r,
        angle: rand(0, Math.PI * 2),
        speed: p.speed
      });
    }

    meteors = [];
    comets = [];

    console.log('[SpaceV3] Init:', starCount, 'stars,', blobCount * 3, 'nebula blobs');
  }

  // ============ DRAW: NEBULA ============
  function drawNebula(){
    for (var i = 0; i < nebulaBlobs.length; i++) {
      var b = nebulaBlobs[i];
      b.x += b.vx;
      b.y += b.vy;
      b.phase += b.pulse;

      // Wrapping
      if (b.x < -b.r) b.x = W + b.r;
      if (b.x > W + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = H + b.r;
      if (b.y > H + b.r) b.y = -b.r;

      var pulseScale = 1 + Math.sin(b.phase) * 0.15;
      var radius = b.r * pulseScale;

      var grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius);
      grad.addColorStop(0, b.color);
      grad.addColorStop(0.5, b.color.replace(/[\d.]+\)$/, '0.03)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============ DRAW: GALAXY SPIRAL ============
  function drawGalaxy(){
    if (!galaxy) return;
    galaxy.angle += galaxy.rotationSpeed;

    var cx = galaxy.x;
    var cy = galaxy.y;
    var arms = galaxy.arms;

    for (var arm = 0; arm < arms; arm++) {
      var armOffset = (Math.PI * 2 / arms) * arm;
      var points = 40;

      for (var i = 0; i < points; i++) {
        var progress = i / points;
        var radius = progress * galaxy.r;
        var angle = galaxy.angle + armOffset + progress * Math.PI * 1.5;
        var x = cx + Math.cos(angle) * radius;
        var y = cy + Math.sin(angle) * radius * 0.6;

        if (x < -50 || x > W + 50 || y < -50 || y > H + 50) continue;

        var size = (1 - progress) * 18 + 3;
        var alpha = (1 - progress) * 0.15;

        // Inti terang di tengah galaxy
        var grad = ctx.createRadialGradient(x, y, 0, x, y, size);
        grad.addColorStop(0, 'rgba(255,240,220,' + (alpha * 1.5) + ')');
        grad.addColorStop(0.4, 'rgba(200,180,240,' + alpha + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Core galaxy
    var coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, galaxy.r * 0.3);
    coreGrad.addColorStop(0, 'rgba(255,250,240,0.25)');
    coreGrad.addColorStop(0.3, 'rgba(220,200,255,0.15)');
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, galaxy.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ============ DRAW: STARS ============
  function drawStars(){
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y += s.speed;
      s.phase += s.twinkle;
      if (s.y > H + 5) { s.y = -5; s.x = rand(0, W); }

      var twinkle = 0.6 + Math.sin(s.phase) * 0.4;
      var alpha = s.baseAlpha * twinkle;

      ctx.fillStyle = 'rgba(' + s.color + ',' + alpha + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============ DRAW: SPARKLE STARS (4-point flare) ============
  function drawSparkleStars(){
    for (var i = 0; i < sparkleStars.length; i++) {
      var s = sparkleStars[i];
      s.phase += s.pulse;
      var pulse = 0.6 + Math.sin(s.phase) * 0.4;
      var len = s.flareLen * pulse;

      // Glow core
      var coreGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 6);
      coreGrad.addColorStop(0, 'rgba(255,255,255,' + (s.alpha * pulse) + ')');
      coreGrad.addColorStop(0.3, 'rgba(200,220,255,' + (s.alpha * pulse * 0.5) + ')');
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 6, 0, Math.PI * 2);
      ctx.fill();

      // 4-point flare (horizontal + vertical)
      ctx.strokeStyle = 'rgba(255,255,255,' + (s.alpha * pulse * 0.7) + ')';
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';

      // Horizontal
      ctx.beginPath();
      ctx.moveTo(s.x - len, s.y);
      ctx.lineTo(s.x + len, s.y);
      ctx.stroke();

      // Vertical
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - len);
      ctx.lineTo(s.x, s.y + len);
      ctx.stroke();

      // Diagonal (lebih tipis)
      ctx.strokeStyle = 'rgba(255,255,255,' + (s.alpha * pulse * 0.3) + ')';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(s.x - len * 0.6, s.y - len * 0.6);
      ctx.lineTo(s.x + len * 0.6, s.y + len * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x - len * 0.6, s.y + len * 0.6);
      ctx.lineTo(s.x + len * 0.6, s.y - len * 0.6);
      ctx.stroke();

      // Core dot
      ctx.fillStyle = 'rgba(255,255,255,' + (s.alpha * pulse) + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============ DRAW: SUN ============
  function drawSun(){
    if (!sun) return;
    sun.pulse += 0.015;
    var pulse = 1 + Math.sin(sun.pulse) * 0.08;

    // Corona (outer glow)
    var coronaGrad = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.r * 8 * pulse);
    coronaGrad.addColorStop(0, 'rgba(255,230,180,0.5)');
    coronaGrad.addColorStop(0.2, 'rgba(255,180,100,0.25)');
    coronaGrad.addColorStop(0.5, 'rgba(255,120,50,0.08)');
    coronaGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r * 8 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Sun body (gradient)
    var bodyGrad = ctx.createRadialGradient(sun.x - sun.r * 0.3, sun.y - sun.r * 0.3, 0, sun.x, sun.y, sun.r * pulse);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.3, '#fff4c8');
    bodyGrad.addColorStop(0.7, '#ffc266');
    bodyGrad.addColorStop(1, '#ff8a3d');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // ============ DRAW: PLANETS ============
  function drawPlanets(){
    for (var i = 0; i < planets.length; i++) {
      var p = planets[i];
      p.angle += p.speed;
      var px = sun.x + Math.cos(p.angle) * p.dist;
      var py = sun.y + Math.sin(p.angle) * p.dist * 0.75;

      // Orbit trail (faint)
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(sun.x, sun.y, p.dist, p.dist * 0.75, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Atmosphere glow
      if (p.atmo) {
        var atmoGrad = ctx.createRadialGradient(px, py, p.r * 0.8, px, py, p.r * 3);
        atmoGrad.addColorStop(0, p.atmo);
        atmoGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = atmoGrad;
        ctx.beginPath();
        ctx.arc(px, py, p.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ring (kalau ada, gambar di belakang planet dulu)
      if (p.hasRing && p.ringColor) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(0.35);
        ctx.strokeStyle = p.ringColor;
        ctx.lineWidth = p.r * 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 2.4, p.r * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Planet body (gradient with shading — light source = sun)
      var lightAngle = Math.atan2(sun.y - py, sun.x - px);
      var lightX = px - Math.cos(lightAngle) * p.r * 0.5;
      var lightY = py - Math.sin(lightAngle) * p.r * 0.5;

      var bodyGrad = ctx.createRadialGradient(lightX, lightY, 0, px, py, p.r * 1.3);
      bodyGrad.addColorStop(0, p.color1);
      bodyGrad.addColorStop(0.7, p.color2);
      bodyGrad.addColorStop(1, '#000000');

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============ DRAW: METEORS ============
  function spawnMeteor(){
    if (Math.random() < 0.008 && meteors.length < 4) {
      meteors.push({
        x: rand(0, W),
        y: -20,
        vx: rand(-1, 1),
        vy: rand(3, 6),
        len: rand(60, 150),
        alpha: 1,
        decay: rand(0.006, 0.012),
        color: Math.random() < 0.5 ? '255,255,255' : '255,220,180'
      });
    }
  }

  function drawMeteors(){
    spawnMeteor();
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.alpha -= m.decay;

      if (m.alpha <= 0 || m.y > H + 100) {
        meteors.splice(i, 1);
        continue;
      }

      var tailX = m.x - m.vx * (m.len / m.vy);
      var tailY = m.y - m.len;

      var grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, 'rgba(' + m.color + ',' + m.alpha + ')');
      grad.addColorStop(0.3, 'rgba(' + m.color + ',' + (m.alpha * 0.5) + ')');
      grad.addColorStop(1, 'rgba(' + m.color + ',0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Head glow
      var headGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 6);
      headGrad.addColorStop(0, 'rgba(255,255,255,' + m.alpha + ')');
      headGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============ DRAW: COMETS ============
  function spawnComet(){
    if (Math.random() < 0.001 && comets.length < 2) {
      comets.push({
        x: rand(-100, W * 0.3),
        y: rand(0, H * 0.5),
        vx: rand(0.5, 1.5),
        vy: rand(0.2, 0.6),
        len: rand(80, 180),
        alpha: 1,
        decay: 0.003
      });
    }
  }

  function drawComets(){
    spawnComet();
    for (var i = comets.length - 1; i >= 0; i--) {
      var c = comets[i];
      c.x += c.vx;
      c.y += c.vy;
      c.alpha -= c.decay;

      if (c.alpha <= 0 || c.x > W + 200) {
        comets.splice(i, 1);
        continue;
      }

      var tailX = c.x - c.len;
      var tailY = c.y - c.len * 0.3;

      // Tail glow (biru/cyan)
      var grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
      grad.addColorStop(0, 'rgba(180,240,255,' + (c.alpha * 0.9) + ')');
      grad.addColorStop(0.3, 'rgba(120,180,255,' + (c.alpha * 0.4) + ')');
      grad.addColorStop(1, 'rgba(80,120,200,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // Head glow
      var headGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 12);
      headGrad.addColorStop(0, 'rgba(255,255,255,' + c.alpha + ')');
      headGrad.addColorStop(0.4, 'rgba(180,240,255,' + (c.alpha * 0.5) + ')');
      headGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============ MAIN LOOP ============
  function draw(){
    t++;

    // Clear (no trail, biar bersih)
    ctx.fillStyle = '#03030a';
    ctx.fillRect(0, 0, W, H);

    // Layer order: galaxy → nebula → stars → sparkle → sun → planets → meteors → comets
    drawGalaxy();
    drawNebula();
    drawStars();
    drawSparkleStars();
    drawSun();
    drawPlanets();
    drawMeteors();
    drawComets();

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
  console.log('[SpaceV3] Started');
})();

// === Auto-hide splash ===
(function(){
  function hideSplash(){
    var s = document.getElementById('splashScreen');
    if (s && !s.classList.contains('hide')) {
      s.classList.add('hide');
      setTimeout(function(){ s.style.display = 'none'; }, 700);
      console.log('[Splash] Hidden');
    }
  }
  // Force hide setelah 2 detik
  setTimeout(hideSplash, 2000);
  // Backup: hide saat window load
  window.addEventListener('load', function(){ setTimeout(hideSplash, 1500); });
})();
