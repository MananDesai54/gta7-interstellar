import { world, setAnchor } from './world'

// Free-roam side jobs, unlocked after the story. Markers anchor to the
// orbiting bodies so they ride along with the planets.
export const MISSIONS = [
  { pickup: 'Steal moon-dust crate off Earth orbit', from: 'earth', deliver: "Smuggle it to Saturn's rings", to: 'saturn', pay: 500 },
  { pickup: 'Grab black-market fuel cells near Mars', from: 'mars', deliver: 'Drop at Earth low orbit', to: 'earth', pay: 650 },
  { pickup: 'Boost a data core from the derelict near Gargantua', from: 'gargantua', deliver: 'Fence it at Saturn station', to: 'saturn', pay: 1200 },
  { pickup: 'Skim coronal samples off Helios', from: 'helios', deliver: 'Deliver to the Mars lab', to: 'mars', pay: 1500 },
  { pickup: 'Pick up a "passenger" hiding near Saturn', from: 'saturn', deliver: 'Lose him near the black hole', to: 'gargantua', pay: 900 },
  // ferry fares: the meter is running — blow the deadline, lose the fare
  { pickup: 'Ferry a nervous banker from Earth orbit', from: 'earth', deliver: 'Mars departure gate, NOW', to: 'mars', pay: 1100, timed: 75 },
  { pickup: 'Grab a Vega courtroom witness near Saturn', from: 'saturn', deliver: 'Earth marshal office before the trial', to: 'earth', pay: 1400, timed: 90 },
  { pickup: 'Organ transplant pod at Mars', from: 'mars', deliver: 'Saturn med-station — it is on ice', to: 'saturn', pay: 1700, timed: 95 },
]

function offsetFor(body) {
  const r = body === 'helios' ? 1100 : body === 'gargantua' ? 950 : 750
  const a = Math.random() * Math.PI * 2
  return [Math.cos(a) * r, (Math.random() - 0.5) * 200, Math.sin(a) * r]
}

export function newMission(setMission) {
  const m = MISSIONS[Math.floor(Math.random() * MISSIONS.length)]
  world.mission = m
  world.missionPhase = 0
  world.markerHidden = false
  world.missionDeadline = 0
  setAnchor({ body: m.from, offset: offsetFor(m.from) })
  setMission(m.timed ? 'FERRY FARE' : 'SIDE JOB', m.pickup + ' — follow the gold marker.')
}

export function advanceMission(store) {
  const m = world.mission
  if (!m) return
  if (world.missionPhase === 0) {
    world.missionPhase = 1
    setAnchor({ body: m.to, offset: offsetFor(m.to) })
    if (m.timed) {
      world.missionDeadline = performance.now() + m.timed * 1000
      store.setMission('FERRY FARE', m.deliver + ` — ${m.timed}s on the clock. Overdrive (X).`)
      store.showBanner('METER RUNNING — GO', '#ff7a22')
    } else {
      store.setMission('CARGO SECURED', m.deliver + ' — marker updated.')
      store.showBanner('PICKUP COMPLETE')
    }
  } else {
    world.missionDeadline = 0
    store.addCash(m.pay)
    store.showBanner('MISSION PASSED — $' + m.pay, '#6dd96d')
    newMission(store.setMission)
  }
}

export function failMission(store) {
  world.missionDeadline = 0
  store.showBanner('FARE LOST — TOO SLOW', '#ff5544')
  newMission(store.setMission)
}
