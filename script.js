const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ===============================
   DEVICE DETECTION
================================ */
const isMobile = window.innerWidth < 768;

/* ===============================
   CANVAS SIZE (IMPORTANT PART)
================================ */
function resizeCanvas() {
  if (isMobile) {
    // MOBILE → fixed comfortable size (like before)
    canvas.width = 360;
    canvas.height = 640;
  } else {
    // DESKTOP → fullscreen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* ===============================
   IMAGES
================================ */
const bgImg = new Image();
bgImg.src = "assets/background.png";

const playerImg = new Image();
playerImg.src = "assets/player.png";

const enemyImg = new Image();
enemyImg.src = "assets/enemy.png";

const coinImg = new Image();
coinImg.src = "assets/coin.png";

/* ===============================
   AUDIO
================================ */
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

/* ===============================
   GAME STATE
================================ */
let score = 0;
let lives = 1;

let baseSpeed = 6;
let currentSpeed = baseSpeed;
let maxSpeed = 14;
let jumpBoost = 5;

let gameRunning = true;
let canRestart = false;

/* BEST SCORE */
let bestScore = localStorage.getItem("bestScore") || 0;
document.getElementById("bestScore").innerText = bestScore;

/* ===============================
   SCALE & GROUND
================================ */
const BASE_HEIGHT = 640;

function getScale() {
  return Math.min(canvas.height / BASE_HEIGHT, 1.4);
}

function getGroundY() {
  return canvas.height * 0.8;
}

/* ===============================
   PLAYER
================================ */
let player;
const gravity = 1.6;

function initPlayer() {
  const SCALE = getScale();
  const PLAYER_BASE = 140;

  player = {
    x: isMobile ? 70 : canvas.width * 0.15,
    y: getGroundY() - PLAYER_BASE * SCALE,
    w: PLAYER_BASE * SCALE,
    h: PLAYER_BASE * SCALE,
    dy: 0,
    grounded: true,
    jumpPower: -26 * SCALE
  };
}

/* ===============================
   BACKGROUND
================================ */
let bgX = 0;

/* ===============================
   OBJECTS
================================ */
let enemies = [];
let coins = [];

/* ===============================
   ENEMY TIMER
================================ */
let enemySpawnTimer = 0;
let enemySpawnInterval = isMobile ? 140 : 120;

/* ===============================
   INPUT
================================ */
document.addEventListener("touchstart", jump);
document.addEventListener("mousedown", jump);
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp" || e.key === " ") jump();
});

function jump() {
  if (!gameRunning) return;
  if (player.grounded) {
    player.dy = player.jumpPower;
    player.grounded = false;
    jumpSound();
  }
}

/* ===============================
   SPAWN FUNCTIONS
================================ */
function spawnEnemy() {
  const SCALE = getScale();
  const ENEMY_BASE = 90;

  enemies.push({
    x: canvas.width + 50,
    y: getGroundY() - ENEMY_BASE * SCALE,
    w: ENEMY_BASE * SCALE,
    h: ENEMY_BASE * SCALE
  });
}

function spawnCoin() {
  const SCALE = getScale();
  const COIN_BASE = 55;

  coins.push({
    x: canvas.width + Math.random() * 600,
    y: getGroundY() - 220 * SCALE,
    size: COIN_BASE * SCALE
  });
}

/* ===============================
   COLLISION
================================ */
function rectHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ===============================
   UPDATE
================================ */
function update() {
  if (!gameRunning) return;

  if (score !== 0 && score % 5 === 0 && currentSpeed < maxSpeed) {
    currentSpeed += 0.01;
  }

  const effectiveSpeed = player.grounded
    ? currentSpeed
    : currentSpeed + jumpBoost;

  bgX -= effectiveSpeed * 0.5;
  if (bgX <= -canvas.width) bgX = 0;

  player.dy += gravity;
  player.y += player.dy;

  if (player.y + player.h >= getGroundY()) {
    player.y = getGroundY() - player.h;
    player.dy = 0;
    player.grounded = true;
  }

  enemies.forEach(e => (e.x -= effectiveSpeed));
  enemies = enemies.filter(e => e.x + e.w > 0);

  coins.forEach(c => (c.x -= effectiveSpeed));
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

/* ===============================
   DRAW
================================ */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);

  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  enemies.forEach(e => ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h));
  coins.forEach(c => ctx.drawImage(coinImg, c.x, c.y, c.size, c.size));
}

/* ===============================
   LOOP
================================ */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ===============================
   GAME OVER
================================ */
function endGame() {
  gameRunning = false;
  canRestart = false;

  gameOverMusic.currentTime = 0;
  gameOverMusic.play();

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", bestScore);
  }

  document.getElementById("finalScore").innerText = score;
  document.getElementById("bestScore").innerText = bestScore;
  document.getElementById("gameOverScreen").style.display = "block";

  gameOverMusic.onended = () => {
    canRestart = true;
  };
}

/* ===============================
   RESTART
================================ */
function restartGame() {
  if (!canRestart) return;

  gameOverMusic.pause();
  gameOverMusic.currentTime = 0;

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

/* TAP / CLICK / KEY TO RESTART */
document.addEventListener("touchstart", handleRestart);
document.addEventListener("mousedown", handleRestart);
document.addEventListener("keydown", handleRestart);

function handleRestart() {
  if (!gameRunning && canRestart) restartGame();
}

/* ===============================
   START GAME
================================ */
bgImg.onload = () => {
  initPlayer();
  loop();
};
