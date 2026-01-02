const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let score = 0;
let level = 1;

/* ===== LOAD IMAGES ===== */
const playerImg = new Image();
playerImg.src = "assets/player.png"; // 👈 YOUR CHARACTER IMAGE

const coinImg = new Image();
coinImg.src = "assets/coin.png";

/* ===== SOUNDS ===== */
const jumpSound = new Audio("assets/jump.mp3");
const coinSound = new Audio("assets/coin.mp3");

/* ===== PLAYER ===== */
let player = {
  x: 50,
  y: 300,
  width: 40,
  height: 40,
  dx: 0,
  dy: 0,
  speed: 4,
  jumpPower: -12,
  grounded: false
};

const gravity = 0.6;

/* ===== GROUND ===== */
const ground = {
  x: 0,
  y: 350,
  width: 800,
  height: 50
};

/* ===== COIN ===== */
let coin = {
  x: 300,
  y: 250,
  size: 30
};

/* ===== CONTROLS ===== */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") player.dx = player.speed;
  if (e.key === "ArrowLeft") player.dx = -player.speed;

  if (e.key === "ArrowUp" && player.grounded) {
    player.dy = player.jumpPower;
    jumpSound.play();
    player.grounded = false;
  }
});

document.addEventListener("keyup", () => player.dx = 0);

/* ===== PHYSICS ===== */
function updatePlayer() {
  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  if (player.y + player.height >= ground.y) {
    player.y = ground.y - player.height;
    player.dy = 0;
    player.grounded = true;
  }
}

/* ===== COIN COLLECTION ===== */
function checkCoin() {
  if (
    player.x < coin.x + coin.size &&
    player.x + player.width > coin.x &&
    player.y < coin.y + coin.size &&
    player.y + player.height > coin.y
  ) {
    score++;
    document.getElementById("score").innerText = score;
    coinSound.play();

    coin.x = Math.random() * 740;
    coin.y = Math.random() * 250;

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
  updatePlayer();
  checkCoin();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
