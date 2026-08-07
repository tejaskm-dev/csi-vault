// src/lib/sound.ts

let audioCtx: AudioContext | null = null;
let isMuted = localStorage.getItem("csi_sound_muted") === "true";

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function setMuted(muted: boolean) {
  isMuted = muted;
  localStorage.setItem("csi_sound_muted", muted ? "true" : "false");
}

export function getMuted(): boolean {
  return isMuted;
}

/** Play a single chiptune tone with exponential decay */
function playTone(
  freq: number,
  type: OscillatorType,
  durationMs: number,
  delayMs: number = 0,
  volume: number = 0.08
) {
  if (isMuted) return;

  setTimeout(() => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      // Decay exponentially to avoid sharp clicks
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }, delayMs);
}

// 180Hz square, 40ms, quiet
export function playTap() {
  playTone(180, "square", 40, 0, 0.05);
}

// 440Hz square, 60ms
export function playSelect() {
  playTone(440, "square", 60, 0, 0.08);
}

// rising arpeggio 523/659/784Hz, 90ms each
export function playCorrect() {
  playTone(523, "square", 90, 0, 0.08);
  playTone(659, "square", 90, 90, 0.08);
  playTone(784, "square", 90, 180, 0.08);
}

// 220→165Hz sawtooth glide, 200ms — soft, not punishing
export function playWrong() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(165, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

// 392/523/659/880Hz, 70ms apart
export function playUnlock() {
  playTone(392, "square", 150, 0, 0.08);
  playTone(523, "square", 150, 70, 0.08);
  playTone(659, "square", 150, 140, 0.08);
  playTone(880, "square", 200, 210, 0.08);
}

// 523/659/784/1046Hz with a detuned second oscillator for a tail
export function playComplete() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      const timeOffset = idx * 0.08;

      // Main Oscillator
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);

      gain1.gain.setValueAtTime(0.08, ctx.currentTime + timeOffset);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + timeOffset + 0.4);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime + timeOffset);
      osc1.stop(ctx.currentTime + timeOffset + 0.4);

      // Detuned Second Oscillator
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sawtooth";
      osc2.detune.setValueAtTime(15, ctx.currentTime + timeOffset);
      osc2.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);

      gain2.gain.setValueAtTime(0.04, ctx.currentTime + timeOffset);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + timeOffset + 0.4);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + timeOffset);
      osc2.stop(ctx.currentTime + timeOffset + 0.4);
    });
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}
