const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ── DEVICE ── */
const isMobile = window.innerWidth < 768;

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

/* ── IMAGES ── */
const bgImg     = new Image(); bgImg.src     = "assets/background.png";
const playerImg = new Image(); playerImg.src = "assets/player.png";
const enemyImg  = new Image(); enemyImg.src  = "assets/enemy.png";
const coinImg   = new Image(); coinImg.src   = "assets/coin.png";

/* ── AUDIO ── */
let audioCtx;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, dur, type = "sine", gain = 0.3) {
  try {
    const ac = getAudio();
    const o  = ac.createOscillator();
    const g  = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, ac.currentTime + dur * 0.5);
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  } catch(e) {}
}

function jumpSound()   { playTone(380, 0.15, "square", 0.2); }
function coinSound()   { playTone(900, 0.12, "sine", 0.25); playTone(1200, 0.1, "sine", 0.2); }
function hurtSound()   { playTone(150, 0.3, "sawtooth", 0.3); }
function levelSound()  { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.2, "sine", 0.25), i * 100)); }
function comboSound(n) { playTone(400 + n * 80, 0.15, "square", 0.2); }

const gameOverMusic = new Audio("assets/gameover.mp3");
gameOverMusic.volume = 0.6;

/* ── STATE ── */
let score       = 0;
let lives       = 3;
let level       = 1;
let combo       = 0;
let comboTimer  = 0;
let paused      = false;
let gameStarted = false;
let gameRunning = false;
let invincible  = false;
let invTimer    = 0;
let flashTimer  = 0;
let bestScore   = parseInt(localStorage.getItem("highScore")) || 0;

document.getElementById("bestScore").innerText = bestScore;

const BASE_SPEED = isMobile ? 6 : 9;
const MAX_SPEED  = isMobile ? 16 : 22;
let currentSpeed = BASE_SPEED;

const SCALE        = isMobile ? 1.1 : 1.7;
const GROUND_RATIO = 0.8;
let groundY;

/* ── PARTICLES ── */
let particles = [];

function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * -8 - 2,
      r:  Math.random() * 8 + 3,
      color,
      life: 1,
      decay: Math.random() * 0.04 + 0.03
    });
  }
}

/* ── PLAYER ── */
let player;
const gravity = isMobile ? 1.6 : 1.5;

function initPlayer() {
  groundY = canvas.height * GROUND_RATIO;
  player = {
    x:          isMobile ? 20 : 120,
    y:          groundY - (isMobile ? 110 : 150) * SCALE,
    w:          110 * SCALE,
    h:          110 * SCALE,
    dy:         0,
    grounded:   true,
    jumpsLeft:  2,
    jumpPower:  -22 * SCALE,
    trail:      []
  };
}

/* ── BACKGROUND ── */
let bgX = 0;

/* ── OBJECTS ── */
let enemies = [];
let coins   = [];
let enemySpawnTimer    = 0;
let enemySpawnInterval = 120;

/* ── INPUT ── */
document.addEventListener("touchstart", handleJump);
document.addEventListener("mousedown",  handleJump);
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp" || e.key === " ") handleJump();
  if (e.key === "p" || e.key === "P" || e.key === "Escape") togglePause();
});

function handleJump() {
  if (!gameStarted) { startGame(); return; }
  jump();
}

/* ── START ── */
function startGame() {
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("pauseBtn").style.display    = "block";
  gameStarted = true;
  restartGame();
}

/* ── JUMP ── */
function jump() {
  if (!gameRunning || paused) return;
  if (player.jumpsLeft > 0) {
    player.dy       = player.jumpPower * (player.jumpsLeft === 1 ? 0.85 : 1);
    player.grounded = false;
    player.jumpsLeft--;
    jumpSound();
    spawnParticles(player.x + player.w / 2, player.y + player.h, "#88f", 5);
  }
}

/* ── SPAWN ── */
function spawnEnemy() {
  const count = (level >= 4 && Math.random() < 0.25) ? 2 : 1;
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: canvas.width + 50 + i * 120,
      y: groundY - 80 * SCALE,
      w: 80 * SCALE,
      h: 80 * SCALE
    });
  }
}

function spawnCoin() {
  const heights = [1.5, 2.0, 2.5];
  const h = heights[Math.floor(Math.random() * heights.length)];
  coins.push({
    x:    canvas.width + Math.random() * 400,
    y:    groundY - h * player.h,
    size: 45 * SCALE,
    bob:  Math.random() * Math.PI * 2
  });
}

/* ── COLLISION ── */
function hit(a, b) {
  const margin = 20;
  return (
    a.x + margin < b.x + b.w - margin &&
    a.x + a.w - margin > b.x + margin &&
    a.y + margin < b.y + b.h - margin &&
    a.y + a.h - margin > b.y + margin
  );
}

/* ── LEVEL UP ── */
function checkLevel() {
  const newLevel = Math.floor(score / 10) + 1;
  if (newLevel > level) {
    level = newLevel;
    enemySpawnInterval = Math.max(50, 120 - level * 8);
    showLevelBanner(`LEVEL ${level}! 🔥`);
    levelSound();
    spawnParticles(canvas.width / 2, canvas.height / 2, "#ffd700", 20);
  }
}

function showLevelBanner(text) {
  const b = document.getElementById("levelBanner");
  b.textContent = text;
  b.style.opacity = "1";
  b.style.transition = "none";
  setTimeout(() => {
    b.style.transition = "opacity 0.8s ease";
    b.style.opacity    = "0";
  }, 1200);
}

/* ── COMBO ── */
function addCombo() {
  combo++;
  comboTimer = 180;
  if (combo >= 3) {
    showCombo(`x${combo} COMBO!`);
    comboSound(combo);
    score += Math.floor(combo * 0.5);
    document.getElementById("score").innerText = score;
  }
}

function showCombo(text) {
  const el = document.getElementById("comboPopup");
  el.textContent = text;
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = "0"; }, 800);
}

/* ── UPDATE ── */
function update() {
  if (!gameRunning || paused) return;

  currentSpeed = Math.min(BASE_SPEED + level * 1.5, MAX_SPEED);

  bgX -= currentSpeed * 0.5;
  if (bgX <= -canvas.width) bgX = 0;

  player.trail.push({ x: player.x + player.w / 2, y: player.y + player.h / 2 });
  if (player.trail.length > 8) player.trail.shift();

  player.dy += gravity;
  player.y  += player.dy;

  if (player.y + player.h >= groundY) {
    player.y         = groundY - player.h;
    player.dy        = 0;
    player.grounded  = true;
    player.jumpsLeft = 2;
  }

  if (invincible) { invTimer--; if (invTimer <= 0) invincible = false; }
  if (flashTimer > 0) flashTimer--;
  if (comboTimer > 0) { comboTimer--; if (comboTimer <= 0) combo = 0; }

  enemies.forEach(e => e.x -= currentSpeed);
  enemies = enemies.filter(e => e.x + e.w > 0);

  coins.forEach(c => {
    c.x   -= currentSpeed;
    c.bob += 0.08;
    c.y   += Math.sin(c.bob) * 0.8;
  });
  coins = coins.filter(c => c.x + c.size > 0);

  enemySpawnTimer++;
  if (enemySpawnTimer >= enemySpawnInterval) {
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  if (Math.random() < 0.012) spawnCoin();

  particles.forEach(p => {
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += 0.3;
    p.life -= p.decay;
  });
  particles = particles.filter(p => p.life > 0);

  if (!invincible) {
    enemies.forEach((e, i) => {
      if (hit(player, e)) {
        lives--;
        document.getElementById("lives").innerText = lives;
        enemies.splice(i, 1);
        hurtSound();
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, "#f44", 12);
        flashTimer = 10;
        invincible = true;
        invTimer   = 90;
        combo      = 0;
        if (lives <= 0) endGame();
      }
    });
  }

  coins.forEach((c, i) => {
    if (
      player.x < c.x + c.size &&
      player.x + player.w > c.x &&
      player.y < c.y + c.size &&
      player.y + player.h > c.y
    ) {
      score++;
      document.getElementById("score").innerText = score;
      coinSound();
      spawnParticles(c.x + c.size / 2, c.y + c.size / 2, "#ffd700", 10);
      coins.splice(i, 1);
      addCombo();
      checkLevel();
    }
  });
}

/* ── DRAW ── */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bgImg, bgX,                0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);

  if (flashTimer > 0) {
    ctx.fillStyle = `rgba(255,0,0,${flashTimer / 10 * 0.35})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  player.trail.forEach((pt, i) => {
    ctx.save();
    ctx.globalAlpha = (i / player.trail.length) * 0.2;
    ctx.drawImage(playerImg, pt.x - player.w / 2, pt.y - player.h / 2, player.w, player.h);
    ctx.restore();
  });

  const showPlayer = !invincible || Math.floor(invTimer / 6) % 2 === 0;
  if (showPlayer) {
    ctx.save();
    if (!player.grounded) {
      ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
      ctx.rotate(player.dy * 0.01);
      ctx.drawImage(playerImg, -player.w / 2, -player.h / 2, player.w, player.h);
    } else {
      ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
    }
    ctx.restore();
  }

  enemies.forEach(e => {
    ctx.save();
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur  = 15;
    ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
    ctx.restore();
  });

  coins.forEach(c => {
    ctx.save();
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur  = 20;
    ctx.drawImage(coinImg, c.x, c.y, c.size, c.size);
    ctx.restore();
  });

  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvas.width, groundY);
  ctx.stroke();

  if (paused) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font      = `bold ${isMobile ? 40 : 64}px Bangers, cursive`;
    ctx.textAlign = "center";
    ctx.fillText("⏸  PAUSED", canvas.width / 2, canvas.height / 2);
    ctx.font      = `${isMobile ? 16 : 20}px Nunito, sans-serif`;
    ctx.fillStyle = "#aaa";
    ctx.fillText("Press P or ESC to resume", canvas.width / 2, canvas.height / 2 + 50);
    ctx.textAlign = "left";
  }
}

/* ── LOOP ── */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ── PAUSE ── */
function togglePause() {
  if (!gameRunning) return;
  paused = !paused;
  document.getElementById("pauseBtn").textContent = paused ? "▶" : "⏸";
}

/* ── GAME OVER ── */
function endGame() {
  gameRunning = false;

  gameOverMusic.currentTime = 0;
  gameOverMusic.play().catch(() => {});

  const isNewRecord = score > bestScore;
  if (isNewRecord) {
    bestScore = score;
    localStorage.setItem("highScore", bestScore);
    document.getElementById("bestScore").innerText = bestScore;
  }

  document.getElementById("finalScore").innerText     = score;
  document.getElementById("finalBestScore").innerText = bestScore;
  document.getElementById("newRecord").style.display  = isNewRecord ? "block" : "none";

  const go = document.getElementById("gameOverScreen");
  go.classList.add("show");

  setTimeout(restartGame, (gameOverMusic.duration || 3) * 1000 + 500);
}

/* ── RESTART ── */
function restartGame() {
  score        = 0;
  lives        = 3;
  level        = 1;
  combo        = 0;
  comboTimer   = 0;
  paused       = false;
  invincible   = false;
  invTimer     = 0;
  flashTimer   = 0;
  currentSpeed = BASE_SPEED;
  enemies      = [];
  coins        = [];
  particles    = [];
  enemySpawnTimer    = 0;
  enemySpawnInterval = 120;
  bgX          = 0;

  document.getElementById("score").innerText  = 0;
  document.getElementById("lives").innerText  = 3;
  document.getElementById("gameOverScreen").classList.remove("show");
  document.getElementById("gameOverScreen").style.display = "";
  document.getElementById("pauseBtn").textContent = "⏸";

  initPlayer();
  gameRunning = true;
}

/* ── BUTTON WIRING ── */
document.getElementById("startBtn").addEventListener("click",   startGame);
document.getElementById("pauseBtn").addEventListener("click",   togglePause);
document.getElementById("restartBtn").addEventListener("click", restartGame);

/* ── KICK OFF ── */
bgImg.onload = () => {
  initPlayer();
  loop();
};
