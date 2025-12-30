import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { pathToFileURL } from "node:url";

function getDefaultPromptPath() {
  const basePath =
    typeof app?.getAppPath === "function" ? app.getAppPath() : process.cwd();

  return path.join(basePath, "Prompts", "V4.yaml");
}

function getDefaultOrbFramesPath() {
  const basePath =
    typeof app?.getAppPath === "function" ? app.getAppPath() : process.cwd();

  return path.join(basePath, "assets", "orb");
}

function loadOrbFrames(directoryPath) {
  if (!fs.existsSync(directoryPath)) return [];
  const entries = fs
    .readdirSync(directoryPath)
    .filter((entry) => entry.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return entries.map((entry) =>
    pathToFileURL(path.join(directoryPath, entry)).toString()
  );
}

export function loadAppConfig() {
  const promptPath =
    process.env.V_PROMPT_PATH?.trim() || getDefaultPromptPath();
  const orbFramesPath =
    process.env.V_ORB_FRAMES_PATH?.trim() || getDefaultOrbFramesPath();
  const model =
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash-native-audio-preview-12-2025";
  const apiKeys = [
    process.env.LIVE_GEMINI_API_KEY,
    process.env.FREE_GEMINI_API_KEY,
    process.env.TIER1_GEMINI_API_KEY,
    process.env.GEMINI_FALLBACK_API_KEY,
    process.env.GEMINI_API_KEY
  ].filter((value) => Boolean(value && value.trim()));

  let systemPrompt = "";
  if (fs.existsSync(promptPath)) {
    systemPrompt = fs.readFileSync(promptPath, "utf-8");
  }

  return {
    model,
    apiKeys,
    endpoint:
      process.env.GEMINI_LIVE_ENDPOINT ||
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent",
    systemPrompt,
    sampleRate: Number(process.env.V_SAMPLE_RATE || 16000),
    responseVoice: process.env.V_RESPONSE_VOICE || "Leda",
    orbFrames: loadOrbFrames(orbFramesPath),
    orbFrameRate: Number(process.env.V_ORB_FRAME_RATE || 8),
    speechSensitivity: process.env.SPEECH_SENSITIVITY || "END_SENSITIVITY_HIGH",
    activityDetection:
      String(process.env.ACTIVITY_DETECTION || "").toLowerCase() === "true"
  };
}
