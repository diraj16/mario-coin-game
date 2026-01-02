const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* DEVICE */
const isMobile = window.innerWidth < 768;
canvas.width = isMobile ? window.innerWidth : 1200;
canvas.height = isMobile ? window.innerHeight * 0.75 : 600;

/* IMAGES */
const bgImg = new Image();
bgImg.src = "assets/background.png";

const playerImg = new Image();
playerImg.src = "assets/player.png";

const enemyImg = new Image();
enemyImg.src = "assets/enemy.png";

const coinImg = new Image();
coinImg.src = "assets/coin.png";

/* SOUND (NO MP3) */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function jumpSound() {
  const o = audioCtx.createOscillator();
  o.type = "square";
  o.frequency.value = 450;
  o.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.15);
}
function coinSound() {
  const o = audioCtx.createOscillator();
  o.type = "triangle";
  o.frequency.value = 1000;
  o.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.1);
}

/* GAME STATE */
let score = 0;
let lives = 3;
let speed = 6;
const SCALE = isMobile ? 2.2 : 1.3;

/* GROUND */
const groundY = canvas.height - (isMobile ? 160 : 120);

/* PLAYER */
let player = {
  x: 120,
  y: groundY - 120 * SCALE,
  w: 120 * SCALE,
  h: 120 * SCALE,
  dy: 0,
  grounded: true,
  jumpPower: -24 * SCALE
};

const gravity = isMobile ? 1.7 : 1.5;

/* BACKGROUND */
let bgX = 0;

/* ENEMIES */
let enemies = [];
let lastEnemyX = canvas.width;

/* COINS */
let coins = [];

/* INPUT */
document.addEventListener("touchstart", jump);
document.addEventListener("mousedown", jump);
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp" || e.key === " ") jump();
});

function jump() {
  if (player.grounded) {
    player.dy = player.jumpPower;
    player.grounded = false;
    jumpSound();
  }
}

/* SPAWN ENEMY (ONE BY ONE) */
function spawnEnemy() {
  const gap = canvas.width * 0.9 + Math.random() * canvas.width * 0.6;

  enemies.push({
    x: lastEnemyX + gap,
    y: groundY - 90 * SCALE,
    w: 90 * SCALE,
    h: 90 * SCALE
  });

  lastEnemyX += gap;
}

/* SPAWN COIN */
function spawnCoin() {
  coins.push({
    x: canvas.width + Math.random() * 600,
    y: groundY - 220 * SCALE,
    size: 55 * SCALE
  });
}

/* UPDATE */
function update() {
  /* BACKGROUND */
  bgX -= speed * 0.5;
  if (bgX <= -canvas.width) bgX = 0;

  /* PLAYER */
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

  if (Math.random() < 0.01) spawnCoin();

  /* ENEMY COLLISION (FINAL FIX 🔥) */
  enemies.forEach((enemy, i) => {
    const playerBottom = player.y + player.h;
    const enemyTop = enemy.y;

    const overlap =
      player.x < enemy.x + enemy.w &&
      player.x + player.w > enemy.x &&
      player.y < enemy.y + enemy.h &&
      playerBottom > enemy.y;

    // ❌ IGNORE collision if player is in air AND above enemy
    if (overlap && !player.grounded && playerBottom < enemyTop + 20) {
      return;
    }

    // ❌ REAL HIT
    if (overlap && player.grounded) {
      lives--;
      document.getElementById("lives").innerText = lives;
      enemies.splice(i, 1);
      if (lives <= 0) gameOver();
    }
  });

  /* COIN COLLISION */
  coins.forEach((coin, i) => {
    if (
      player.x < coin.x + coin.size &&
      player.x + player.w > coin.x &&
      player.y < coin.y + coin.size &&
      player.y + player.h > coin.y
    ) {
      score++;
      document.getElementById("score").innerText = score;
      coinSound();
      coins.splice(i, 1);
    }
  });
}

/* DRAW */
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

/* LOOP */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

/* GAME OVER */
function gameOver() {
  alert("💀 GAME OVER");
  location.reload();
}
