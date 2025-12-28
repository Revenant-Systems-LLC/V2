import { LiveClient } from "./liveClient.js";

const orb = document.getElementById("orb");
const orbShell = document.getElementById("orb-shell");

let liveClient;
let active = false;
let dragging = false;
let dragMoved = false;
let dragOffset = { x: 0, y: 0 };
let windowPosition = { x: 0, y: 0 };

async function init() {
  const config = await window.v2.getConfig();
  liveClient = new LiveClient(config);

  liveClient.on("speaking", (state) => {
    orb.classList.toggle("speaking", state);
  });

  liveClient.on("status", (status) => {
    orb.title = status;
  });

  window.v2.onToggleListening(async () => {
    await toggleListening();
  });
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
  dragging = true;
  dragMoved = false;
  const position = await window.v2.getWindowPosition();
  windowPosition = position;
  dragOffset = { x: event.screenX, y: event.screenY };
  orbShell.setPointerCapture(event.pointerId);
});

orbShell.addEventListener("pointermove", async (event) => {
  if (!dragging) return;
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
