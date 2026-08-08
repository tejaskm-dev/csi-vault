// src/lib/sound.ts
//
// Synthesised UI audio — no files, no library, nothing to download.
//
// The previous version was one bare oscillator per note straight into
// destination, and it sounded thin and clicky for three specific reasons:
//
//   1. NO ATTACK RAMP. `gain.setValueAtTime(vol)` jumps the signal from 0 to
//      full in one sample. That discontinuity is an audible click on top of
//      every sound. UI clicks want a very fast attack — under a millisecond —
//      but not an instantaneous one.
//   2. NO LAYERS. A single square wave has no body. Real UI sound is layered:
//      a crisp transient (filtered noise) for the "click", a tonal element for
//      the pitch, and sometimes a low thump for weight. Different frequency
//      bands, so they add depth instead of fighting.
//   3. NO FILTER. Raw square and sawtooth are all harmonics and no shape.
//      Everything here runs through a lowpass so it reads as an instrument
//      rather than a buzzer.
//
// Two more things that matter at this scale: everything is scheduled on the
// AudioContext clock rather than setTimeout, so arpeggios are sample-accurate
// instead of drifting with the main thread; and the tap — which fires on
// literally every press — gets a small random pitch offset, because an
// identical sound a few hundred times in fifteen minutes becomes grating.

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;
let isMuted = localStorage.getItem("csi_sound_muted") === "true";

function ctx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // A limiter on the bus. Layered voices sum, and without this the
    // celebration stack clips into distortion on phone speakers.
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;

    master = audioCtx.createGain();
    master.gain.value = 0.85;
    master.connect(comp);
    comp.connect(audioCtx.destination);
  }
  // iOS suspends the context until a gesture; without this it plays silence.
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

export function setMuted(muted: boolean) {
  isMuted = muted;
  localStorage.setItem("csi_sound_muted", muted ? "true" : "false");
}

export function getMuted(): boolean {
  return isMuted;
}

interface VoiceOpts {
  freq: number;
  type?: OscillatorType;
  /** Seconds from now. */
  at?: number;
  dur?: number;
  vol?: number;
  /** Glide to this frequency across the note. */
  to?: number;
  /** Lowpass cutoff. */
  cutoff?: number;
  /** Cents. */
  detune?: number;
  /** Attack in seconds — short, but never zero. */
  attack?: number;
}

function voice({
  freq,
  type = "triangle",
  at = 0,
  dur = 0.18,
  vol = 0.16,
  to,
  cutoff = 4200,
  detune = 0,
  attack = 0.004,
}: VoiceOpts) {
  const c = ctx();
  const t = c.currentTime + at;

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.detune.setValueAtTime(detune, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(cutoff, t);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack); // the ramp that kills the click
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(lp);
  lp.connect(g);
  g.connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** The transient. This is the part the ear reads as "a click happened". */
function tick({
  at = 0,
  dur = 0.03,
  vol = 0.16,
  freq = 1800,
  q = 0.9,
  type = "bandpass" as BiquadFilterType,
}) {
  const c = ctx();
  const t = c.currentTime + at;

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);

  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = q;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(f);
  f.connect(g);
  g.connect(master!);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/* ================================================================
   THE SOUNDS
   Each one is mapped to a single mechanic, so the audio alone tells
   you what happened without looking.
   ================================================================ */

/** Every press. Quiet, short, and slightly different each time. */
export function playTap() {
  if (isMuted) return;
  const wobble = (Math.random() - 0.5) * 90; // cents
  tick({ dur: 0.022, vol: 0.1, freq: 2000, q: 0.7 });
  voice({ freq: 200, type: "sine", dur: 0.055, vol: 0.13, detune: wobble, cutoff: 900 });
}

/** Choosing an answer — same family as the tap, a step brighter. */
export function playSelect() {
  if (isMuted) return;
  tick({ dur: 0.02, vol: 0.09, freq: 2600, q: 0.8 });
  voice({ freq: 494, type: "triangle", dur: 0.09, vol: 0.14, cutoff: 3000 });
  voice({ freq: 740, type: "sine", at: 0.045, dur: 0.09, vol: 0.09 });
}

/** Right answer. Rising major triad, sub underneath, sparkle on top. */
export function playCorrect() {
  if (isMuted) return;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((f, i) => {
    const at = i * 0.07;
    voice({ freq: f, type: "triangle", at, dur: 0.22, vol: 0.16, cutoff: 5200 });
    voice({ freq: f / 2, type: "sine", at, dur: 0.22, vol: 0.07 });
  });
  voice({ freq: 1046.5, type: "sine", at: 0.21, dur: 0.34, vol: 0.11 });
  tick({ at: 0.21, dur: 0.1, vol: 0.05, freq: 6500, q: 0.5, type: "highpass" });
}

/** Wrong answer. Soft downward thud — a correction, not a punishment. */
export function playWrong() {
  if (isMuted) return;
  tick({ dur: 0.05, vol: 0.07, freq: 420, q: 0.7, type: "lowpass" });
  voice({ freq: 233, to: 155, type: "triangle", dur: 0.26, vol: 0.15, cutoff: 1100 });
  voice({ freq: 116, to: 78, type: "sine", dur: 0.3, vol: 0.11, cutoff: 700 });
}

/** A digit unlocking. Mechanical clunk, then the latch rising. */
export function playUnlock() {
  if (isMuted) return;
  tick({ dur: 0.07, vol: 0.14, freq: 320, q: 0.6, type: "lowpass" });
  voice({ freq: 98, type: "sine", dur: 0.14, vol: 0.16, cutoff: 600 });
  [392, 523.25, 659.25, 880].forEach((f, i) => {
    const at = 0.07 + i * 0.075;
    voice({ freq: f, type: "square", at, dur: 0.2, vol: 0.075, cutoff: 2600 });
    voice({ freq: f, type: "triangle", at, dur: 0.24, vol: 0.1, cutoff: 5000 });
  });
}

/** All nine. The only fanfare in the game — octave and fifth on every note. */
export function playComplete() {
  if (isMuted) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    const at = i * 0.11;
    const last = i === notes.length - 1;
    const dur = last ? 0.85 : 0.34;
    voice({ freq: f, type: "triangle", at, dur, vol: 0.16, cutoff: 6000 });
    voice({ freq: f * 2, type: "sine", at, dur: dur * 0.8, vol: 0.06 });
    voice({ freq: f * 1.5, type: "sine", at, dur: dur * 0.7, vol: 0.05 });
    voice({ freq: f / 2, type: "sine", at, dur, vol: 0.09, cutoff: 900 });
  });
  tick({ at: 0.33, dur: 0.5, vol: 0.045, freq: 7000, q: 0.4, type: "highpass" });
}
