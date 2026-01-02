const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* SAFE CANVAS SIZE */
canvas.width = Math.min(window.innerWidth, 1200);
canvas.height = Math.min(window.innerHeight - 100, 600);

/* LOAD IMAGES */
const bg = new Image();
bg.src = "assets/background.png";

const playerImg = new Image();
playerImg.src = "assets/player.png";

const coinImg = new Image();
coinImg.src = "assets/coin.png";

const enemyImg = new Image();
enemyImg.src = "assets/enemy.png";

/* GAME STATE */
let score = 0;
let lives = 3;

/* SCALE FOR MOBILE */
const SCALE = window.innerWidth < 600 ? 1.4 : 1;

/* WORLD */
let cameraX = 0;

/* GROUND */
const groundY = canvas.height - 90;

/* PLAYER (BIG & CLEAR) */
let player = {
  x: 100,
  y: groundY - 90 * SCALE,
  w: 90 * SCALE,
  h: 90 * SCALE,
  dx: 0,
  dy: 0,
  speed: 6 * SCALE,
  jumpPower: -18 * SCALE,
  grounded: false
};

const gravity = 0.9;

/* COIN */
let coin = {
  x: 600,
  y: groundY - 60,
  size: 45 * SCALE
};

/* ENEMY */
let enemy = {
  x: 900,
  y: groundY - 70,
  w: 70,
  h: 70,
  dx: -2
};

/* CONTROLS (KEYBOARD) */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") player.dx = player.speed;
  if (e.key === "ArrowLeft") player.dx = -player.speed;
  if ((e.key === "ArrowUp" || e.key === " ") && player.grounded) jump();
});

document.addEventListener("keyup", () => stop());

/* MOBILE CONTROLS */
function leftDown() { player.dx = -player.speed; }
function rightDown() { player.dx = player.speed; }
function stop() { player.dx = 0; }
function jump() {
  if (player.grounded) {
    player.dy = player.jumpPower;
    player.grounded = false;
  }
}

/* UPDATE PLAYER */
function updatePlayer() {
  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  /* GROUND */
  if (player.y + player.h >= groundY) {
    player.y = groundY - player.h;
    player.dy = 0;
    player.grounded = true;
  }

  /* CAMERA FOLLOW */
  if (player.x - cameraX > canvas.width / 2) {
    cameraX += player.speed;
  }
}

/* UPDATE ENEMY */
function updateEnemy() {
  enemy.x += enemy.dx;
}

/* COLLISIONS */
function rectHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function checkCoin() {
  if (
    player.x < coin.x + coin.size &&
    player.x + player.w > coin.x &&
    player.y < coin.y + coin.size &&
    player.y + player.h > coin.y
  ) {
    score++;
    document.getElementById("score").innerText = score;
    coin.x += 500;
  }
}

function checkEnemy() {
  if (rectHit(player, enemy)) {
    lives--;
    document.getElementById("lives").innerText = lives;
    player.x -= 100;
    if (lives <= 0) {
      alert("GAME OVER");
      location.reload();
    }
  }
}

/* DRAW */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* BACKGROUND (SCROLLING) */
  ctx.drawImage(bg, -cameraX * 0.3, 0, canvas.width * 2, canvas.height);

  /* GROUND */
  ctx.fillStyle = "green";
  ctx.fillRect(-cameraX, groundY, canvas.width * 3, 90);

  /* PLAYER */
  ctx.drawImage(
    playerImg,
    player.x - cameraX,
    player.y,
    player.w,
    player.h
  );

  /* COIN */
  ctx.drawImage(
    coinImg,
    coin.x - cameraX,
    coin.y,
    coin.size,
    coin.size
  );

  /* ENEMY */
  ctx.drawImage(
    enemyImg,
    enemy.x - cameraX,
    enemy.y,
    enemy.w,
    enemy.h
  );
}

/* GAME LOOP */
function loop() {
  updatePlayer();
  updateEnemy();
  checkCoin();
  checkEnemy();
  draw();
  requestAnimationFrame(loop);
}

loop();
