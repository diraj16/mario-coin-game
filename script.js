// ═══════════════════════════════════════════════════
//   CHARAN THE RUNNER — Full Graphical Engine
// ═══════════════════════════════════════════════════

const canvas = document.getElementById("game");
const ctx    = canvas.getContext("2d");

const W = () => canvas.width;
const H = () => canvas.height;

const isMobile = window.innerWidth < 768;

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  groundY = canvas.height * GROUND_RATIO;
  if (player) { player.y = Math.min(player.y, groundY - player.h); }
});

// ── PLAYER IMAGE ──
const playerImg = new Image();
playerImg.src   = "assets/player.png";

// ── GAME OVER AUDIO (your friend's voice) ──
const gameOverMusic = new Audio("assets/gameover.mp3");
gameOverMusic.volume = 0.7;

// ── WEB AUDIO for SFX ──
let AC;
function ac() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  return AC;
}
function tone(freq, dur, type="sine", vol=0.25, slide=null) {
  try {
    const o = ac().createOscillator(), g = ac().createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac().currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, ac().currentTime + dur);
    g.gain.setValueAtTime(vol, ac().currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac().currentTime + dur);
    o.connect(g); g.connect(ac().destination);
    o.start(); o.stop(ac().currentTime + dur);
  } catch(e) {}
}
const SFX = {
  jump:  () => tone(320, 0.18, "square", 0.18, 600),
  coin:  () => { tone(880, 0.1, "sine", 0.2, 1320); setTimeout(() => tone(1320, 0.1, "sine", 0.15), 60); },
  hurt:  () => tone(180, 0.35, "sawtooth", 0.3, 80),
  level: () => [523,659,784,1047].forEach((f,i) => setTimeout(() => tone(f,0.2,"sine",0.2), i*90)),
  combo: (n) => tone(400+n*70, 0.12, "square", 0.18, 800+n*60),
};

// ── CONSTANTS ──
const GROUND_RATIO = 0.82;
let groundY = canvas.height * GROUND_RATIO;
const SCALE = isMobile ? 0.9 : 1.4;

// ── COLORS (Nature Day Theme) ──
const C = {
  sky1:    "#87CEEB",
  sky2:    "#b8e4f9",
  sky3:    "#ddf0fb",
  ground1: "#4a7c2f",
  ground2: "#3a6122",
  dirt1:   "#8B5E3C",
  dirt2:   "#6b4423",
  neon:    "#ffdd00",
  neon2:   "#ff4422",
  gold:    "#ffd700",
  spike:   "#cc2200",
  spikeGl: "#ff4422",
  platform:"#8B5E3C",
  platGl:  "#c8a060",
  coin:    "#ffd700",
  coinGl:  "#ffe066",
  trunk:   "#7a4a1e",
  leaf1:   "#2d8a2d",
  leaf2:   "#3aaa3a",
  leaf3:   "#1a6b1a",
  cloud:   "#ffffff",
  sun:     "#FFD700",
};

// ── OBSTACLE SIZES ──
const OBS = {
  spikeW:  isMobile ? 32 : 55,
  spikeH:  isMobile ? 42 : 75,
  fallerW: isMobile ? 36 : 65,
  fallerH: isMobile ? 36 : 65,
  wallW:   isMobile ? 22 : 38,
  wallHmin:isMobile ? 50 : 95,
  wallHrnd:isMobile ? 28 : 50,
};

// ── STATE ──
let score = 0, lives = 3, level = 1, combo = 0, comboTimer = 0;
let paused = false, gameStarted = false, gameRunning = false;
let invincible = false, invTimer = 0, flashTimer = 0, shakeAmt = 0;
let bestScore = parseInt(localStorage.getItem("charan_hs")) || 0;
document.getElementById("bestScore").innerText = bestScore;

const BASE_SPEED = isMobile ? 5 : 8;
const MAX_SPEED  = isMobile ? 14 : 20;
let spd = BASE_SPEED;

// ── OBJECTS ──
let player, stars, bgObjs;
let obstacles  = [];
let coins      = [];
let platforms  = [];
let particles  = [];
let spawnTimer = 0;
let spawnInterval = 115;

// ── CLOUDS ──
let clouds = [];
function makeClouds() {
  clouds = [];
  for (let i = 0; i < 8; i++) {
    clouds.push({
      x: Math.random() * canvas.width * 2,
      y: 30 + Math.random() * canvas.height * 0.3,
      w: (isMobile ? 60 : 100) + Math.random() * 80,
      h: (isMobile ? 28 : 40) + Math.random() * 20,
      spd: 0.3 + Math.random() * 0.4,
    });
  }
}

// ── TREES (background) ──
let trees = [];
function makeTrees() {
  trees = [];
  let x = 0;
  while (x < canvas.width * 4) {
    const trunkH = (isMobile ? 40 : 100) + Math.random() * (isMobile ? 30 : 80);
    const trunkW = isMobile ? 12 : 28;
    const leafR  = (isMobile ? 28 : 70) + Math.random() * (isMobile ? 18 : 40);
    trees.push({
      x, trunkW, trunkH, leafR,
      layer: Math.random() < 0.4 ? 1 : 2,
      shade: Math.floor(Math.random() * 3),
    });
    x += (isMobile ? 55 : 110) + Math.random() * (isMobile ? 50 : 80);
  }
}

let bgScroll = 0;

// ── INIT PLAYER ──
function initPlayer() {
  groundY = canvas.height * GROUND_RATIO;
  const pw = isMobile ? 110 : 160;
  const ph = isMobile ? 125 : 180;
  player = {
    x:          isMobile ? 20 : 80,
    y:          groundY - ph,
    w:          pw,
    h:          ph,
    dy:         0,
    grounded:   true,
    jumpsLeft:  2,
    jumpPower:  isMobile ? -22 : -26,  // mobile jump much lower
  };
}

// ── PARTICLES ──
function burst(x, y, color, n=10, spread=7) {
  const count = isMobile ? Math.ceil(n * 0.5) : n;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = Math.random() * spread + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 3,
      r:  Math.random() * 7 + 2,
      color,
      life: 1,
      decay: Math.random() * 0.04 + 0.025,
      glow: true,
    });
  }
}

function burstText(x, y, text) {
  particles.push({ type:"text", x, y, vy:-2.5, text, life:1, decay:0.025 });
}

// ── SPAWN OBSTACLES ──
function spawnObstacle() {
  const r = Math.random();
  const baseX = canvas.width + 60;

  if (r < 0.38) {
    const count = (level >= 4 && Math.random() < 0.25) ? 2 : 1;
    for (let i = 0; i < count; i++) {
      obstacles.push({ type:"spike", x: baseX + i*(OBS.spikeW+15), y: groundY, w: OBS.spikeW, h: OBS.spikeH });
    }
  } else if (r < 0.62) {
    if (level >= 2) {
      obstacles.push({ type:"cspike", x: baseX, y: 0, w: OBS.spikeW, h: OBS.spikeH, ceiling: true });
    } else {
      obstacles.push({ type:"spike", x: baseX, y: groundY, w: OBS.spikeW, h: OBS.spikeH });
    }
  } else if (r < 0.78) {
    if (level >= 3) {
      obstacles.push({ type:"faller", x: baseX, y: 0, w: OBS.fallerW, h: OBS.fallerH, dy: 0, triggered: false, triggerX: baseX-200, fallen: false });
    } else {
      obstacles.push({ type:"spike", x: baseX, y: groundY, w: OBS.spikeW, h: OBS.spikeH });
    }
  } else {
    const wh = OBS.wallHmin + Math.random() * OBS.wallHrnd;
    obstacles.push({ type:"wall", x: baseX, y: groundY - wh, w: OBS.wallW, h: wh });
  }
}

function spawnCoin() {
  const ph = player.h;
  const opts = [
    { y: groundY - ph * 1.2 },
    { y: groundY - ph * 1.9 },
    { y: groundY - ph * 2.6 },
  ];
  const o = opts[Math.floor(Math.random() * opts.length)];
  coins.push({
    x: canvas.width + Math.random() * 300 + 100,
    y: o.y,
    r: isMobile ? 13 : 17,
    bob: Math.random() * Math.PI * 2,
    rot: 0,
    glow: 0,
  });
}

// ── COLLISION ──
function rectHit(a, b, margin=14) {
  return (
    a.x + margin < b.x + b.w - margin &&
    a.x + a.w - margin > b.x + margin &&
    a.y + margin < b.y + b.h - margin &&
    a.y + a.h - margin > b.y + margin
  );
}

// ── LEVEL CHECK ──
function checkLevel() {
  const nl = Math.floor(score / 8) + 1;
  if (nl > level) {
    level = nl;
    spawnInterval = Math.max(45, 115 - level * 9);
    showBanner(`LEVEL ${level} 🔥`);
    SFX.level();
    burst(canvas.width/2, canvas.height/2, "#88ff44", 30, 12);
    burst(canvas.width/2, canvas.height/2, C.gold, 20, 10);
  }
}

function showBanner(t) {
  const b = document.getElementById("levelBanner");
  b.textContent = t;
  b.style.opacity = "1";
  b.style.transition = "none";
  setTimeout(() => { b.style.transition = "opacity 1s ease"; b.style.opacity = "0"; }, 1400);
}

// ── COMBO ──
function addCombo() {
  combo++;
  comboTimer = 200;
  if (combo >= 3) {
    const el = document.getElementById("comboPopup");
    el.textContent = `✦ x${combo} COMBO!`;
    el.style.opacity = "1";
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = "0"; }, 900);
    SFX.combo(combo);
    const bonus = Math.floor(combo * 0.5);
    if (bonus > 0) { score += bonus; updateHUD(); burstText(player.x + player.w, player.y, `+${bonus}`); }
  }
}

function updateHUD() {
  document.getElementById("score").innerText    = score;
  document.getElementById("lives").innerText    = lives;
  document.getElementById("levelDisp").innerText = `LVL ${level}`;
}

// ── UPDATE ──
function update() {
  if (!gameRunning || paused) return;

  spd = Math.min(BASE_SPEED + (level - 1) * 1.5, MAX_SPEED);

  // BG scroll
  bgScroll += spd * 0.5;

  // Gravity — laptop floats slow, mobile snappy
  const gravity = isMobile ? 1.1 : 1.2;
  player.dy += gravity;
  player.dy  = Math.min(player.dy, isMobile ? 18 : 22);
  player.y  += player.dy;

  if (player.y + player.h >= groundY) {
    player.y         = groundY - player.h;
    player.dy        = 0;
    player.grounded  = true;
    player.jumpsLeft = 2;
  }

  // Invincibility
  if (invincible) { invTimer--; if (invTimer <= 0) invincible = false; }
  if (flashTimer > 0) flashTimer--;
  if (shakeAmt > 0) shakeAmt -= 0.8;
  if (comboTimer > 0) { comboTimer--; if (comboTimer <= 0) combo = 0; }

  // Move obstacles
  obstacles.forEach(o => {
    if (o.type === "faller") {
      if (!o.triggered && player.x >= o.triggerX) {
        o.triggered = true;
      }
      if (o.triggered && !o.fallen) {
        o.dy += 1.8;
        o.y  += o.dy;
        if (o.y + o.h >= groundY) { o.y = groundY - o.h; o.fallen = true; }
      }
      o.x -= spd;
    } else {
      o.x -= spd;
    }
  });
  obstacles = obstacles.filter(o => o.x + (o.w||50) > -100);

  // Coins
  coins.forEach(c => {
    c.x   -= spd;
    c.bob += 0.07;
    c.rot += 0.06;
    c.glow = (Math.sin(c.rot * 3) + 1) * 0.5;
  });
  coins = coins.filter(c => c.x + c.r > -20);

  // Spawn
  spawnTimer++;
  if (spawnTimer >= spawnInterval) { spawnObstacle(); spawnTimer = 0; }
  if (Math.random() < 0.013) spawnCoin();

  // Particles
  particles.forEach(p => {
    p.x += p.vx || 0;
    p.y += p.vy || 0;
    if (p.vy !== undefined && p.type !== "text") p.vy += 0.25;
    p.life -= p.decay;
  });
  particles = particles.filter(p => p.life > 0);

  // Obstacle collisions
  if (!invincible) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      let ox = o.x, oy = o.y, ow = o.w, oh = o.h;

      // spike — accurate triangle hitbox
      if (o.type === "spike") {
        oy = groundY - oh * 0.75;
        oh = oh * 0.75;
      }
      if (o.type === "cspike") {
        oh = oh * 0.75;
      }

      const box = { x:ox, y:oy, w:ow, h:oh };
      const margin = isMobile ? 6 : 10;  // small margin = accurate hits
      if (rectHit(player, box, margin)) {
        loseLife();
        obstacles.splice(i, 1);
        break;
      }
    }
  }

  // Coin collisions
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    const dist = Math.hypot(player.x + player.w/2 - c.x, player.y + player.h/2 - c.y);
    if (dist < c.r + player.w * 0.4) {
      score++;
      SFX.coin();
      burst(c.x, c.y, C.gold, 12, 6);
      burstText(c.x, c.y - 10, "+1");
      coins.splice(i, 1);
      addCombo();
      checkLevel();
      updateHUD();
    }
  }
}

function loseLife() {
  lives--;
  updateHUD();
  SFX.hurt();
  burst(player.x + player.w/2, player.y + player.h/2, C.neon2, 16, 9);
  flashTimer = 14;
  shakeAmt   = isMobile ? 5 : 12;
  invincible = true;
  invTimer   = 100;
  combo      = 0;
  if (lives <= 0) endGame();
}

// ── DRAW HELPERS ──
function drawGlow(fn, color, blur=20) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur  = isMobile ? Math.min(blur, 8) : blur;
  fn();
  ctx.restore();
}

// Draw spike triangle (up or down)
function drawSpike(x, y, w, h, up=true) {
  const cx = x + w/2;
  ctx.beginPath();
  if (up) {
    ctx.moveTo(x, y);
    ctx.lineTo(cx, y - h);
    ctx.lineTo(x + w, y);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(cx, y + h);
    ctx.lineTo(x + w, y);
  }
  ctx.closePath();
}

// ── DRAW ──
function draw() {
  // Screen shake
  ctx.save();
  if (shakeAmt > 0) {
    ctx.translate(
      (Math.random()-0.5) * shakeAmt,
      (Math.random()-0.5) * shakeAmt
    );
  }

  // ── SKY GRADIENT ──
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0,   "#4fa8d5");
  skyGrad.addColorStop(0.5, "#87CEEB");
  skyGrad.addColorStop(1,   "#c8eaf8");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, groundY);

  // ── SUN ──
  const sunX = canvas.width * 0.85, sunY = canvas.height * 0.12;
  ctx.save();
  ctx.shadowColor = "#FFD700"; ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(sunX, sunY, isMobile ? 28 : 44, 0, Math.PI*2);
  const sunG = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, isMobile ? 28 : 44);
  sunG.addColorStop(0, "#fffbe0");
  sunG.addColorStop(0.5, "#FFD700");
  sunG.addColorStop(1, "#ffaa00");
  ctx.fillStyle = sunG;
  ctx.fill();
  ctx.restore();
  // Sun rays
  ctx.save();
  ctx.strokeStyle = "rgba(255,220,0,0.25)"; ctx.lineWidth = isMobile ? 2 : 3;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + bgScroll * 0.002;
    const r1 = isMobile ? 34 : 52, r2 = isMobile ? 52 : 78;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(angle)*r1, sunY + Math.sin(angle)*r1);
    ctx.lineTo(sunX + Math.cos(angle)*r2, sunY + Math.sin(angle)*r2);
    ctx.stroke();
  }
  ctx.restore();

  // ── CLOUDS ──
  clouds.forEach(cl => {
    const cx = cl.x - (bgScroll * cl.spd * 0.4) % (canvas.width * 2);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.shadowColor = "#fff"; ctx.shadowBlur = 12;
    // fluffy cloud shape
    const cw = cl.w, ch = cl.h;
    ctx.beginPath();
    ctx.ellipse(cx,        cl.y,        cw*0.4, ch*0.6, 0, 0, Math.PI*2);
    ctx.ellipse(cx+cw*0.25,cl.y-ch*0.2, cw*0.3, ch*0.7, 0, 0, Math.PI*2);
    ctx.ellipse(cx+cw*0.5, cl.y,        cw*0.35,ch*0.55,0, 0, Math.PI*2);
    ctx.ellipse(cx+cw*0.75,cl.y+ch*0.05,cw*0.28,ch*0.5, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });

  // ── FAR TREES (layer 1, darker, smaller) ──
  const tOff1 = bgScroll * 0.25;
  ctx.save();
  trees.filter(t => t.layer === 1).forEach(t => {
    const tx = ((t.x - tOff1) % (canvas.width * 4) + canvas.width * 4) % (canvas.width * 4) - 100;
    if (tx > canvas.width + 100) return;
    const scale = 0.65;
    const baseY = groundY;
    // trunk
    ctx.fillStyle = "#5a3510";
    ctx.fillRect(tx - t.trunkW*scale/2, baseY - t.trunkH*scale, t.trunkW*scale, t.trunkH*scale);
    // leaves
    const leafColors = ["#1a5c1a","#226622","#1e6b1e"];
    ctx.fillStyle = leafColors[t.shade];
    ctx.beginPath();
    ctx.arc(tx, baseY - t.trunkH*scale - t.leafR*scale*0.7, t.leafR*scale, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#2a7a2a";
    ctx.beginPath();
    ctx.arc(tx - t.leafR*scale*0.4, baseY - t.trunkH*scale - t.leafR*scale*0.3, t.leafR*scale*0.75, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx + t.leafR*scale*0.4, baseY - t.trunkH*scale - t.leafR*scale*0.3, t.leafR*scale*0.75, 0, Math.PI*2);
    ctx.fill();
  });
  ctx.restore();

  // ── NEAR TREES (layer 2) ──
  const tOff2 = bgScroll * 0.55;
  ctx.save();
  trees.filter(t => t.layer === 2).forEach(t => {
    const tx = ((t.x - tOff2) % (canvas.width * 4) + canvas.width * 4) % (canvas.width * 4) - 100;
    if (tx > canvas.width + 100) return;
    const baseY = groundY;
    // trunk
    ctx.fillStyle = C.trunk;
    ctx.fillRect(tx - t.trunkW/2, baseY - t.trunkH, t.trunkW, t.trunkH);
    // leaves (3 circles for fluffy look)
    const leafColors = [C.leaf1, C.leaf2, C.leaf3];
    ctx.fillStyle = leafColors[t.shade];
    ctx.beginPath();
    ctx.arc(tx, baseY - t.trunkH - t.leafR * 0.7, t.leafR, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = C.leaf2;
    ctx.beginPath();
    ctx.arc(tx - t.leafR*0.5, baseY - t.trunkH - t.leafR*0.3, t.leafR*0.8, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx + t.leafR*0.5, baseY - t.trunkH - t.leafR*0.3, t.leafR*0.8, 0, Math.PI*2);
    ctx.fill();
    // highlight
    ctx.fillStyle = "rgba(100,220,100,0.25)";
    ctx.beginPath();
    ctx.arc(tx - t.leafR*0.2, baseY - t.trunkH - t.leafR*0.9, t.leafR*0.45, 0, Math.PI*2);
    ctx.fill();
  });
  ctx.restore();

  // ── GROUND (grass + dirt) ──
  // Grass top strip
  const grassH = isMobile ? 16 : 22;
  const grassGrad = ctx.createLinearGradient(0, groundY, 0, groundY + grassH);
  grassGrad.addColorStop(0, "#5aad35");
  grassGrad.addColorStop(1, "#3a8520");
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, groundY, canvas.width, grassH);

  // Grass bumps scrolling
  ctx.fillStyle = "#4a9828";
  const bumpW = 22, bumpOff = (bgScroll * 0.8) % (bumpW * 2);
  for (let bx = -bumpW + bumpOff; bx < canvas.width + bumpW; bx += bumpW * 2) {
    ctx.beginPath();
    ctx.ellipse(bx, groundY + 2, bumpW * 0.7, 8, 0, 0, Math.PI*2);
    ctx.fill();
  }

  // Dirt body
  const dirtGrad = ctx.createLinearGradient(0, groundY + grassH, 0, canvas.height);
  dirtGrad.addColorStop(0, "#8B5E3C");
  dirtGrad.addColorStop(0.4, "#6b4423");
  dirtGrad.addColorStop(1, "#4a2e14");
  ctx.fillStyle = dirtGrad;
  ctx.fillRect(0, groundY + grassH, canvas.width, canvas.height - groundY - grassH);

  // Dirt texture dots
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  for (let i = 0; i < 18; i++) {
    const dx = ((i * 73 + bgScroll * 0.6) % canvas.width);
    const dy = groundY + grassH + 8 + (i * 17) % 20;
    ctx.beginPath();
    ctx.arc(dx, dy, 3, 0, Math.PI*2);
    ctx.fill();
  }

  // Grass line shadow
  ctx.strokeStyle = "#2d6b10";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY + grassH);
  ctx.lineTo(canvas.width, groundY + grassH);
  ctx.stroke();

  // ── OBSTACLES ──
  obstacles.forEach(o => {
    ctx.save();
    if (o.type === "spike") {
      // Red thorn spike from ground
      drawGlow(() => {
        ctx.fillStyle = "#cc1100";
        drawSpike(o.x, o.y, o.w, o.h, true);
        ctx.fill();
      }, "#ff3300", 18);
      ctx.fillStyle = "#ff4422";
      drawSpike(o.x+4, o.y-4, o.w-8, o.h*0.6, true);
      ctx.fill();
      // base
      ctx.fillStyle = "#881100";
      ctx.fillRect(o.x, o.y - 4, o.w, 4);

    } else if (o.type === "cspike") {
      // Purple stalactite from ceiling
      drawGlow(() => {
        ctx.fillStyle = "#7700aa";
        drawSpike(o.x, o.y + o.h, o.w, o.h, false);
        ctx.fill();
      }, "#bb44ff", 18);
      ctx.fillStyle = "#aa44ee";
      drawSpike(o.x+4, o.y+o.h-4, o.w-8, o.h*0.55, false);
      ctx.fill();
      ctx.fillStyle = "#550077";
      ctx.fillRect(o.x, o.y, o.w, 4);

    } else if (o.type === "faller") {
      // Rocky boulder falling
      drawGlow(() => {
        ctx.fillStyle = "#665544";
        ctx.beginPath();
        ctx.roundRect(o.x, o.y, o.w, o.h, 8);
        ctx.fill();
      }, "#aa7755", 20);
      ctx.fillStyle = "#887766";
      ctx.beginPath();
      ctx.roundRect(o.x+4, o.y+4, o.w-8, o.h-8, 6);
      ctx.fill();
      // crack lines
      ctx.strokeStyle = "#443322"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x+o.w*0.3, o.y+6); ctx.lineTo(o.x+o.w*0.5, o.y+o.h*0.5);
      ctx.lineTo(o.x+o.w*0.7, o.y+o.h-6); ctx.stroke();
      if (!o.triggered) {
        ctx.fillStyle = "#ff4400"; ctx.font = `bold ${isMobile?13:16}px Orbitron`;
        ctx.textAlign = "center"; ctx.fillText("!", o.x+o.w/2, o.y-8);
      }

    } else if (o.type === "wall") {
      // Wooden log wall
      drawGlow(() => {
        ctx.fillStyle = "#7a4a1e";
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }, "#c8a060", 16);
      ctx.fillStyle = "#9a6a3a";
      ctx.fillRect(o.x+3, o.y+3, o.w-6, o.h-6);
      // wood grain lines
      ctx.strokeStyle = "rgba(60,30,0,0.3)"; ctx.lineWidth = 1.5;
      for (let gy = o.y+8; gy < o.y+o.h-4; gy += 10) {
        ctx.beginPath(); ctx.moveTo(o.x+2, gy); ctx.lineTo(o.x+o.w-2, gy); ctx.stroke();
      }
      // top cap
      ctx.fillStyle = "#c8a060";
      ctx.fillRect(o.x-2, o.y, o.w+4, 5);
    }
    ctx.restore();
  });

  // ── COINS ──
  coins.forEach(c => {
    const cy = c.y + Math.sin(c.bob) * 10;
    ctx.save();
    drawGlow(() => {
      // Outer glow ring
      ctx.beginPath();
      ctx.arc(c.x, cy, c.r + 4, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,215,0,${0.15 + c.glow * 0.15})`;
      ctx.fill();
    }, C.gold, 28);
    // Coin body
    ctx.beginPath();
    ctx.arc(c.x, cy, c.r, 0, Math.PI*2);
    const cg = ctx.createRadialGradient(c.x-c.r*0.3, cy-c.r*0.3, 1, c.x, cy, c.r);
    cg.addColorStop(0, "#fff8a0");
    cg.addColorStop(0.5, C.gold);
    cg.addColorStop(1, "#996600");
    ctx.fillStyle = cg;
    ctx.fill();
    // $ symbol
    ctx.fillStyle = "#7a5000";
    ctx.font = `bold ${c.r * 1.1}px Orbitron`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", c.x, cy + 1);
    ctx.restore();
  });

  // ── PLAYER ──
  const blink = invincible && Math.floor(invTimer / 6) % 2 === 0;
  if (!blink) {
    ctx.save();
    const rx = player.x, ry = player.y, rw = player.w, rh = player.h;
    const radius = isMobile ? 16 : 20;

    // Build rounded rect path helper
    function roundedPath() {
      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx+rw, ry,   rx+rw, ry+radius);
      ctx.lineTo(rx+rw, ry+rh-radius);
      ctx.quadraticCurveTo(rx+rw, ry+rh, rx+rw-radius, ry+rh);
      ctx.lineTo(rx+radius, ry+rh);
      ctx.quadraticCurveTo(rx, ry+rh, rx, ry+rh-radius);
      ctx.lineTo(rx, ry+radius);
      ctx.quadraticCurveTo(rx, ry, rx+radius, ry);
      ctx.closePath();
    }

    // Draw image — square corners, clean, no clip artifacts
    ctx.save();
    if (playerImg.complete && playerImg.naturalWidth > 0) {
      ctx.drawImage(playerImg, rx, ry, rw, rh);
    } else {
      ctx.fillStyle = "#44aa44";
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.restore();

    // Speed lines when in air
    if (!player.grounded) {
      ctx.strokeStyle = "rgba(60,200,60,0.4)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const ly = ry + rh * (0.25 + i * 0.25);
        const len = 14 + i * 6;
        ctx.beginPath();
        ctx.moveTo(rx - 4, ly);
        ctx.lineTo(rx - 4 - len, ly);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ── PARTICLES ──
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    if (p.type === "text") {
      ctx.font = "bold 18px Orbitron";
      ctx.fillStyle = C.gold;
      ctx.textAlign = "center";
      ctx.shadowColor = C.gold;
      ctx.shadowBlur  = 10;
      ctx.fillText(p.text, p.x, p.y);
    } else {
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 12; }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  });

  // ── HURT FLASH ──
  if (flashTimer > 0) {
    ctx.fillStyle = `rgba(255,0,80,${flashTimer/14*0.3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── PAUSED OVERLAY ──
  if (paused) {
    ctx.fillStyle = "rgba(5,1,15,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.shadowColor = C.neon;
    ctx.shadowBlur  = 30;
    ctx.fillStyle   = "#fff";
    ctx.font        = `bold ${isMobile ? 44 : 72}px Bangers, cursive`;
    ctx.textAlign   = "center";
    ctx.fillText("⏸  PAUSED", canvas.width/2, canvas.height/2);
    ctx.restore();
    ctx.font      = `${isMobile ? 13 : 18}px Orbitron`;
    ctx.fillStyle = "#446";
    ctx.textAlign = "center";
    ctx.fillText("PRESS P TO RESUME", canvas.width/2, canvas.height/2 + 52);
    ctx.textAlign = "left";
  }

  ctx.restore(); // end shake
}

// ── LOOP ──
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ── JUMP ──
function jump() {
  if (!gameRunning || paused) return;
  if (player.jumpsLeft > 0) {
    player.dy        = player.jumpPower * (player.jumpsLeft === 1 ? 0.82 : 1);
    player.grounded  = false;
    player.jumpsLeft--;
    SFX.jump();
    burst(player.x + player.w/2, player.y + player.h, "#88ccff", 6, 4);
  }
}

// ── CONTROLS ──
document.addEventListener("touchstart", e => { if (!gameStarted) startGame(); else jump(); });
document.addEventListener("mousedown",  e => { if (!gameStarted) startGame(); else jump(); });
document.addEventListener("keydown", e => {
  if (e.key === " " || e.key === "ArrowUp") { if (!gameStarted) startGame(); else jump(); }
  if ((e.key === "p" || e.key === "P" || e.key === "Escape") && gameStarted) togglePause();
});

// ── START ──
function startGame() {
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("pauseBtn").style.display    = "block";
  gameStarted = true;
  restartGame();
}

// ── PAUSE ──
function togglePause() {
  if (!gameRunning) return;
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "▶" : "⏸";
}

// ── GAME OVER ──
function endGame() {
  gameRunning = false;

  // Play your friend's voice 😄
  gameOverMusic.currentTime = 0;
  gameOverMusic.play().catch(() => {});

  const isNew = score > bestScore;
  if (isNew) {
    bestScore = score;
    localStorage.setItem("charan_hs", bestScore);
    document.getElementById("bestScore").innerText = bestScore;
  }

  document.getElementById("finalScore").innerText      = score;
  document.getElementById("finalBestScore").innerText  = bestScore;
  document.getElementById("newRecord").style.display   = isNew ? "block" : "none";
  document.getElementById("gameOverScreen").classList.add("show");

  // Restart exactly when audio ends
  let restarted = false;
  const doRestart = () => { if (!restarted) { restarted = true; restartGame(); } };
  gameOverMusic.onended = doRestart;
  // Fallback if audio fails to play or duration unknown
  setTimeout(doRestart, (gameOverMusic.duration > 0 ? gameOverMusic.duration : 4) * 1000 + 500);
}

// ── RESTART ──
function restartGame() {
  score = lives = 0; lives = 3; level = 1;
  combo = comboTimer = spawnTimer = flashTimer = invTimer = 0;
  shakeAmt = 0; paused = false; invincible = false;
  spd = BASE_SPEED;
  spawnInterval = 115;
  obstacles = []; coins = []; particles = [];
  bgScroll = 0;

  document.getElementById("gameOverScreen").classList.remove("show");
  document.getElementById("gameOverScreen").style.display = "";
  document.getElementById("pauseBtn").textContent = "⏸";
  document.getElementById("comboPopup").style.opacity = "0";

  updateHUD();
  initPlayer();
  gameRunning = true;
}

// ── STAR INIT FOR START SCREEN ──
(function initStartStars() {
  const container = document.getElementById("stars");
  for (let i = 0; i < 100; i++) {
    const s = document.createElement("div");
    s.className = "star";
    const size = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      --d:${(Math.random()*3+1).toFixed(1)}s;
      animation-delay:${(Math.random()*3).toFixed(1)}s;
    `;
    container.appendChild(s);
  }
})();

// ── BUTTON WIRING ──
document.getElementById("startBtn").addEventListener("click",   startGame);
document.getElementById("pauseBtn").addEventListener("click",   togglePause);
document.getElementById("restartBtn").addEventListener("click", restartGame);

// ── KICK OFF ──
makeClouds();
makeTrees();
initPlayer();
loop();
