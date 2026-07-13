const STORAGE_KEY = "yutnori-sfx-enabled";
const MASTER_LEVEL = 1.02;

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = typeof window === "undefined"
  ? true
  : window.localStorage.getItem(STORAGE_KEY) !== "false";
let lastImpactAt = 0;

function ensureAudio() {
  if (!enabled || typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = MASTER_LEVEL;
    const limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 8;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.14;
    masterGain.connect(limiter);
    limiter.connect(audioContext.destination);
  }
  return audioContext;
}

function getNoise(context: AudioContext) {
  if (noiseBuffer?.sampleRate === context.sampleRate) return noiseBuffer;
  const length = Math.floor(context.sampleRate * 0.5);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

function connectWithPan(context: AudioContext, input: AudioNode, pan: number) {
  const panner = context.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  input.connect(panner);
  panner.connect(masterGain!);
}

function shapeEnvelope(gain: AudioParam, at: number, peak: number, attack: number, decay: number) {
  gain.setValueAtTime(0.0001, at);
  gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

function woodKnock(context: AudioContext, at: number, volume: number, pitch: number, pan = 0) {
  const toneGain = context.createGain();
  shapeEnvelope(toneGain.gain, at, volume, 0.0025, 0.105);
  connectWithPan(context, toneGain, pan);

  const body = context.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(pitch, at);
  body.frequency.exponentialRampToValueAtTime(pitch * 0.62, at + 0.11);
  body.connect(toneGain);
  body.start(at);
  body.stop(at + 0.12);

  const overtoneGain = context.createGain();
  shapeEnvelope(overtoneGain.gain, at, volume * 0.32, 0.0015, 0.055);
  connectWithPan(context, overtoneGain, pan);
  const overtone = context.createOscillator();
  overtone.type = "sine";
  overtone.frequency.setValueAtTime(pitch * 2.35, at);
  overtone.frequency.exponentialRampToValueAtTime(pitch * 1.68, at + 0.06);
  overtone.connect(overtoneGain);
  overtone.start(at);
  overtone.stop(at + 0.07);

  const click = context.createBufferSource();
  const clickFilter = context.createBiquadFilter();
  const clickGain = context.createGain();
  click.buffer = getNoise(context);
  clickFilter.type = "bandpass";
  clickFilter.frequency.value = 1250 + pitch;
  clickFilter.Q.value = 1.1;
  shapeEnvelope(clickGain.gain, at, volume * 0.38, 0.001, 0.028);
  click.connect(clickFilter);
  clickFilter.connect(clickGain);
  connectWithPan(context, clickGain, pan);
  click.start(at);
  click.stop(at + 0.04);
}

function resultTone(context: AudioContext, at: number, volume: number, pitch: number) {
  const gain = context.createGain();
  shapeEnvelope(gain.gain, at, volume, 0.006, 0.34);
  gain.connect(masterGain!);

  const tone = context.createOscillator();
  tone.type = "sine";
  tone.frequency.setValueAtTime(pitch, at);
  tone.frequency.exponentialRampToValueAtTime(pitch * 0.992, at + 0.34);
  tone.connect(gain);
  tone.start(at);
  tone.stop(at + 0.36);

  const overtoneGain = context.createGain();
  shapeEnvelope(overtoneGain.gain, at, volume * 0.22, 0.004, 0.2);
  overtoneGain.connect(masterGain!);
  const overtone = context.createOscillator();
  overtone.type = "sine";
  overtone.frequency.value = pitch * 2.02;
  overtone.connect(overtoneGain);
  overtone.start(at);
  overtone.stop(at + 0.22);
}

function withAudio(play: (context: AudioContext) => void) {
  const context = ensureAudio();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
  play(context);
}

export const gameSfx = {
  isEnabled() {
    return enabled;
  },

  setEnabled(next: boolean) {
    enabled = next;
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(next));
    if (!next && masterGain && audioContext) {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.018);
      return;
    }
    const context = ensureAudio();
    if (context && masterGain) {
      masterGain.gain.cancelScheduledValues(context.currentTime);
      masterGain.gain.setTargetAtTime(MASTER_LEVEL, context.currentTime, 0.02);
      void context.resume();
    }
  },

  unlock() {
    const context = ensureAudio();
    if (context?.state === "suspended") void context.resume();
  },

  playToggle() {
    withAudio((context) => woodKnock(context, context.currentTime, 0.075, 330));
  },

  playThrow() {
    withAudio((context) => {
      const at = context.currentTime;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = getNoise(context);
      filter.type = "bandpass";
      filter.Q.value = 0.72;
      filter.frequency.setValueAtTime(380, at);
      filter.frequency.exponentialRampToValueAtTime(1650, at + 0.24);
      shapeEnvelope(gain.gain, at, 0.105, 0.035, 0.26);
      source.connect(filter);
      filter.connect(gain);
      connectWithPan(context, gain, 0);
      source.start(at);
      source.stop(at + 0.31);
      woodKnock(context, at, 0.055, 185, -0.18);
      woodKnock(context, at + 0.055, 0.045, 225, 0.18);
    });
  },

  playYutImpact(intensity: number, pan: number) {
    const now = performance.now();
    if (now - lastImpactAt < 32) return;
    lastImpactAt = now;
    withAudio((context) => {
      const strength = Math.max(0.65, Math.min(1.7, intensity));
      woodKnock(
        context,
        context.currentTime,
        0.075 * strength,
        145 + Math.random() * 75,
        pan,
      );
    });
  },

  playPieceStep() {
    withAudio((context) => {
      woodKnock(context, context.currentTime, 0.055, 285 + Math.random() * 42);
    });
  },

  playStack() {
    withAudio((context) => {
      const at = context.currentTime;
      woodKnock(context, at, 0.062, 260, -0.08);
      woodKnock(context, at + 0.07, 0.07, 375, 0.08);
    });
  },

  playCapture() {
    withAudio((context) => {
      const at = context.currentTime;
      woodKnock(context, at, 0.105, 205, -0.12);
      woodKnock(context, at + 0.065, 0.085, 135, 0.12);
    });
  },

  playResult(steps: number) {
    withAudio((context) => {
      const at = context.currentTime;
      if (steps < 0) {
        resultTone(context, at, 0.055, 340);
        resultTone(context, at + 0.12, 0.062, 205);
        woodKnock(context, at + 0.02, 0.04, 175);
        return;
      }

      if (steps >= 4) {
        const highNote = steps === 5 ? 720 : 650;
        resultTone(context, at, 0.058, 480);
        resultTone(context, at + 0.11, 0.07, highNote);
        woodKnock(context, at + 0.015, 0.045, 245);
        return;
      }

      resultTone(context, at, 0.058, 350 + steps * 62);
      woodKnock(context, at + 0.012, 0.038, 215 + steps * 18);
    });
  },

  playVictory() {
    withAudio((context) => {
      const at = context.currentTime;
      resultTone(context, at, 0.06, 392);
      resultTone(context, at + 0.13, 0.068, 523.25);
      resultTone(context, at + 0.27, 0.082, 659.25);
      woodKnock(context, at + 0.02, 0.055, 250, -0.15);
      woodKnock(context, at + 0.3, 0.085, 315, 0.15);
    });
  },
};
