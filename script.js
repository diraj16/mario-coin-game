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
  x: 100,
  y: groundY - 120 * SCALE,
  w: 120 * SCALE,
  h: 120 * SCALE,
  dy: 0,
  jumpPower: -22 * SCALE,   // ⬆️ increased jump height
  grounded: true
};

const gravity = isMobile ? 1.7 : 1.5;

/* ===== BACKGROUND SCROLL ===== */
let bgX = 0;

/* ===== ENEMIES ===== */
let enemies = [];
let lastEnemyX = canvas.width;

/* ===== COINS ===== */
let coins = [];

/* ===== INPUT ===== */
document.addEventListener("keydown", e => {
  if ((e.key === "ArrowUp" || e.key === " ") && player.grounded) jump();
});

function jump() {
  if (player.grounded) {
    player.dy = player.jumpPower;
    player.grounded = false;
  }
}

/* ===== SPAWN ENEMY (ONE AFTER ANOTHER) ===== */
function spawnEnemy() {
  const gap = canvas.width * 0.7 + Math.random() * canvas.width * 0.5;

  enemies.push({
    x: lastEnemyX + gap,
    y: groundY - 100 * SCALE,
    w: 100 * SCALE,
    h: 100 * SCALE
  });

  lastEnemyX = lastEnemyX + gap;
}

/* ===== SPAWN COIN ===== */
function spawnCoin() {
  coins.push({
    x: canvas.width + Math.random() * 600,
    y: groundY - 200 * SCALE,
    size: 55 * SCALE
  });
}

/* ===== COLLISION LOGIC (DINO STYLE) ===== */
function hitEnemy(player, enemy) {
  const overlap =
    player.x < enemy.x + enemy.w &&
    player.x + player.w > enemy.x &&
    player.y < enemy.y + enemy.h &&
    player.y + player.h > enemy.y;

  // SAFE when jumping above enemy
  if (
    overlap &&
    player.dy > 0 &&
    player.y + player.h < enemy.y + enemy.h / 2
  ) {
    return false;
  }

  return overlap;
}

/* ===== UPDATE ===== */
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

  /* ENEMY MOVE */
  enemies.forEach(e => e.x -= speed);
  enemies = enemies.filter(e => e.x + e.w > 0);

  /* COIN MOVE */
  coins.forEach(c => c.x -= speed);
  coins = coins.filter(c => c.x + c.size > 0);

  /* ENEMY SPAWN CONTROL */
  if (
    enemies.length === 0 ||
    enemies[enemies.length - 1].x < canvas.width * 0.6
  ) {
    spawnEnemy();
  }

  /* COIN SPAWN */
  if (Math.random() < 0.01) spawnCoin();

  /* COLLISIONS */
  enemies.forEach(enemy => {
    if (hitEnemy(player, enemy)) {
      lives--;
      document.getElementById("lives").innerText = lives;
      enemies = [];
      player.y = groundY - player.h;
      player.dy = 0;

      if (lives <= 0) gameOver();
    }
  });

  coins.forEach((c, i) => {
    if (
      player.x < c.x + c.size &&
      player.x + player.w > c.x &&
      player.y < c.y + c.size &&
      player.y + player.h > c.y
    ) {
      score++;
      document.getElementById("score").innerText = score;
      coins.splice(i, 1);
    }
  });
}

/* ===== DRAW ===== */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background loop
  ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);

  // player
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  // enemies
  enemies.forEach(e => {
    ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
  });

  // coins
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
