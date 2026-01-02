const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// FULLSCREEN CANVAS
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 70;

let score = 0;
let level = 1;
let gameRunning = false;

/* ===== LOAD IMAGES ===== */
const playerImg = new Image();
playerImg.src = "assets/player.png";

const coinImg = new Image();
coinImg.src = "assets/coin.png";

/* ===== SIMPLE SOUND ENGINE ===== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playJumpSound() {
  const o = audioCtx.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(500, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
  o.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.2);
}

function playCoinSound() {
  const o = audioCtx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(900, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
  o.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.1);
}

/* ===== PLAYER (BIG SIZE) ===== */
let player = {
  x: 100,
  y: canvas.height - 200,
  width: 90,
  height: 90,
  dx: 0,
  dy: 0,
  speed: 7,
  jumpPower: -18,
  grounded: false
};

const gravity = 0.8;

/* ===== GROUND ===== */
const ground = {
  x: 0,
  y: canvas.height - 90,
  width: canvas.width,
  height: 90
};

/* ===== COIN (BIG SIZE) ===== */
let coin = {
  x: 300,
  y: ground.y - 120,
  size: 55
};

function spawnCoin() {
  coin.x = Math.random() * (canvas.width - coin.size);
  coin.y = ground.y - coin.size - 30;
}

/* ===== CONTROLS ===== */
document.addEventListener("keydown", e => {
  if (!gameRunning) return;

  if (e.key === "ArrowRight") player.dx = player.speed;
  if (e.key === "ArrowLeft") player.dx = -player.speed;

  if ((e.key === "ArrowUp" || e.key === " ") && player.grounded) {
    player.dy = player.jumpPower;
    playJumpSound();
    player.grounded = false;
  }
});

document.addEventListener("keyup", () => {
  player.dx = 0;
});

/* ===== PLAYER PHYSICS ===== */
function updatePlayer() {
  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  // screen limits
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width)
    player.x = canvas.width - player.width;

  // ground collision
  if (player.y + player.height >= ground.y) {
    player.y = ground.y - player.height;
    player.dy = 0;
    player.grounded = true;
  }
}

/* ===== COIN COLLISION ===== */
function checkCoin() {
  if (
    player.x < coin.x + coin.size &&
    player.x + player.width > coin.x &&
    player.y < coin.y + coin.size &&
    player.y + player.height > coin.y
  ) {
    score++;
    document.getElementById("score").innerText = score;
    playCoinSound();
    spawnCoin();

    if (score % 5 === 0) {
      level++;
      document.getElementById("level").innerText = level;
      player.speed += 0.5;
    }
  }
}

/* ===== DRAW EVERYTHING ===== */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // player
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);

  // coin
  ctx.drawImage(coinImg, coin.x, coin.y, coin.size, coin.size);

  // ground
  ctx.fillStyle = "green";
  ctx.fillRect(ground.x, ground.y, ground.width, ground.height);
}

/* ===== GAME LOOP ===== */
function gameLoop() {
  if (!gameRunning) return;

  updatePlayer();
  checkCoin();
  draw();
  requestAnimationFrame(gameLoop);
}

/* ===== START GAME ===== */
function startGame() {
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("gameUI").style.display = "block";

  score = 0;
  level = 1;
  document.getElementById("score").innerText = score;
  document.getElementById("level").innerText = level;

  spawnCoin();
  gameRunning = true;
  gameLoop();
}
