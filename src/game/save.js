// No-DB persistence: one localStorage slot per browser. The shared leaderboard
// lives on the game server as a JSON file — see server.js.
const KEY = 'gta7-interstellar-save'

export function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function initPersistence(useStore) {
  let t
  useStore.subscribe((s) => {
    if (!s.started) return
    clearTimeout(t)
    t = setTimeout(() => {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            name: s.pilotName,
            cash: s.cash,
            chapter: s.chapter,
            freeroam: s.stage === 'freeroam',
            upgrades: s.upgrades,
            paint: s.paint,
            bestMs: s.race.bestMs,
          }),
        )
      } catch {}
    }, 400)
  })
}
