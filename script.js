const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* CANVAS SIZE */
canvas.width = Math.min(window.innerWidth, 1200);
canvas.height = Math.min(window.innerHeight - 100, 600);

/* LOAD IMAGES */
const bgImg = new Image();
bgImg.src = "assets/background.png";

const playerImg = new Image();
playerImg.src = "assets/player.png";

const enemyImg = new Image();
enemyImg.src = "assets/enemy.png";

const coinImg = new Image();
coinImg.src = "assets/coin.png";

/* GAME STATE */
let score = 0;
let lives = 3;
let gameSpeed = 6;

/* SCALE FOR MOBILE */
const SCALE = window.innerWidth < 600 ? 1.4 : 1;

/* GROUND */
const groundY = canvas.height - 100;

/* PLAYER (STAYS MOSTLY FIXED) */
let player = {
  x: 100,
  y: groundY - 90 * SCALE,
  w: 90 * SCALE,
  h: 90 * SCALE,
  dy: 0,
  jumpPower: -20 * SCALE,
  grounded: true
};

const gravity = 1;

/* BACKGROUND SCROLL */
let bgX = 0;

/* ENEMIES ARRAY (INFINITE) */
let enemies = [];

/* COINS ARRAY */
let coins = [];

/* CONTROLS */
document.addEventListener("keydown", e => {
  if ((e.key === "ArrowUp" || e.key === " ") && player.grounded) jump();
});

function jump() {
  if (player.grounded) {
    player.dy = player.jumpPower;
    player.grounded = false;
  }
}

/* SPAWN ENEMY */
function spawnEnemy() {
  enemies.push({
    x: canvas.width + Math.random() * 300,
    y: groundY - 70,
    w: 70,
    h: 70
  });
}

/* SPAWN COIN */
function spawnCoin() {
  coins.push({
    x: canvas.width + Math.random() * 500,
    y: groundY - 120,
    size: 40 * SCALE
  });
}

/* UPDATE */
function update() {
  /* BACKGROUND MOVE */
  bgX -= gameSpeed * 0.5;
  if (bgX <= -canvas.width) bgX = 0;

  /* PLAYER PHYSICS */
  player.dy += gravity;
  player.y += player.dy;

  if (player.y + player.h >= groundY) {
    player.y = groundY - player.h;
    player.dy = 0;
    player.grounded = true;
  }

  /* ENEMY MOVE */
  enemies.forEach(e => e.x -= gameSpeed);
  enemies = enemies.filter(e => e.x + e.w > 0);

  /* COIN MOVE */
  coins.forEach(c => c.x -= gameSpeed);
  coins = coins.filter(c => c.x + c.size > 0);

  /* SPAWN LOGIC */
  if (Math.random() < 0.02) spawnEnemy();
  if (Math.random() < 0.015) spawnCoin();

  /* COLLISIONS */
  enemies.forEach(e => {
    if (hit(player, e)) {
      lives--;
      document.getElementById("lives").innerText = lives;
      enemies = [];
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

/* COLLISION FUNCTION */
function hit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* DRAW */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* BACKGROUND LOOP */
  ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);

  /* GROUND */
  ctx.fillStyle = "green";
  ctx.fillRect(0, groundY, canvas.width, 100);

  /* PLAYER */
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  /* ENEMIES */
  enemies.forEach(e => {
    ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
  });

  /* COINS */
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
