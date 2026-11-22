// Sound, synthesised in code with WebAudio — no audio files, no network.
// Footstep ticks, a pickup chime, the cone-alert sting, the alarm pulse, the
// vault clunk and the getaway jingle. Everything is guarded: no context, no
// sound, no error.

let context = null;
let muted = false;
let humNodes = null;

export function setMuted(value) {
  muted = value;
  if (humNodes) humNodes.gain.gain.value = value ? 0 : 0.02;
}

export function isMuted() {
  return muted;
}

function audio() {
  if (muted) return null;
  try {
    if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

function tone(freq, seconds, type, volume, when = 0) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + seconds + 0.02);
  } catch {
    // A failed blip never stops the heist.
  }
}

export function playStep() {
  tone(190, 0.05, 'square', 0.015);
}

export function playPickup() {
  tone(880, 0.09, 'sine', 0.08);
  tone(1318, 0.12, 'sine', 0.07, 0.07);
}

export function playJewel() {
  tone(1046, 0.1, 'sine', 0.09);
  tone(1318, 0.1, 'sine', 0.09, 0.08);
  tone(1568, 0.16, 'sine', 0.09, 0.16);
}

export function playAlert() {
  tone(620, 0.14, 'sawtooth', 0.06);
  tone(466, 0.18, 'sawtooth', 0.06, 0.12);
}

export function playAlarmPulse() {
  tone(520, 0.1, 'square', 0.04);
}

export function playDoor() {
  tone(120, 0.22, 'triangle', 0.12);
  tone(82, 0.3, 'triangle', 0.1, 0.1);
}

export function playCoin() {
  tone(2400, 0.06, 'sine', 0.05);
  tone(1800, 0.08, 'sine', 0.04, 0.05);
}

export function playWin() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => tone(freq, 0.22, 'sine', 0.09, i * 0.12));
}

export function playCaught() {
  tone(220, 0.3, 'sawtooth', 0.08);
  tone(165, 0.4, 'sawtooth', 0.08, 0.22);
}

/** The camera sweep hum: one quiet oscillator, started on the first gesture. */
export function startHum() {
  const ctx = audio();
  if (!ctx || humNodes) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;
    gain.gain.value = muted ? 0 : 0.02;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    humNodes = { osc, gain };
  } catch {
    humNodes = null;
  }
}
