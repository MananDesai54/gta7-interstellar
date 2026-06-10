let actx = null

export function initAudio() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)()
}

export function beep(freq, dur = 0.08, type = 'square') {
  if (!actx) return
  const o = actx.createOscillator()
  const g = actx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.value = 0.04
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur)
  o.connect(g)
  g.connect(actx.destination)
  o.start()
  o.stop(actx.currentTime + dur)
}
