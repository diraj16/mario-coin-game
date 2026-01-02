const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// FULL SCREEN CANVAS
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 80;

let score = 0;
let level = 1;
let gameRunning = false;

/* ===== LOAD IMAGES ===== */
const playerImg = new Image();
playerImg.src = "assets/player.png";

const coinImg = new Image();
coinImg.src = "assets/coin.png";

/* ===== SOUNDS (NO MP3) ===== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playJumpSound() {
  const osc = audioCtx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(500, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
  osc.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playCoinSound() {
  const osc = audioCtx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(900, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
  osc.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

/* ===== PLAYER ===== */
let player = {
  x: 50,
  y: canvas.height - 120,
  width: 50,
  height: 50,
  dx: 0,
  dy: 0,
  speed: 6,
  jumpPower: -15,
  grounded: false
};

const gravity = 0.7;

/* ===== GROUND ===== */
const ground = {
  x: 0,
  y: canvas.height - 60,
  width: canvas.width,
  height: 60
};

/* ===== COIN ===== */
let coin = {
  x: 300,
  y: ground.y - 80,
  size: 35
};

function spawnCoin() {
  coin.x = Math.random() * (canvas.width - coin.size);
  coin.y = ground.y - 80;
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

/* ===== PHYSICS ===== */
function updatePlayer() {
  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width)
    player.x = canvas.width - player.width;

  if (player.y + player.height >= ground.y) {
    player.y = ground.y - player.height;
    player.dy = 0;
    player.grounded = true;
  }
}

/* ===== COIN CHECK ===== */
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

/* ===== DRAW ===== */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
  ctx.drawImage(coinImg, coin.x, coin.y, coin.size, coin.size);

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
  gameRunning = true;
  spawnCoin();
  gameLoop();
}
