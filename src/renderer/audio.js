const SENSITIVITY_THRESHOLDS = {
  low: 0.006,
  medium: 0.012,
  high: 0.02
};

function resolveSensitivityThreshold(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("low")) return SENSITIVITY_THRESHOLDS.low;
  if (normalized.includes("medium")) return SENSITIVITY_THRESHOLDS.medium;
  if (normalized.includes("high")) return SENSITIVITY_THRESHOLDS.high;
  return SENSITIVITY_THRESHOLDS.high;
}

export class AudioCapture {
  constructor({
    sampleRate = 16000,
    onFrame,
    onLevel,
    activityDetection = false,
    speechSensitivity = "END_SENSITIVITY_HIGH"
  }) {
    this.sampleRate = sampleRate;
    this.onFrame = onFrame;
    this.onLevel = onLevel;
    this.activityDetection = activityDetection;
    this.speechSensitivity = speechSensitivity;
    this.sensitivityThreshold = resolveSensitivityThreshold(speechSensitivity);
    this.stream = null;
    this.context = null;
    this.processor = null;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.context = new AudioContext({ sampleRate: this.sampleRate });
    const source = this.context.createMediaStreamSource(this.stream);
    const processor = this.context.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      let sum = 0;

      for (let i = 0; i < input.length; i += 1) {
        const clamped = Math.max(-1, Math.min(1, input[i]));
        pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        sum += clamped * clamped;
      }

      const level = Math.sqrt(sum / input.length);
      if (this.onLevel) {
        this.onLevel(level);
      }
      if (
        this.onFrame &&
        (!this.activityDetection || level >= this.sensitivityThreshold)
      ) {
        this.onFrame(pcm.buffer);
      }
    };

    source.connect(processor);
    processor.connect(this.context.destination);

    this.processor = processor;
  }

  async stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

export class AudioPlayer {
  constructor({ sampleRate = 24000 }) {
    this.sampleRate = sampleRate;
    this.context = new AudioContext({ sampleRate: this.sampleRate });
    this.queue = [];
    this.playing = false;
    this.onLevel = null;
  }

  enqueue(pcmBuffer) {
    this.queue.push(pcmBuffer);
    if (this.context.state === "suspended") {
      this.context.resume();
    }
    if (!this.playing) {
      this.playNext();
    }
  }

  playNext() {
    if (this.queue.length === 0) {
      this.playing = false;
      if (this.onLevel) {
        this.onLevel(0);
      }
      return;
    }

    this.playing = true;
    const pcmBuffer = this.queue.shift();
    const audioBuffer = this.context.createBuffer(
      1,
      pcmBuffer.length,
      this.sampleRate
    );
    const channel = audioBuffer.getChannelData(0);

    for (let i = 0; i < pcmBuffer.length; i += 1) {
      channel[i] = pcmBuffer[i] / 0x7fff;
    }

    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.context.destination);
    source.start();

    const analyser = this.context.createAnalyser();
    source.connect(analyser);

    const data = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        sum += data[i] * data[i];
      }
      const level = Math.sqrt(sum / data.length);
      if (this.onLevel) {
        this.onLevel(level);
      }
      if (this.playing) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);

    source.onended = () => {
      this.playNext();
    };
  }
}
