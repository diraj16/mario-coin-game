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
  o.frequency.value = 450;
  o.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.15);
}
function coinSound() {
  const o = audioCtx.createOscillator();
  o.frequency.value = 1000;
  o.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.1);
}

/* GAME STATE */
let score = 0;
let lives = 1;
let baseSpeed = 6;
let currentSpeed = baseSpeed;
let maxSpeed = 14;
let jumpBoost = 5;          // extra speed during jump
const SCALE = isMobile ? 2.2 : 1.3;
let enemySpawnTimer = 0;
let enemySpawnInterval = 120; // ~2 seconds at 60fps


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

/* RECT COLLISION */
function rectHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* UPDATE */
function update() {
  /* PLAYER PHYSICS */
  player.dy += gravity;
  player.y += player.dy;

  if (player.y + player.h >= groundY) {
    player.y = groundY - player.h;
    player.dy = 0;
    player.grounded = true;
  }

  /* SPEED LOGIC 🔥 */
  let currentSpeed = player.grounded
    ? baseSpeed
    : baseSpeed + jumpBoost;

  /* BACKGROUND */
  bgX -= currentSpeed * 0.5;
  if (bgX <= -canvas.width) bgX = 0;

  /* MOVE ENEMIES */
  enemies.forEach(e => e.x -= currentSpeed);
  enemies = enemies.filter(e => e.x + e.w > 0);

  enemySpawnTimer++;

if (enemySpawnTimer >= enemySpawnInterval) {
  spawnEnemy();
  enemySpawnTimer = 0;
}


  /* MOVE COINS */
  coins.forEach(c => c.x -= currentSpeed);
  coins = coins.filter(c => c.x + c.size > 0);

  /* SPAWN CONTROL */
  function spawnEnemy() {
  enemies.push({
    x: canvas.width + 50,
    y: groundY - 90 * SCALE,
    w: 90 * SCALE,
    h: 90 * SCALE
  });
}

  if (Math.random() < 0.01) spawnCoin();

  /* ENEMY COLLISION (GROUND ONLY) */
  if (player.grounded) {
    enemies.forEach((enemy, i) => {
      if (rectHit(player, enemy)) {
        lives--;
        document.getElementById("lives").innerText = lives;
        enemies.splice(i, 1);
        if (lives <= 0) gameOver();
      }
    });
  }

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
      // increase speed every 5 points
if (score % 5 === 0 && currentSpeed < maxSpeed) {
  currentSpeed += 0.5;
}
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
