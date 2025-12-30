import { LiveClient } from "./liveClient.js";

const orb = document.getElementById("orb");
const orbShell = document.getElementById("orb-shell");
const orbFrame = document.getElementById("orb-frame");

let liveClient;
let active = false;
let dragging = false;
let dragMoved = false;
let dragOffset = { x: 0, y: 0 };
let windowPosition = { x: 0, y: 0 };
let orbFrames = [];
let orbFrameIndex = 0;
let orbFrameTimer;

async function init() {
  const config = await window.v2.getConfig();
  liveClient = new LiveClient(config);
  orbFrames = config.orbFrames || [];
  startFrameAnimation(config.orbFrameRate || 8);
  if (orbFrame && orbFrames.length === 0) {
    orbFrame.style.display = "none";
  }

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

function startFrameAnimation(frameRate) {
  if (!orbFrame || orbFrames.length === 0) return;
  const interval = 1000 / Math.max(1, frameRate);
  orbFrame.src = orbFrames[0];
  if (orbFrameTimer) {
    clearInterval(orbFrameTimer);
  }
  orbFrameTimer = setInterval(() => {
    orbFrameIndex = (orbFrameIndex + 1) % orbFrames.length;
    orbFrame.src = orbFrames[orbFrameIndex];
  }, interval);
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
