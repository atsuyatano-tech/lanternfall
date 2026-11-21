// audio.js — every sound is synthesised with WebAudio; there are no files.
// The context is created lazily on the first user input (browser policy), and
// every call is a no-op until then, so the game is silent-safe in headless
// runs and screenshot staging.

let ctx = null;
let master = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

function tone(freqA, freqB, dur, type, vol, when = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqA, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqB), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, freq, when = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.9;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

/** A soft footstep scuff. */
export function playStep(run = false) {
  noiseBurst(run ? 0.09 : 0.05, run ? 0.16 : 0.07, run ? 700 : 480);
}

/** The bright clink of a coin landing on stone. */
export function playCoin() {
  tone(2093, 1568, 0.16, 'sine', 0.22);
  tone(2637, 2093, 0.22, 'sine', 0.14, 0.045);
  noiseBurst(0.03, 0.05, 3200);
}

/** A guard has turned suspicious — a short, rising sting. */
export function playSting() {
  tone(392, 587, 0.16, 'triangle', 0.2);
  tone(587, 880, 0.2, 'triangle', 0.16, 0.07);
}

/** Full alarm: the chase is on. */
export function playAlarm() {
  tone(220, 110, 0.4, 'sawtooth', 0.16);
  tone(233, 116, 0.4, 'sawtooth', 0.12, 0.05);
}

/** Ledger taken / level complete — a small warm chime. */
export function playChime() {
  tone(523, 523, 0.14, 'sine', 0.18);
  tone(659, 659, 0.14, 'sine', 0.18, 0.09);
  tone(784, 784, 0.26, 'sine', 0.2, 0.18);
}

/** Caught. */
export function playCaught() {
  tone(330, 82, 0.7, 'sawtooth', 0.2);
  noiseBurst(0.3, 0.1, 300, 0.05);
}
