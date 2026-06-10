let actx = null
let engine = null
let radio = null

export function initAudio() {
  if (actx) return
  actx = new (window.AudioContext || window.webkitAudioContext)()

  // engine hum: filtered saw, gain/pitch follow throttle
  const osc = actx.createOscillator()
  const gain = actx.createGain()
  const filter = actx.createBiquadFilter()
  osc.type = 'sawtooth'
  osc.frequency.value = 42
  filter.type = 'lowpass'
  filter.frequency.value = 240
  gain.gain.value = 0
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(actx.destination)
  osc.start()
  engine = { osc, gain, filter }
}

// throttle 0..1, boosting bool — called every frame from PlayerShip
export function setEngine(throttle, boosting) {
  if (!engine) return
  const t = actx.currentTime
  const target = throttle * 0.035 + (boosting ? 0.025 : 0)
  engine.gain.gain.setTargetAtTime(target, t, 0.08)
  engine.osc.frequency.setTargetAtTime(42 + throttle * 38 + (boosting ? 26 : 0), t, 0.1)
  engine.filter.frequency.setTargetAtTime(240 + throttle * 500 + (boosting ? 600 : 0), t, 0.1)
}

// dist scales volume — cheap spatial audio
export function beep(freq, dur = 0.08, type = 'square', dist = 0) {
  if (!actx) return
  const vol = 0.04 / (1 + dist / 500)
  if (vol < 0.002) return
  const o = actx.createOscillator()
  const g = actx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.value = vol
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur)
  o.connect(g)
  g.connect(actx.destination)
  o.start()
  o.stop(actx.currentTime + dur)
}

// ---- procedural radio ----
// each station: pentatonic-ish loop with its own wave/tempo/register
const TUNES = [
  { wave: 'sine', bpm: 60, base: 220, steps: [0, 3, 7, 10, 7, 3], sustain: 0.9 }, // Gargantua FM — slow drones
  { wave: 'square', bpm: 132, base: 330, steps: [0, 7, 12, 7, 3, 10, 7, 5], sustain: 0.18 }, // Ring Road — drift hits
  { wave: 'triangle', bpm: 88, base: 262, steps: [0, 4, 7, 12, 7, 4], sustain: 0.4 }, // Blue Marble — anthems
  { wave: 'sawtooth', bpm: 96, base: 110, steps: [0, 0, 12, 0, 10, 0, 7, 5], sustain: 0.12 }, // K-SLIP — bass rap
  { wave: 'sine', bpm: 70, base: 392, steps: [0, 2, 5, 9, 5, 2], sustain: 0.6 }, // Helios Heat
  null, // Static FM — noise
]

export function startRadio(stationIdx) {
  stopRadio()
  if (!actx) return
  const tune = TUNES[stationIdx % TUNES.length]
  if (!tune) {
    // static: looping noise hiss
    const buf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.012
    const src = actx.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.connect(actx.destination)
    src.start()
    radio = { src }
    return
  }
  let step = 0
  const beat = 60 / tune.bpm
  let nextAt = actx.currentTime + 0.1
  const iv = setInterval(() => {
    while (nextAt < actx.currentTime + 0.4) {
      const semis = tune.steps[step % tune.steps.length]
      const freq = tune.base * Math.pow(2, semis / 12)
      const o = actx.createOscillator()
      const g = actx.createGain()
      o.type = tune.wave
      o.frequency.value = freq
      g.gain.setValueAtTime(0.018, nextAt)
      g.gain.exponentialRampToValueAtTime(0.0003, nextAt + beat * tune.sustain)
      o.connect(g)
      g.connect(actx.destination)
      o.start(nextAt)
      o.stop(nextAt + beat * tune.sustain + 0.05)
      nextAt += beat
      step++
    }
  }, 150)
  radio = { iv }
}

export function stopRadio() {
  if (!radio) return
  if (radio.iv) clearInterval(radio.iv)
  if (radio.src) {
    try { radio.src.stop() } catch {}
  }
  radio = null
}
