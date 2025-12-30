import { AudioCapture, AudioPlayer } from "./audio.js";

function encodeBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

class Emitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => handler(payload));
  }
}

export class LiveClient extends Emitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.capture = null;
    this.player = new AudioPlayer({ sampleRate: config.sampleRate });
    this.keyRotation = Array.isArray(config.apiKeys)
      ? config.apiKeys.filter(Boolean)
      : [];
    this.keyIndex = 0;
    this.reconnecting = false;

    this.player.onLevel = (level) => {
      this.emit("speaking", level > 0.02);
      this.emit("level", level);
    };
  }

  async start() {
    if (!this.keyRotation.length) {
      this.emit("status", "Missing Live API key");
      return;
    }

    if (!this.capture) {
      this.capture = new AudioCapture({
        sampleRate: this.config.sampleRate,
        activityDetection: this.config.activityDetection,
        speechSensitivity: this.config.speechSensitivity,
        onFrame: (pcmBuffer) => this.sendAudio(pcmBuffer)
      });
      await this.capture.start();
    }

    this.connectSocket();
  }

  async stop() {
    if (this.capture) {
      await this.capture.stop();
      this.capture = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.emit("speaking", false);
  }

  connectSocket() {
    if (!this.keyRotation.length) return;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    const apiKey = this.keyRotation[this.keyIndex];
    const url = this.buildEndpoint(apiKey);
    this.socket = new WebSocket(url);

    this.socket.addEventListener("open", () => {
      this.emit("status", "Connected");
      this.sendSetup();
    });

    this.socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });

    this.socket.addEventListener("close", () => {
      this.emit("status", "Disconnected");
    });

    this.socket.addEventListener("error", () => {
      this.emit("status", "Connection error");
    });
  }

  buildEndpoint(apiKey) {
    if (this.config.endpoint.includes("{key}")) {
      return this.config.endpoint.replace("{key}", apiKey);
    }
    if (this.config.endpoint.includes("key=")) {
      return this.config.endpoint;
    }
    const separator = this.config.endpoint.includes("?") ? "&" : "?";
    return `${this.config.endpoint}${separator}key=${apiKey}`;
  }

  handleKeyError(message) {
    if (this.reconnecting) return;
    const status = message?.error?.status;
    const code = message?.error?.code;
    if (!status && !code) return;
    const exhausted =
      status === "RESOURCE_EXHAUSTED" ||
      status === "PERMISSION_DENIED" ||
      code === 429 ||
      code === 403;
    if (!exhausted) return;
    if (this.keyIndex + 1 >= this.keyRotation.length) {
      this.emit("status", "Live API quota exhausted");
      return;
    }
    this.keyIndex += 1;
    this.reconnecting = true;
    this.emit("status", "Switching Live API key");
    setTimeout(() => {
      this.reconnecting = false;
      this.connectSocket();
    }, 300);
  }

  sendSetup() {
    const systemInstruction = this.config.systemPrompt
      ? {
          parts: [
            {
              text: this.config.systemPrompt
            }
          ]
        }
      : undefined;

    const payload = {
      setup: {
        model: this.config.model,
        system_instruction: systemInstruction,
        generation_config: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: this.config.responseVoice
              }
            }
          }
        }
      }
    };
    this.socket.send(JSON.stringify(payload));
  }

  sendAudio(pcmBuffer) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const base64Audio = encodeBase64(pcmBuffer);
    const payload = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: `audio/pcm;rate=${this.config.sampleRate}`,
            data: base64Audio
          }
        ]
      }
    };

    this.socket.send(JSON.stringify(payload));
  }

  handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch (error) {
      this.emit("status", "Non-JSON response");
      return;
    }

    if (message?.error) {
      this.handleKeyError(message);
      return;
    }

    const parts = message?.serverContent?.modelTurn?.parts || [];
    const inlinePart = parts.find(
      (part) => part?.inlineData || part?.inline_data || part?.audio
    );

    const audioChunk =
      message?.serverContent?.modelTurn?.audio ||
      inlinePart?.inlineData ||
      inlinePart?.inline_data ||
      inlinePart?.audio ||
      message?.audio ||
      message?.output_audio;

    const audioData =
      audioChunk?.data ||
      audioChunk?.inlineData?.data ||
      audioChunk?.inline_data?.data;

    if (audioData) {
      const binary = atob(audioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const view = new DataView(bytes.buffer);
      const pcm = new Int16Array(bytes.byteLength / 2);
      for (let i = 0; i < pcm.length; i += 1) {
        pcm[i] = view.getInt16(i * 2, true);
      }
      this.player.enqueue(pcm);
    }
  }
}
