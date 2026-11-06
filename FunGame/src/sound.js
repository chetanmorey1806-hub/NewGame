// Small Web Audio synth — no audio files needed.
let ctx = null
let muted = false

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, dur = 0.1, type = 'square', vol = 0.15, delay = 0) {
  if (muted) return
  const a = ac()
  if (!a) return
  const t = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export const sound = {
  setMuted(m) { muted = m },
  isMuted() { return muted },
  unlock() { ac() },
  chip() { tone(1200, 0.05, 'triangle', 0.2); tone(1800, 0.04, 'triangle', 0.12, 0.03) },
  select() { tone(700, 0.05, 'sine', 0.15) },
  beep() { tone(880, 0.12, 'square', 0.12) },
  lastBeep() { tone(1320, 0.3, 'square', 0.15) },
  tick() { tone(2000, 0.025, 'square', 0.08) },
  coin() { tone(1500 + Math.random() * 600, 0.08, 'triangle', 0.1) },
  win() {
    ;[523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.18, i * 0.11))
  },
  bonus() {
    ;[392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.12, 'sawtooth', 0.1, i * 0.07))
  },
  lose() { tone(300, 0.25, 'sawtooth', 0.1); tone(200, 0.4, 'sawtooth', 0.1, 0.2) },
  cancel() { tone(400, 0.1, 'sine', 0.15); tone(300, 0.12, 'sine', 0.15, 0.08) },
}
