import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

function getDefaultPromptPath() {
  const basePath =
    typeof app?.getAppPath === "function" ? app.getAppPath() : process.cwd();

  return path.join(basePath, "Prompts", "V4.yaml");
}

export function loadAppConfig() {
  const promptPath =
    process.env.V_PROMPT_PATH?.trim() || getDefaultPromptPath();
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
    speechSensitivity: process.env.SPEECH_SENSITIVITY || "END_SENSITIVITY_HIGH",
    activityDetection:
      String(process.env.ACTIVITY_DETECTION || "").toLowerCase() === "true"
  };
}
