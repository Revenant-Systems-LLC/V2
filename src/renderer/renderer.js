import { LiveClient } from "./liveClient.js";

const orb = document.getElementById("orb");
const orbShell = document.getElementById("orb-shell");
const orbCanvas = document.getElementById("orb-canvas");
const orbContext = orbCanvas?.getContext("2d");

let liveClient;
let active = false;
let dragging = false;
let dragMoved = false;
let dragOffset = { x: 0, y: 0 };
let windowPosition = { x: 0, y: 0 };
let orbFrames = [];
let orbFrameIndex = 0;
let orbFrameRate = 20;
let orbAnimationId = null;
let orbLastFrameTime = 0;
let orbImages = [];

async function init() {
  const config = await window.v2.getConfig();
  liveClient = new LiveClient(config);
  orbFrames = config.orbFrames || [];
  orbFrameRate = Math.max(20, config.orbFrameRate || 20);
  await loadOrbFrames();
  startFrameAnimation();

  liveClient.on("speaking", (state) => {
    orb.classList.toggle("speaking", state);
  });

  liveClient.on("level", (level) => {
    const clamped = Math.max(0, Math.min(1, level * 4));
    const scale = 1 + clamped * 0.08;
    const glow = 0.35 + clamped * 0.65;
    orb.style.setProperty("--orb-scale", scale.toFixed(3));
    orb.style.setProperty("--orb-glow", glow.toFixed(3));
  });

  liveClient.on("status", (status) => {
    orb.title = status;
  });

  window.v2.onToggleListening(async () => {
    await toggleListening();
  });
}

async function loadOrbFrames() {
  if (!orbFrames.length || !orbContext) return;
  orbImages = await Promise.all(
    orbFrames.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().then(() => img);
    })
  );
}

function startFrameAnimation() {
  if (!orbContext || orbImages.length === 0) return;
  if (orbAnimationId) {
    cancelAnimationFrame(orbAnimationId);
  }
  orbLastFrameTime = 0;
  const frameDuration = 1000 / Math.max(1, orbFrameRate);

  const tick = (timestamp) => {
    if (!orbLastFrameTime) {
      orbLastFrameTime = timestamp;
    }
    if (timestamp - orbLastFrameTime >= frameDuration) {
      renderOrbFrame(timestamp);
      orbLastFrameTime = timestamp;
    }
    orbAnimationId = requestAnimationFrame(tick);
  };

  orbAnimationId = requestAnimationFrame(tick);
}

function renderOrbFrame(timestamp) {
  if (!orbContext || orbImages.length === 0) return;
  const { width, height } = orbCanvas;
  orbContext.clearRect(0, 0, width, height);

  if (orbImages.length === 1) {
    orbContext.drawImage(orbImages[0], 0, 0, width, height);
    return;
  }

  if (orbImages.length === 2) {
    const progress = (timestamp / 1000) % 1;
    const alpha = 0.5 + 0.5 * Math.sin(progress * Math.PI * 2);
    const rotation = (progress - 0.5) * 0.15;
    drawOrbLayer(orbImages[0], 1 - alpha, rotation);
    drawOrbLayer(orbImages[1], alpha, -rotation);
    return;
  }

  orbFrameIndex = (orbFrameIndex + 1) % orbImages.length;
  orbContext.drawImage(orbImages[orbFrameIndex], 0, 0, width, height);
}

function drawOrbLayer(image, alpha, rotation) {
  const { width, height } = orbCanvas;
  orbContext.save();
  orbContext.globalAlpha = alpha;
  orbContext.translate(width / 2, height / 2);
  orbContext.rotate(rotation);
  orbContext.drawImage(
    image,
    -width / 2,
    -height / 2,
    width,
    height
  );
  orbContext.restore();
}

async function startListening() {
  if (active) return;
  active = true;
  orb.classList.add("active");
  window.v2.setListeningState(true);
  await liveClient.start();
}

async function stopListening() {
  if (!active) return;
  active = false;
  orb.classList.remove("active");
  window.v2.setListeningState(false);
  await liveClient.stop();
}

async function toggleListening() {
  if (!liveClient) return;
  if (active) {
    await stopListening();
  } else {
    await startListening();
  }
}

orb.addEventListener("click", async () => {
  if (dragMoved) return;
  await toggleListening();
});

orbShell.addEventListener("pointerdown", async (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  dragging = true;
  dragMoved = false;
  const position = await window.v2.getWindowPosition();
  windowPosition = position;
  dragOffset = { x: event.screenX, y: event.screenY };
  orbShell.setPointerCapture(event.pointerId);
});

orbShell.addEventListener("pointermove", async (event) => {
  if (!dragging) return;
  event.preventDefault();
  const deltaX = event.screenX - dragOffset.x;
  const deltaY = event.screenY - dragOffset.y;
  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    dragMoved = true;
  }
  await window.v2.setWindowPosition({
    x: Math.round(windowPosition.x + deltaX),
    y: Math.round(windowPosition.y + deltaY)
  });
});

orbShell.addEventListener("pointerup", (event) => {
  dragging = false;
  orbShell.releasePointerCapture(event.pointerId);
});

init();
