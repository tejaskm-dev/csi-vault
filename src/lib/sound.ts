let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("csi_muted") === "true";
}

export function toggleMute(): boolean {
  const current = isMuted();
  const next = !current;
  localStorage.setItem("csi_muted", String(next));
  return next;
}

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gainValue: number = 0.15,
  delayMs: number = 0
) {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const startTime = ctx.currentTime + delayMs / 1000;
  const stopTime = startTime + durationMs / 1000;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Short attack to avoid clicks, exponential decay
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(stopTime + 0.05);
}

/** 180Hz square, 40ms, gain 0.06. Every button. */
export function soundTap() {
  tone(180, 40, "square", 0.06);
}

/** 440Hz sine, 60ms. Answer option chosen. */
export function soundSelect() {
  tone(440, 60, "sine", 0.12);
}

/** Arpeggio: 523 / 659 / 784Hz, 90ms each, 60ms apart. Triangle. */
export function soundCorrect() {
  tone(523, 90, "triangle", 0.15, 0);
  tone(659, 90, "triangle", 0.15, 60);
  tone(784, 120, "triangle", 0.18, 120);
}

/** 220Hz -> 165Hz sawtooth glide, 200ms, gain 0.10. Soft, not harsh. */
export function soundWrong() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const startTime = ctx.currentTime;
  const stopTime = startTime + 0.2;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, startTime);
  osc.frequency.exponentialRampToValueAtTime(165, stopTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(0.1, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(stopTime + 0.05);
}

/** 392 / 523 / 659 / 880Hz, 70ms apart, rising. Fires with the wipe. */
export function soundUnlock() {
  tone(392, 80, "sine", 0.12, 0);
  tone(523, 80, "sine", 0.14, 70);
  tone(659, 80, "sine", 0.16, 140);
  tone(880, 140, "sine", 0.18, 210);
}

/** 523 / 659 / 784 / 1046Hz, 120ms apart, plus 3s reverb tail. */
export function soundComplete() {
  tone(523, 150, "triangle", 0.15, 0);
  tone(659, 150, "triangle", 0.15, 120);
  tone(784, 150, "triangle", 0.18, 240);
  tone(1046, 300, "triangle", 0.22, 360);
  // Detuned tail
  tone(1050, 600, "sine", 0.08, 480);
}
