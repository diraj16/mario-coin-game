const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ===== DEVICE & CANVAS ===== */
const isMobile = window.innerWidth < 768;
canvas.width = isMobile ? window.innerWidth : 1200;
canvas.height = isMobile ? window.innerHeight * 0.75 : 600;

/* ===== IMAGES ===== */
const bgImg = new Image();
bgImg.src = "assets/background.png";

const playerImg = new Image();
playerImg.src = "assets/player.png";

const enemyImg = new Image();
enemyImg.src = "assets/enemy.png";

const coinImg = new Image();
coinImg.src = "assets/coin.png";

/* ===== SIMPLE SOUND ENGINE (NO MP3) ===== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playJumpSound() {
  const o = audioCtx.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(420, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.2);
  o.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.2);
}

function playCoinSound() {
  const o = audioCtx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(900, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.12);
  o.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.12);
}

/* ===== GAME STATE ===== */
let score = 0;
let lives = 3;
let speed = 6;

/* ===== SCALE ===== */
const SCALE = isMobile ? 2.2 : 1.3;

/* ===== GROUND ===== */
const groundY = canvas.height - (isMobile ? 160 : 120);

/* ===== PLAYER ===== */
let player = {
  x: 120,
  y: groundY - 120 * SCALE,
  w: 120 * SCALE,
  h: 120 * SCALE,
  dy: 0,
  jumpPower: -22 * SCALE,
  grounded: true
};

const gravity = isMobile ? 1.7 : 1.5;

/* ===== BACKGROUND ===== */
let bgX = 0;

/* ===== ENEMIES ===== */
let enemies = [];
let lastEnemyX = canvas.width;

/* ===== COINS ===== */
let coins = [];

/* ===== INPUT ===== */
document.addEventListener("keydown", e => {
  if ((e.key === "ArrowUp" || e.key === " ") && player.grounded) {
    jump();
  }
});

function jump() {
  if (player.grounded) {
    player.dy = player.jumpPower;
    player.grounded = false;
    playJumpSound();
  }
}

/* ===== SPAWN ENEMY (ONE BY ONE) ===== */
function spawnEnemy() {
  const gap = canvas.width * 0.75 + Math.random() * canvas.width * 0.5;

  enemies.push({
    x: lastEnemyX + gap,
    y: groundY - 100 * SCALE,
    w: 100 * SCALE,
    h: 100 * SCALE,
    hit: false
  });

  lastEnemyX += gap;
}

/* ===== SPAWN COIN ===== */
function spawnCoin() {
  coins.push({
    x: canvas.width + Math.random() * 600,
    y: groundY - 220 * SCALE,
    size: 55 * SCALE
  });
}

/* ===== UPDATE ===== */
function update() {
  /* BACKGROUND */
  bgX -= speed * 0.5;
  if (bgX <= -canvas.width) bgX = 0;

  /* PLAYER PHYSICS */
  player.dy += gravity;
  player.y += player.dy;

  if (player.y + player.h >= groundY) {
    player.y = groundY - player.h;
    player.dy = 0;
    player.grounded = true;
  }

  /* MOVE ENEMIES */
  enemies.forEach(e => e.x -= speed);
  enemies = enemies.filter(e => e.x + e.w > 0);

  /* MOVE COINS */
  coins.forEach(c => c.x -= speed);
  coins = coins.filter(c => c.x + c.size > 0);

  /* SPAWN CONTROL */
  if (
    enemies.length === 0 ||
    enemies[enemies.length - 1].x < canvas.width * 0.6
  ) {
    spawnEnemy();
  }

  if (Math.random() < 0.012) spawnCoin();

  /* COLLISIONS */
  enemies.forEach((enemy, i) => {
    if (checkEnemyCollision(player, enemy)) {
      lives--;
      document.getElementById("lives").innerText = lives;
      enemies.splice(i, 1);

      if (lives <= 0) gameOver();
    }
  });

  coins.forEach((coin, i) => {
    if (rectHit(player, {
      x: coin.x,
      y: coin.y,
      w: coin.size,
      h: coin.size
    })) {
      score++;
      document.getElementById("score").innerText = score;
      playCoinSound();
      coins.splice(i, 1);
    }
  });
}

/* ===== SMART ENEMY COLLISION ===== */
function checkEnemyCollision(player, enemy) {
  const overlap = rectHit(player, enemy);

  if (!overlap) return false;

  const playerBottom = player.y + player.h;
  const enemyTop = enemy.y;

  /* SAFE IF PLAYER IS ABOVE AND FALLING */
  if (player.dy > 0 && playerBottom <= enemyTop + enemy.h * 0.4) {
    return false; // clean jump over enemy
  }

  return true; // real hit
}

/* ===== RECT COLLISION ===== */
function rectHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ===== DRAW ===== */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);

  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  enemies.forEach(e => {
    ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
  });

  coins.forEach(c => {
    ctx.drawImage(coinImg, c.x, c.y, c.size, c.size);
  });
}

/* ===== LOOP ===== */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

/* ===== GAME OVER ===== */
function gameOver() {
  alert("💀 GAME OVER");
  location.reload();
}
