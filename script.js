const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 140;

/* GAME STATE */
let score = 0;
let lives = 3;
let gameRunning = false;

/* SCALE FOR MOBILE */
const SCALE = window.innerWidth < 600 ? 1.4 : 1;

/* IMAGES */
const bg = new Image();
bg.src = "assets/background.png";

const playerImg = new Image();
playerImg.src = "assets/player.png";

const coinImg = new Image();
coinImg.src = "assets/coin.png";

const enemyImg = new Image();
enemyImg.src = "assets/enemy.png";

const bossImg = new Image();
bossImg.src = "assets/boss.png";

/* SIMPLE AUDIO ENGINE */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq, time) {
  const o = audioCtx.createOscillator();
  o.frequency.value = freq;
  o.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + time);
}

/* PLAYER WITH SPRITE ANIMATION */
let player = {
  x: 100,
  y: canvas.height - 240,
  w: 90 * SCALE,
  h: 90 * SCALE,
  dx: 0,
  dy: 0,
  speed: 7 * SCALE,
  jump: -20 * SCALE,
  grounded: false,
  frame: 0,
  frameTick: 0
};

const gravity = 1;

/* GROUND */
const groundY = canvas.height - 90;

/* PLATFORMS */
const platforms = [
  { x: 300, y: groundY - 120, w: 200, h: 20 },
  { x: 700, y: groundY - 220, w: 200, h: 20 }
];

/* COIN ANIMATION */
let coin = {
  x: 400,
  y: groundY - 80,
  size: 55 * SCALE,
  frame: 0
};

/* ENEMY */
let enemy = {
  x: 600,
  y: groundY - 70,
  w: 70,
  h: 70,
  dx: 3
};

/* BOSS */
let boss = {
  x: canvas.width - 200,
  y: groundY - 150,
  w: 150,
  h: 150,
  dx: -2,
  health: 5
};

/* CONTROLS */
document.addEventListener("keydown", e => {
  if (!gameRunning) return;
  if (e.key === "ArrowRight") player.dx = player.speed;
  if (e.key === "ArrowLeft") player.dx = -player.speed;
  if ((e.key === "ArrowUp" || e.key === " ") && player.grounded) jump();
});
document.addEventListener("keyup", () => player.dx = 0);

function moveLeft() { player.dx = -player.speed; }
function moveRight() { player.dx = player.speed; }
function jump() {
  if (player.grounded) {
    player.dy = player.jump;
    player.grounded = false;
    beep(400, 0.15);
  }
}

/* PHYSICS */
function updatePlayer() {
  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  player.grounded = false;

  if (player.y + player.h >= groundY) {
    player.y = groundY - player.h;
    player.dy = 0;
    player.grounded = true;
  }

  platforms.forEach(p => {
    if (
      player.x < p.x + p.w &&
      player.x + player.w > p.x &&
      player.y + player.h < p.y + 20 &&
      player.y + player.h + player.dy >= p.y
    ) {
      player.y = p.y - player.h;
      player.dy = 0;
      player.grounded = true;
    }
  });

  if (player.dx !== 0) {
    player.frameTick++;
    if (player.frameTick > 5) {
      player.frame = (player.frame + 1) % 4;
      player.frameTick = 0;
    }
  }
}

/* COIN */
function updateCoin() {
  coin.frame = (coin.frame + 1) % 6;
}

function collectCoin() {
  if (
    player.x < coin.x + coin.size &&
    player.x + player.w > coin.x &&
    player.y < coin.y + coin.size &&
    player.y + player.h > coin.y
  ) {
    score++;
    document.getElementById("score").innerText = score;
    beep(900, 0.1);
    coin.x = Math.random() * (canvas.width - coin.size);
  }
}

/* ENEMY */
function updateEnemy() {
  enemy.x += enemy.dx;
  if (enemy.x < 0 || enemy.x + enemy.w > canvas.width)
    enemy.dx *= -1;
}

/* BOSS */
function updateBoss() {
  boss.x += boss.dx;
  if (boss.x < 0 || boss.x + boss.w > canvas.width)
    boss.dx *= -1;
}

/* COLLISIONS */
function hitEnemy(obj) {
  if (
    player.x < obj.x + obj.w &&
    player.x + player.w > obj.x &&
    player.y < obj.y + obj.h &&
    player.y + player.h > obj.y
  ) {
    lives--;
    document.getElementById("lives").innerText = lives;
    beep(150, 0.3);
    player.x = 100;
    if (lives <= 0) gameOver();
  }
}

/* DRAW */
function draw() {
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "green";
  ctx.fillRect(0, groundY, canvas.width, 90);

  platforms.forEach(p => {
    ctx.fillStyle = "#654321";
    ctx.fillRect(p.x, p.y, p.w, p.h);
  });

  // player sprite
  ctx.drawImage(
    playerImg,
    player.frame * 90, 0, 90, 90,
    player.x, player.y, player.w, player.h
  );

  // coin sprite
  ctx.drawImage(
    coinImg,
    coin.frame * 50, 0, 50, 50,
    coin.x, coin.y, coin.size, coin.size
  );

  ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.w, enemy.h);
  ctx.drawImage(bossImg, boss.x, boss.y, boss.w, boss.h);
}

/* LOOP */
function gameLoop() {
  if (!gameRunning) return;
  updatePlayer();
  updateCoin();
  updateEnemy();
  updateBoss();
  collectCoin();
  hitEnemy(enemy);
  hitEnemy(boss);
  draw();
  requestAnimationFrame(gameLoop);
}

/* START & GAME OVER */
function startGame() {
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("gameUI").style.display = "block";
  score = 0;
  lives = 3;
  document.getElementById("score").innerText = score;
  document.getElementById("lives").innerText = lives;
  gameRunning = true;
  gameLoop();
}

function gameOver() {
  alert("💀 GAME OVER!");
  location.reload();
}
