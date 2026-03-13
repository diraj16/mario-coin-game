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

// ── COLORS ──
const C = {
  bg1:     "#05010f",
  bg2:     "#0d0228",
  ground1: "#1a0a3e",
  ground2: "#2d0e6b",
  neon:    "#00f5ff",
  neon2:   "#ff006e",
  gold:    "#ffd700",
  spike:   "#cc0044",
  spikeGl: "#ff2266",
  platform:"#7b2fff",
  platGl:  "#aa66ff",
  star:    "#ffffff",
  coin:    "#ffd700",
  coinGl:  "#ffe066",
  enemy1:  "#ff006e",
  enemy2:  "#cc0044",
};

// ── STATE ──
let score, lives, level, combo, comboTimer;
let paused, gameStarted, gameRunning;
let invincible, invTimer, flashTimer, shakeAmt;
let bestScore = parseInt(localStorage.getItem("charan_hs")) || 0;
document.getElementById("bestScore").innerText = bestScore;

const BASE_SPEED = isMobile ? 5 : 8;
const MAX_SPEED  = isMobile ? 14 : 20;
let spd;

// ── OBJECTS ──
let player, particles, stars, bgObjs;
let obstacles, coins, platforms;
let spawnTimer, spawnInterval;

// ── STARS (background) ──
function makeStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * groundY * 0.85,
      r: Math.random() * 1.8 + 0.3,
      a: Math.random(),
      da: (Math.random() * 0.008 + 0.002) * (Math.random() < 0.5 ? 1 : -1),
    });
  }
}

// ── BG OBJECTS (neon city silhouette) ──
function makeBgObjs() {
  bgObjs = [];
  let x = 0;
  while (x < canvas.width * 3) {
    const w = 40 + Math.random() * 80;
    const h = 60 + Math.random() * 180;
    bgObjs.push({
      x, y: groundY - h, w, h,
      color: Math.random() < 0.5 ? "#1a0040" : "#100030",
      win: [], // lit windows
    });
    // random windows
    for (let wy = groundY - h + 10; wy < groundY - 10; wy += 18) {
      for (let wx = x + 6; wx < x + w - 6; wx += 14) {
        if (Math.random() < 0.45) {
          bgObjs[bgObjs.length-1].win.push({
            x: wx, y: wy,
            color: Math.random() < 0.5 ? "#00f5ff" : (Math.random() < 0.5 ? "#ffd700" : "#ff006e"),
            on: Math.random() < 0.7,
          });
        }
      }
    }
    x += w + 4 + Math.random() * 10;
  }
}

let bgScroll = 0;

// ── INIT PLAYER ──
function initPlayer() {
  groundY = canvas.height * GROUND_RATIO;
  player = {
    x: isMobile ? 50 : 130,
    y: groundY - 90 * SCALE,
    w: 72 * SCALE,
    h: 90 * SCALE,
    dy: 0,
    grounded: true,
    jumpsLeft: 2,
    jumpPower: -20 * SCALE,
  };
}

// ── PARTICLES ──
function burst(x, y, color, n=10, spread=7) {
  for (let i = 0; i < n; i++) {
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
    // Ground spikes (1–3)
    const count = level < 3 ? 1 : (Math.random() < 0.4 ? 2 : 1);
    for (let i = 0; i < count; i++) {
      obstacles.push({
        type: "spike",
        x: baseX + i * 55,
        y: groundY,
        w: 40, h: 55,
      });
    }
  } else if (r < 0.62) {
    // Ceiling spikes (at higher levels)
    if (level >= 2) {
      obstacles.push({
        type: "cspike",
        x: baseX,
        y: 0,
        w: 40, h: 55,
        ceiling: true,
      });
    } else {
      // fallback: ground spike
      obstacles.push({ type:"spike", x:baseX, y:groundY, w:40, h:55 });
    }
  } else if (r < 0.78) {
    // Falling block (drops from above when player near)
    if (level >= 3) {
      obstacles.push({
        type: "faller",
        x: baseX,
        y: 0,
        w: 50, h: 50,
        dy: 0,
        triggered: false,
        triggerX: baseX - 200,
        fallen: false,
      });
    } else {
      obstacles.push({ type:"spike", x:baseX, y:groundY, w:40, h:55 });
    }
  } else {
    // Wall (jump over)
    obstacles.push({
      type: "wall",
      x: baseX,
      y: groundY - 70 - Math.random() * 40,
      w: 28,
      h: 70 + Math.random() * 40,
    });
  }
}

function spawnCoin() {
  const opts = [
    { y: groundY - player.h * 1.3 },
    { y: groundY - player.h * 2.0 },
    { y: groundY - player.h * 2.8 },
  ];
  const o = opts[Math.floor(Math.random() * opts.length)];
  coins.push({
    x: canvas.width + Math.random() * 300 + 100,
    y: o.y,
    r: 14 * SCALE,
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
    burst(canvas.width/2, canvas.height/2, C.neon, 30, 12);
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

  spd = Math.min(BASE_SPEED + (level - 1) * 1.8, MAX_SPEED);

  // BG scroll
  bgScroll = (bgScroll + spd * 0.3) % (canvas.width * 3);

  // Stars twinkle
  stars.forEach(s => {
    s.a += s.da;
    if (s.a > 1 || s.a < 0.1) s.da *= -1;
  });

  // Gravity
  const gravity = isMobile ? 1.55 : 1.5;
  player.dy += gravity;
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

      // spike hit box
      if (o.type === "spike") {
        // triangle — use tighter box
        oy = groundY - oh * 0.7;
        oh = oh * 0.7;
      }
      if (o.type === "cspike") {
        oh = oh * 0.7;
      }

      const box = { x:ox, y:oy, w:ow, h:oh };
      if (rectHit(player, box, 16)) {
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
  shakeAmt   = 12;
  invincible = true;
  invTimer   = 100;
  combo      = 0;
  if (lives <= 0) endGame();
}

// ── DRAW HELPERS ──
function drawGlow(fn, color, blur=20) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur  = blur;
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

  // ── SKY ──
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, "#05010f");
  skyGrad.addColorStop(0.6, "#0d0228");
  skyGrad.addColorStop(1, "#1a0040");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, groundY);

  // ── STARS ──
  stars.forEach(s => {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // ── CITY SILHOUETTE ──
  const bOff = bgScroll % (canvas.width * 3);
  ctx.save();
  ctx.translate(-bOff, 0);
  bgObjs.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // windows
    b.win.forEach(w => {
      if (!w.on) return;
      ctx.globalAlpha = 0.7 + Math.random() * 0.05;
      ctx.fillStyle   = w.color;
      ctx.shadowColor = w.color;
      ctx.shadowBlur  = 6;
      ctx.fillRect(w.x, w.y, 8, 10);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
  });
  ctx.restore();

  // ── GROUND ──
  const gGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
  gGrad.addColorStop(0, "#2d0e6b");
  gGrad.addColorStop(0.3, "#1a0a3e");
  gGrad.addColorStop(1, "#0a0020");
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  // Ground glow line
  drawGlow(() => {
    ctx.strokeStyle = C.neon;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
  }, C.neon, 18);

  // Ground grid lines
  ctx.strokeStyle = "rgba(0,245,255,0.06)";
  ctx.lineWidth = 1;
  const gridW = 80;
  for (let gx = (-bgScroll * 0.5) % gridW; gx < canvas.width; gx += gridW) {
    ctx.beginPath();
    ctx.moveTo(gx, groundY);
    ctx.lineTo(gx - 40, canvas.height);
    ctx.stroke();
  }

  // ── OBSTACLES ──
  obstacles.forEach(o => {
    ctx.save();
    if (o.type === "spike") {
      // Red spike up from ground
      drawGlow(() => {
        ctx.fillStyle = C.spike;
        drawSpike(o.x, o.y, o.w, o.h, true);
        ctx.fill();
      }, C.spikeGl, 22);
      // Inner lighter core
      ctx.fillStyle = "#ff4488";
      drawSpike(o.x + 6, o.y - 6, o.w - 12, o.h * 0.6, true);
      ctx.fill();

    } else if (o.type === "cspike") {
      // Spike hanging from ceiling
      drawGlow(() => {
        ctx.fillStyle = "#aa00cc";
        drawSpike(o.x, o.y + o.h, o.w, o.h, false);
        ctx.fill();
      }, "#cc44ff", 22);
      ctx.fillStyle = "#dd66ff";
      drawSpike(o.x + 6, o.y + o.h - 4, o.w - 12, o.h * 0.55, false);
      ctx.fill();

    } else if (o.type === "faller") {
      // Falling electric block
      drawGlow(() => {
        ctx.fillStyle = "#4400aa";
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }, "#aa44ff", 24);
      // inner glow
      ctx.fillStyle = "#7722ee";
      ctx.fillRect(o.x+5, o.y+5, o.w-10, o.h-10);
      // lightning pattern
      ctx.strokeStyle = "#dd99ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x+o.w*0.3, o.y+4);
      ctx.lineTo(o.x+o.w*0.5, o.y+o.h*0.4);
      ctx.lineTo(o.x+o.w*0.7, o.y+o.h*0.4);
      ctx.lineTo(o.x+o.w*0.4, o.y+o.h-4);
      ctx.stroke();
      // warning if not triggered
      if (!o.triggered) {
        ctx.fillStyle = "#ffdd00";
        ctx.font = "bold 16px Orbitron";
        ctx.textAlign = "center";
        ctx.fillText("!", o.x+o.w/2, o.y-8);
      }

    } else if (o.type === "wall") {
      // Neon wall
      drawGlow(() => {
        ctx.fillStyle = "#330088";
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }, C.platform, 20);
      ctx.fillStyle = "#5511bb";
      ctx.fillRect(o.x+3, o.y+3, o.w-6, o.h-6);
      // top edge glow
      drawGlow(() => {
        ctx.fillStyle = C.platGl;
        ctx.fillRect(o.x, o.y, o.w, 4);
      }, C.platGl, 14);
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

    // Player glow aura
    drawGlow(() => {
      ctx.beginPath();
      ctx.ellipse(
        player.x + player.w/2,
        player.y + player.h - 6,
        player.w * 0.45,
        player.h * 0.12,
        0, 0, Math.PI*2
      );
      ctx.fillStyle = `rgba(0,245,255,0.25)`;
      ctx.fill();
    }, C.neon, 20);

    // Player photo
    if (playerImg.complete && playerImg.naturalWidth > 0) {
      // Rounded clip for photo
      ctx.save();
      ctx.beginPath();
      const rx = player.x, ry = player.y, rw = player.w, rh = player.h;
      const radius = 14;
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx+rw, ry, rx+rw, ry+radius);
      ctx.lineTo(rx+rw, ry+rh-radius);
      ctx.quadraticCurveTo(rx+rw, ry+rh, rx+rw-radius, ry+rh);
      ctx.lineTo(rx+radius, ry+rh);
      ctx.quadraticCurveTo(rx, ry+rh, rx, ry+rh-radius);
      ctx.lineTo(rx, ry+radius);
      ctx.quadraticCurveTo(rx, ry, rx+radius, ry);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(playerImg, rx, ry, rw, rh);
      ctx.restore();

      // Neon border around player
      drawGlow(() => {
        ctx.strokeStyle = C.neon;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx+rw, ry, rx+rw, ry+radius);
        ctx.lineTo(rx+rw, ry+rh-radius);
        ctx.quadraticCurveTo(rx+rw, ry+rh, rx+rw-radius, ry+rh);
        ctx.lineTo(rx+radius, ry+rh);
        ctx.quadraticCurveTo(rx, ry+rh, rx, ry+rh-radius);
        ctx.lineTo(rx, ry+radius);
        ctx.quadraticCurveTo(rx, ry, rx+radius, ry);
        ctx.closePath();
        ctx.stroke();
      }, C.neon, 14);

    } else {
      // Fallback: draw a cool character shape
      drawGlow(() => {
        ctx.fillStyle = C.neon;
        ctx.fillRect(player.x, player.y, player.w, player.h);
      }, C.neon, 20);
    }

    // Jump VFX
    if (!player.grounded) {
      // Speed lines
      ctx.strokeStyle = `rgba(0,245,255,0.35)`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const ly = player.y + player.h * (0.2 + i * 0.2);
        const len = 20 + i * 8;
        ctx.beginPath();
        ctx.moveTo(player.x - 5, ly);
        ctx.lineTo(player.x - 5 - len, ly);
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

  setTimeout(restartGame, (gameOverMusic.duration || 3.5) * 1000 + 600);
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
makeStars();
makeBgObjs();
initPlayer();
loop();
