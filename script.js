const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* DEVICE */
const isMobile = window.innerWidth < 768;

/* CANVAS SIZE (KEEP SIMPLE) */
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

/* AUDIO */
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

const gameOverMusic = new Audio("assets/gameover.mp3");
gameOverMusic.volume = 0.6;

/* GAME STATE */
let score = 0;
let lives = 1;
let baseSpeed = 6;
let currentSpeed = baseSpeed;
let maxSpeed = 14;
let jumpBoost = 4;
let gameRunning = true;
let canRestart = false;

/* BEST SCORE */
let bestScore = localStorage.getItem("bestScore") || 0;
document.getElementById("bestScore").innerText = bestScore;

/* ===== MOBILE FIXES HERE ===== */

/* SCALE — MOBILE SMALLER */
const SCALE = isMobile ? 1.2 : 1.3;

/* GROUND */
const groundY = canvas.height - (isMobile ? 180 : 90);

/* PLAYER */
let player;
const gravity = isMobile ? 1.6 : 1.5;

/* BACKGROUND */
let bgX = 0;

/* OBJECTS */
let enemies = [];
let coins = [];

/* ENEMY TIMER */
let enemySpawnTimer = 0;
let enemySpawnInterval = 120;

/* INPUT */
document.addEventListener("touchstart", jump);
document.addEventListener("mousedown", jump);
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp" || e.key === " ") jump();
});

/* PLAYER INIT */
function initPlayer() {
  player = {
    // ✅ MOBILE LEFT CORNER
    x: isMobile ? 30 : 120,
    y: groundY - 110 * SCALE,
    w: 110 * SCALE,
    h: 110 * SCALE,
    dy: 0,
    grounded: true,
    jumpPower: -22 * SCALE
  };
}

/* JUMP */
function jump() {
  if (!gameRunning) return;
  if (player.grounded) {
    player.dy = player.jumpPower;
    player.grounded = false;
    jumpSound();
  }
}

/* SPAWN ENEMY */
function spawnEnemy() {
  enemies.push({
    x: canvas.width + 50,
    y: groundY - 80 * SCALE,
    w: 80 * SCALE,
    h: 80 * SCALE
  });
}

/* SPAWN COIN */
function spawnCoin() {
  coins.push({
    x: canvas.width + Math.random() * 600,
    y: groundY - 190 * SCALE,
    size: 45 * SCALE
  });
}

/* COLLISION */
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
  if (!gameRunning) return;

  if (score !== 0 && score % 5 === 0 && currentSpeed < maxSpeed) {
    currentSpeed += 0.01;
  }

  const speed = player.grounded
    ? currentSpeed
    : currentSpeed + jumpBoost;

  bgX -= speed * 0.5;
  if (bgX <= -canvas.width) bgX = 0;

  player.dy += gravity;
  player.y += player.dy;

  if (player.y + player.h >= groundY) {
    player.y = groundY - player.h;
    player.dy = 0;
    player.grounded = true;
  }

  enemies.forEach(e => e.x -= speed);
  enemies = enemies.filter(e => e.x + e.w > 0);

  coins.forEach(c => c.x -= speed);
  coins = coins.filter(c => c.x + c.size > 0);

  enemySpawnTimer++;
  if (enemySpawnTimer >= enemySpawnInterval) {
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  if (Math.random() < 0.01) spawnCoin();

  if (player.grounded) {
    enemies.forEach((enemy, i) => {
      if (rectHit(player, enemy)) {
        lives--;
        document.getElementById("lives").innerText = lives;
        enemies.splice(i, 1);
        if (lives <= 0) endGame();
      }
    });
  }

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
  enemies.forEach(e => ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h));
  coins.forEach(c => ctx.drawImage(coinImg, c.x, c.y, c.size, c.size));
}

/* LOOP */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* GAME OVER */
function endGame() {
  gameRunning = false;
  canRestart = true;
  gameOverMusic.play();

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", bestScore);
  }

  document.getElementById("finalScore").innerText = score;
  document.getElementById("bestScore").innerText = bestScore;
  document.getElementById("gameOverScreen").style.display = "block";
}

/* RESTART */
document.addEventListener("click", () => {
  if (!gameRunning && canRestart) restartGame();
});

function restartGame() {
  score = 0;
  lives = 1;
  currentSpeed = baseSpeed;
  enemies = [];
  coins = [];
  enemySpawnTimer = 0;
  bgX = 0;

  document.getElementById("score").innerText = score;
  document.getElementById("lives").innerText = lives;
  document.getElementById("gameOverScreen").style.display = "none";

  initPlayer();
  gameRunning = true;
}

/* START */
bgImg.onload = () => {
  initPlayer();
  loop();
};
