import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("v2", {
  getConfig: () => ipcRenderer.invoke("v2:get-config"),
  setVisibility: (visible) => ipcRenderer.invoke("v2:set-visibility", visible),
  setAlwaysOnTop: (enabled) =>
    ipcRenderer.invoke("v2:toggle-always-on-top", enabled),
  getWindowPosition: () => ipcRenderer.invoke("v2:get-window-position"),
  setWindowPosition: (position) =>
    ipcRenderer.invoke("v2:set-window-position", position),
  onToggleListening: (handler) =>
    ipcRenderer.on("v2:toggle-listening", handler),
  setListeningState: (state) =>
    ipcRenderer.send("v2:listening-changed", state)
});
