const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.cursor = "none";

const numStars = 1500;
let speed = 15;
let stars = [];

for (let i = 0; i < numStars; i++) {
  const z = Math.random() * canvas.width * 2;
  stars.push({
    x: (Math.random() - 0.5) * canvas.width * 6,
    y: (Math.random() - 0.5) * canvas.height * 6,
    z: z,
    pz: z
  });
}

const numBgStars = 1200;
const bgStars = [];
for (let i = 0; i < numBgStars; i++) {
  bgStars.push({
    xp: Math.random(),
    yp: Math.random(),
    size: Math.random() * 1.5,
    alpha: Math.random() * 0.5 + 0.2
  });
}

const bgCanvas = document.createElement("canvas");
const bgCtx = bgCanvas.getContext("2d");

const trailCanvas = document.createElement("canvas");
const trailCtx = trailCanvas.getContext("2d");

function rebuildLayers() {
  bgCanvas.width = canvas.width;
  bgCanvas.height = canvas.height;
  bgCtx.fillStyle = "#000000";
  bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
  for (let bg of bgStars) {
    bgCtx.fillStyle = `rgba(255, 255, 255, ${bg.alpha})`;
    bgCtx.fillRect(bg.xp * bgCanvas.width, bg.yp * bgCanvas.height, bg.size, bg.size);
  }

  trailCanvas.width = canvas.width;
  trailCanvas.height = canvas.height;
  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
}

rebuildLayers();

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let slowMouseX = canvas.width / 2;
let slowMouseY = canvas.height / 2;
let centerX = canvas.width / 2;
let centerY = canvas.height / 2;

const keys = { Space: false, Shift: false };

let recoveryState = 0;
let transitionTimer = 0;
const SPOOL_TOTAL = 95;
const SLINGSHOT_TOTAL = 280;
let wasSlowMode = false;
let releaseSpeed = 2;
let slowStretch = 0;
let whiteBlend = 0;
let glassBoost = 0;

function smootherstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") keys.Space = true;
  if (e.key === "Shift" || e.code === "ShiftLeft" || e.code === "ShiftRight") keys.Shift = true;
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") keys.Space = false;
  if (e.key === "Shift" || e.code === "ShiftLeft" || e.code === "ShiftRight") keys.Shift = false;
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  rebuildLayers();
});

function drawGlassOverlay(boost) {
  ctx.save();

  if (boost > 0.01) {
    ctx.shadowColor = `rgba(225, 242, 255, ${0.95 * boost})`;
    ctx.shadowBlur = 20 * boost;
  }

  const borderR = Math.round(140 + 95 * boost);
  const borderG = Math.round(170 + 75 * boost);
  const borderB = Math.round(190 + 65 * boost);
  const borderA = 0.15 + 0.85 * boost;

  ctx.strokeStyle = `rgba(${borderR}, ${borderG}, ${borderB}, ${borderA})`;
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  const size = 32;
  const glintR = Math.round(200 + 55 * boost);
  const glintG = Math.round(220 + 35 * boost);
  const glintB = Math.round(235 + 20 * boost);
  const glintA = 0.25 + 0.75 * boost;

  ctx.fillStyle = `rgba(${glintR}, ${glintG}, ${glintB}, ${glintA})`;

  const tlX = 64;
  const tlY = 64;
  ctx.fillRect(tlX, tlY, size, size);
  ctx.fillRect(tlX + size, tlY + size, size, size);
  ctx.fillRect(tlX + size * 2, tlY + size * 2, size, size);

  const brX = canvas.width - 64 - size;
  const brY = canvas.height - 64 - size;
  ctx.fillRect(brX, brY, size, size);
  ctx.fillRect(brX - size, brY - size, size, size);

  ctx.restore();
}

function animate() {
  const isSlowMode = keys.Shift && keys.Space;
  const isIdle = !keys.Shift && !keys.Space;

  if (isSlowMode) {
    wasSlowMode = true;
    recoveryState = 0;
  } else if (wasSlowMode && isIdle) {
    recoveryState = 1;
    transitionTimer = SPOOL_TOTAL;
    releaseSpeed = speed;
    wasSlowMode = false;
  }

  if (recoveryState > 0 && !isIdle) {
    recoveryState = 0;
  }

  let targetGlassBoost = 0;
  let targetStretch = 0;
  let targetWhiteBlend = 0;
  let mouseLerp = 0.1;

  if (isSlowMode || (wasSlowMode && !isIdle)) {
    speed += (2 - speed) * 0.04;
    mouseLerp = 0.005;
    targetGlassBoost = 0.16;
    targetStretch = 60;
    targetWhiteBlend = 1;
  } else if (recoveryState === 1) {
    transitionTimer--;
    const t = 1 - (transitionTimer / SPOOL_TOTAL);
    const ease = smootherstep(t);

    speed = releaseSpeed + (140 - releaseSpeed) * ease;
    targetStretch = 60 * (1 - ease);
    targetGlassBoost = 0.16;
    mouseLerp = 0.005 + 0.055 * ease;

    if (t < 0.7) {
      targetWhiteBlend = 1;
    } else {
      targetWhiteBlend = 1 - smootherstep((t - 0.7) / 0.3);
    }

    if (transitionTimer <= 0) {
      recoveryState = 2;
      transitionTimer = SLINGSHOT_TOTAL;
    }
  } else if (recoveryState === 2) {
    transitionTimer--;
    const t = 1 - (transitionTimer / SLINGSHOT_TOTAL);
    const ease = smootherstep(t);

    speed = 140 - 125 * ease;
    targetStretch = 0;
    targetWhiteBlend = 0;
    mouseLerp = 0.06 + 0.04 * ease;

    if (t < 0.5) {
      targetGlassBoost = 0.16;
    } else {
      targetGlassBoost = 0.16 * (1 - smootherstep((t - 0.5) / 0.5));
    }

    if (transitionTimer <= 0) {
      recoveryState = 0;
    }
  } else {
    let targetSpeed = 15;
    if (keys.Shift) targetSpeed = 140;
    else if (keys.Space) targetSpeed = 65;

    speed += (targetSpeed - speed) * 0.08;
    mouseLerp = 0.1;
  }

  slowMouseX += (mouseX - slowMouseX) * mouseLerp;
  slowMouseY += (mouseY - slowMouseY) * mouseLerp;
  slowStretch += (targetStretch - slowStretch) * 0.18;
  whiteBlend += (targetWhiteBlend - whiteBlend) * 0.25;
  glassBoost += (targetGlassBoost - glassBoost) * 0.08;

  centerX += (slowMouseX - centerX) * 0.05;
  centerY += (slowMouseY - centerY) * 0.05;

  const warpRatio = Math.max(0, (speed - 15) / 50);
  const baseTrailAlpha = Math.max(0.2, 1 - warpRatio * 0.45);
  const trailAlpha = baseTrailAlpha + (0.08 - baseTrailAlpha) * whiteBlend;

  trailCtx.globalCompositeOperation = "destination-out";
  trailCtx.fillStyle = `rgba(0, 0, 0, ${trailAlpha})`;
  trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
  trailCtx.globalCompositeOperation = "source-over";

  const fovScale = 1 - Math.min(warpRatio * 0.1, 0.22);
  const fovX = (canvas.width / 2) * fovScale;
  const fovY = (canvas.height / 2) * fovScale;

  let warpRed, warpGreen;
  if (warpRatio <= 1) {
    warpRed = 255 - warpRatio * 135;
    warpGreen = 255 - warpRatio * 45;
  } else {
    const superT = Math.min((warpRatio - 1) / 1.5, 1);
    warpRed = 120 + superT * 120;
    warpGreen = 210 - superT * 140;
  }

  const red = Math.round(warpRed + (235 - warpRed) * whiteBlend);
  const green = Math.round(warpGreen + (242 - warpGreen) * whiteBlend);
  const strokeAlpha = 1 - 0.1 * whiteBlend;

  trailCtx.strokeStyle = `rgba(${red}, ${green}, 255, ${strokeAlpha})`;
  trailCtx.lineCap = "round";

  for (let star of stars) {
    star.pz = star.z + slowStretch;
    star.z -= speed;

    if (star.z <= 0) {
      star.x = (Math.random() - 0.5) * canvas.width * 6;
      star.y = (Math.random() - 0.5) * canvas.height * 6;
      star.z = canvas.width * 2;
      star.pz = star.z + slowStretch;
    }

    const sx = (star.x / star.z) * fovX + centerX;
    const sy = (star.y / star.z) * fovY + centerY;

    const px = (star.x / star.pz) * fovX + centerX;
    const py = (star.y / star.pz) * fovY + centerY;

    trailCtx.lineWidth = (1 - star.z / (canvas.width * 2)) * 3;
    trailCtx.beginPath();
    trailCtx.moveTo(px, py);
    trailCtx.lineTo(sx, sy);
    trailCtx.stroke();
  }

  ctx.drawImage(bgCanvas, 0, 0);

  ctx.save();
  const shakeAmount = Math.max(0, (warpRatio - 1.1) * 3.5) * (1 - whiteBlend);
  if (shakeAmount > 0.01) {
    const shakeX = (Math.random() - 0.5) * shakeAmount;
    const shakeY = (Math.random() - 0.5) * shakeAmount;
    ctx.translate(shakeX, shakeY);
  }
  ctx.drawImage(trailCanvas, 0, 0);
  ctx.restore();

  drawGlassOverlay(glassBoost);

  requestAnimationFrame(animate);
}

animate();
