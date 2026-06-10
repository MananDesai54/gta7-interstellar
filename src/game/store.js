import { create } from 'zustand'
import { world, setAnchor } from './world'
import { STATIONS } from './constants'
import { STORY, EPILOGUE } from './story'
import { newMission } from './missions'

let copId = 0

export const useStore = create((set, get) => ({
  started: false,
  dead: false,
  deathReason: '',
  hp: 100,
  boost: 100,
  cash: 0,
  wanted: 0,
  missionTitle: '',
  missionBody: '',
  banner: null,
  station: 0,
  cops: [],

  // multiplayer
  pilotName: 'DRIFTER',
  remoteIds: [],
  setRemoteIds: (remoteIds) => set({ remoteIds }),

  // story
  chapter: 0, // index into STORY; STORY.length => free roam
  stage: 'dialogue', // 'dialogue' | 'active' | 'freeroam'
  lineIdx: 0,
  dialogue: null, // current lines array being shown
  copsKilled: 0,
  checkpointIdx: 0,
  carryingCore: false,

  start: (pilotName) => {
    set({ started: true, pilotName, dialogue: STORY[0].lines, lineIdx: 0, stage: 'dialogue', chapter: 0 })
    world.markerHidden = true
  },

  advanceLine: () => {
    const s = get()
    if (s.stage !== 'dialogue' || !s.dialogue) return
    if (s.lineIdx + 1 < s.dialogue.length) {
      set({ lineIdx: s.lineIdx + 1 })
      return
    }
    // dialogue over
    if (s.chapter >= STORY.length) {
      // epilogue finished -> free roam with side jobs
      set({ stage: 'freeroam', dialogue: null })
      world.markerHidden = false
      newMission(get().setMission)
      return
    }
    get().beginObjective()
  },

  beginObjective: () => {
    const s = get()
    const ch = STORY[s.chapter]
    const obj = ch.objective
    set({
      stage: 'active',
      dialogue: null,
      copsKilled: 0,
      checkpointIdx: 0,
      carryingCore: false,
      missionTitle: `CH ${ch.id} — ${ch.title}`,
      missionBody: obj.text,
    })
    world.markerHidden = false
    if (obj.type === 'goto' || obj.type === 'corewell') setAnchor(obj.anchor)
    else if (obj.type === 'checkpoints') setAnchor(obj.anchors[0])
    else if (obj.type === 'destroyCops') {
      world.markerHidden = true
      setAnchor(null)
      get().setWanted(obj.wanted || 2)
    }
  },

  onCheckpoint: () => {
    const s = get()
    const obj = STORY[s.chapter].objective
    const next = s.checkpointIdx + 1
    if (next < obj.anchors.length) {
      set({ checkpointIdx: next, missionBody: `${obj.text} (${next}/${obj.anchors.length})` })
      setAnchor(obj.anchors[next])
      get().showBanner(`BUOY ${next}/${obj.anchors.length}`)
    } else {
      get().completeChapter()
    }
  },

  onCopKilled: () => {
    const s = get()
    if (s.stage !== 'active' || s.chapter >= STORY.length) return
    const obj = STORY[s.chapter].objective
    if (obj.type !== 'destroyCops') return
    const n = s.copsKilled + 1
    set({ copsKilled: n, missionBody: `${obj.text} (${Math.min(n, obj.count)}/${obj.count})` })
    if (n >= obj.count) {
      if (obj.needCool) {
        set({ missionBody: 'Now lose the heat — stay clear of patrols until the stars fade.' })
      } else {
        get().completeChapter()
      }
    }
  },

  // called by PlayerShip when wanted hits 0 during a needCool objective
  onHeatLost: () => {
    const s = get()
    if (s.stage !== 'active' || s.chapter >= STORY.length) return
    const obj = STORY[s.chapter].objective
    if (obj.type === 'destroyCops' && obj.needCool && s.copsKilled >= obj.count) get().completeChapter()
  },

  pickupCore: () => {
    const s = get()
    const obj = STORY[s.chapter].objective
    set({ carryingCore: true, missionBody: obj.escapeText })
    world.markerHidden = true
    get().showBanner('CORE SECURED')
  },

  completeChapter: () => {
    const s = get()
    const ch = STORY[s.chapter]
    get().addCash(ch.pay)
    get().showBanner(`MISSION PASSED — $${ch.pay}`, '#6dd96d')
    world.markerHidden = true
    setAnchor(null)
    const nextCh = s.chapter + 1
    setTimeout(() => {
      if (nextCh < STORY.length) {
        set({ chapter: nextCh, stage: 'dialogue', dialogue: STORY[nextCh].lines, lineIdx: 0 })
      } else {
        set({ chapter: nextCh, stage: 'dialogue', dialogue: EPILOGUE, lineIdx: 0, missionTitle: 'THE DRIFT', missionBody: '' })
      }
    }, 2400)
  },

  setMission: (missionTitle, missionBody) => set({ missionTitle, missionBody }),

  showBanner: (text, color = '#f5c843') => {
    set({ banner: { text, color } })
    setTimeout(() => {
      if (get().banner?.text === text) set({ banner: null })
    }, 2200)
  },

  addCash: (n) => set((s) => ({ cash: Math.max(0, s.cash + n) })),
  setBoost: (boost) => set({ boost }),
  setWanted: (w) => set({ wanted: Math.max(0, Math.min(5, w)) }),
  nextStation: () => set((s) => ({ station: (s.station + 1) % STATIONS.length })),

  spawnCop: () => set((s) => ({ cops: [...s.cops, ++copId] })),
  killCop: (id) => {
    world.cops.delete(id)
    set((s) => ({ cops: s.cops.filter((c) => c !== id) }))
  },

  damage: (n, reason) => {
    const s = get()
    if (s.dead || !s.started) return
    const hp = s.hp - n
    set({ hp })
    if (hp <= 0) get().kill(reason)
  },

  kill: (reason) => {
    if (get().dead) return
    world.explode(world.playerPos.clone(), '#ff5500')
    set({ dead: true, deathReason: reason })
    setTimeout(() => {
      world.cops.clear()
      world.playerVel.set(0, 0, 0)
      world.resetPlayer = true
      const s = get()
      // dying mid-objective restarts the objective
      const patch = {
        dead: false,
        hp: 100,
        boost: 100,
        wanted: 0,
        cops: [],
        cash: Math.max(0, s.cash - 200),
      }
      set(patch)
      if (s.stage === 'active' && s.chapter < STORY.length) get().beginObjective()
      else get().setMission('BACK IN ACTION', reason + ' Dry-dock fee: $200.')
    }, 3200)
  },
}))
