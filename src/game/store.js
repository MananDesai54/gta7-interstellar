import { create } from 'zustand'
import { world, setAnchor } from './world'
import { STATIONS } from './constants'
import { STORY, EPILOGUE } from './story'
import { newMission } from './missions'
import { SHOP, PAINTS, maxHpFor, maxBoostFor, ORE_PRICE } from './shop'
import { loadSave, initPersistence, wipeSave } from './save'
import { DISCOVERIES } from './discoveries'

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

  pilotName: 'DRIFTER',
  paused: false,
  showLog: false,
  ore: 0,
  discoveries: [],
  chapterCard: null, // {num, title} — GTA-style mission intro card
  surface: null, // 'earth'|'mars'|'luna' while landed
  landPrompt: null, // body name when close enough to land
  surfaceJob: 0, // 0 none, 1 pickup set, 2 delivering
  onFoot: false, // pilot is outside the ship on a surface
  setOnFoot: (onFoot) => set({ onFoot }),
  stats: { kills: 0, deaths: 0, earned: 0, busts: 0 },
  prestige: 0,

  addKill: () => set((s) => ({ stats: { ...s.stats, kills: s.stats.kills + 1 } })),

  // NG+: story resets, everything you own comes with you, story pay +50%/run
  doPrestige: () => {
    const s = get()
    if (s.chapter < STORY.length) return
    set({
      prestige: s.prestige + 1,
      chapter: 0,
      stage: 'dialogue',
      dialogue: STORY[0].lines,
      lineIdx: 0,
      paused: false,
      surfaceJob: 0,
    })
    world.markerHidden = true
    setAnchor(null)
    get().showBanner(`NEW GAME+ ${'★'.repeat(s.prestige + 1)} — THE DRIFT REMEMBERS`, '#b08bff')
  },

  setSurface: (surface) => set({ surface }),
  setLandPrompt: (landPrompt) => {
    if (get().landPrompt !== landPrompt) set({ landPrompt })
  },
  setSurfaceJob: (surfaceJob) => set({ surfaceJob }),

  // garage
  upgrades: {},
  paint: '#ff7a00',
  shopOpen: false,
  nearStation: false,

  // races
  race: { active: false, idx: 0, t0: 0, lastMs: null, bestMs: null },

  // story
  chapter: 0,
  stage: 'dialogue', // 'dialogue' | 'active' | 'freeroam'
  lineIdx: 0,
  dialogue: null,
  copsKilled: 0,
  checkpointIdx: 0,
  carryingCore: false,

  maxHp: () => maxHpFor(get().upgrades),
  maxBoost: () => maxBoostFor(get().upgrades),

  start: (pilotName) => {
    const save = loadSave()
    const patch = { started: true, pilotName }
    if (save) {
      patch.cash = save.cash || 0
      patch.upgrades = save.upgrades || {}
      patch.paint = save.paint || '#ff7a00'
      patch.race = { active: false, idx: 0, t0: 0, lastMs: null, bestMs: save.bestMs ?? null }
      patch.chapter = Math.min(save.chapter || 0, STORY.length)
      patch.ore = save.ore || 0
      patch.discoveries = save.discoveries || []
      patch.stats = { kills: 0, deaths: 0, earned: 0, busts: 0, ...(save.stats || {}) }
      patch.prestige = save.prestige || 0
    }
    patch.hp = maxHpFor(patch.upgrades || {})
    set(patch)
    const s = get()
    if (save?.freeroam) {
      set({ stage: 'freeroam', dialogue: null })
      world.markerHidden = false
      newMission(s.setMission)
      s.showBanner('SAVE LOADED', '#7ec8ff')
    } else {
      const ch = Math.min(s.chapter, STORY.length - 1)
      set({ chapter: ch, dialogue: STORY[ch].lines, lineIdx: 0, stage: 'dialogue' })
      world.markerHidden = true
      if (save) s.showBanner('SAVE LOADED', '#7ec8ff')
    }
    initPersistence(useStore)
  },

  advanceLine: () => {
    const s = get()
    if (s.stage !== 'dialogue' || !s.dialogue) return
    if (s.lineIdx + 1 < s.dialogue.length) {
      set({ lineIdx: s.lineIdx + 1 })
      return
    }
    if (s.chapter >= STORY.length) {
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
      chapterCard: { num: ch.id, title: ch.title },
    })
    setTimeout(() => {
      if (get().chapterCard?.num === ch.id) set({ chapterCard: null })
    }, 3400)
    world.markerHidden = false
    if (obj.anchorStatic) setAnchor({ static: obj.anchorStatic })
    else if (obj.type === 'goto' || obj.type === 'corewell') setAnchor(obj.anchor)
    else if (obj.type === 'checkpoints') setAnchor(obj.anchors[0])
    if (obj.type === 'destroyCops') {
      world.markerHidden = true
      setAnchor(null)
      get().setWanted(obj.wanted || 2)
    }
  },

  // ---- exploration / mining / pirates ----
  discover: (id) => {
    const s = get()
    if (s.discoveries.includes(id)) return
    const d = DISCOVERIES.find((x) => x.id === id)
    if (!d) return
    set({ discoveries: [...s.discoveries, id], cash: s.cash + d.bonus })
    get().showBanner(`DISCOVERED: ${d.name} +$${d.bonus}`, '#41d6ff')
  },
  toggleLog: () => set((s) => ({ showLog: !s.showLog })),

  collectOre: () => {
    const s = get()
    set({ ore: s.ore + 1 })
    if (s.stage === 'active' && s.chapter < STORY.length) {
      const obj = STORY[s.chapter].objective
      if (obj.type === 'collectOre') {
        const have = s.ore + 1
        set({ missionBody: `${obj.text} (${Math.min(have, obj.count)}/${obj.count})` })
        if (have >= obj.count) get().completeChapter()
      }
    }
  },
  sellOre: () => {
    const s = get()
    if (s.ore <= 0) return
    const total = s.ore * ORE_PRICE
    set({ ore: 0, cash: s.cash + total })
    get().showBanner(`ORE SOLD — $${total}`, '#6dd96d')
  },

  onBossKilled: () => {
    const s = get()
    if (s.stage === 'active' && s.chapter < STORY.length && STORY[s.chapter].objective.type === 'destroyBoss') {
      get().completeChapter()
    }
  },

  togglePause: () => {
    const s = get()
    if (!s.started || s.shopOpen || s.stage === 'dialogue') return
    set({ paused: !s.paused })
  },
  newGame: () => {
    wipeSave()
    location.reload()
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
      if (obj.needCool) set({ missionBody: 'Now lose the heat — stay clear of patrols until the stars fade.' })
      else get().completeChapter()
    }
  },

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
    const pay = Math.round(ch.pay * (1 + s.prestige * 0.5))
    get().addCash(pay)
    get().showBanner(`MISSION PASSED — $${pay}`, '#6dd96d')
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

  // ---- garage ----
  setNearStation: (nearStation) => {
    if (get().nearStation !== nearStation) set({ nearStation })
  },
  toggleShop: () => {
    const s = get()
    if (!s.shopOpen && !s.nearStation) return
    set({ shopOpen: !s.shopOpen })
  },
  buy: (id) => {
    const s = get()
    const item = SHOP.find((i) => i.id === id)
    if (!item || s.upgrades[id]) return
    if (item.requires && !s.upgrades[item.requires]) return
    if (s.cash < item.cost) return
    set({ cash: s.cash - item.cost, upgrades: { ...s.upgrades, [id]: true } })
    get().showBanner(item.name + ' INSTALLED', '#6dd96d')
  },
  buyPaint: (id) => {
    const s = get()
    const p = PAINTS.find((x) => x.id === id)
    if (!p || s.cash < p.cost) return
    set({ cash: s.cash - p.cost, paint: p.color })
  },

  // ---- races ----
  startRace: () => {
    const s = get()
    if (s.race.active || s.stage === 'dialogue') return
    set({ race: { ...s.race, active: true, idx: 0, t0: performance.now() } })
    get().showBanner('RACE — GO GO GO', '#41d6ff')
  },
  hitRing: () => {
    const s = get()
    set({ race: { ...s.race, idx: s.race.idx + 1 } })
  },
  finishRace: (sendRace) => {
    const s = get()
    const ms = Math.round(performance.now() - s.race.t0)
    const bestMs = s.race.bestMs == null ? ms : Math.min(s.race.bestMs, ms)
    set({ race: { ...s.race, active: false, idx: 0, lastMs: ms, bestMs } })
    get().showBanner(`FINISH — ${(ms / 1000).toFixed(2)}s${ms <= bestMs ? ' ★ BEST' : ''}`, '#41d6ff')
    if (sendRace) sendRace(bestMs)
  },
  cancelRace: () => {
    const s = get()
    if (!s.race.active) return
    set({ race: { ...s.race, active: false, idx: 0 } })
    get().showBanner('RACE ABANDONED', '#ff5544')
  },

  setMission: (missionTitle, missionBody) => set({ missionTitle, missionBody }),

  showBanner: (text, color = '#f5c843') => {
    set({ banner: { text, color } })
    setTimeout(() => {
      if (get().banner?.text === text) set({ banner: null })
    }, 2200)
  },

  addCash: (n) =>
    set((s) => ({
      cash: Math.max(0, s.cash + n),
      stats: n > 0 ? { ...s.stats, earned: s.stats.earned + n } : s.stats,
    })),
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
    if (s.dead || !s.started || s.paused || s.stage === 'dialogue') return // cutscene = safe
    if (performance.now() < world.invulnUntil) return // respawn grace
    world.flashT = performance.now()
    world.shake = Math.min(1, world.shake + 0.45)
    const hp = s.hp - n
    set({ hp })
    if (hp <= 0) get().kill(reason)
  },

  busted: false,
  bust: () => {
    const s = get()
    if (s.dead || s.busted) return
    set((st) => ({ busted: true, stats: { ...st.stats, busts: st.stats.busts + 1 } }))
    world.playerVel.set(0, 0, 0)
    setTimeout(() => {
      const fine = Math.min(300, get().cash)
      world.cops.clear()
      world.invulnUntil = performance.now() + 3000
      set((st) => ({ busted: false, wanted: 0, cops: [], cash: Math.max(0, st.cash - fine) }))
      get().setMission('RELEASED', `The Marshals impounded $${fine} and let you drift. Marker still live.`)
    }, 3000)
  },

  kill: (reason) => {
    if (get().dead) return
    world.explode(world.playerPos.clone(), '#ff5500')
    get().cancelRace()
    set((s) => ({ dead: true, deathReason: reason, stats: { ...s.stats, deaths: s.stats.deaths + 1 } }))
    setTimeout(() => {
      world.cops.clear()
      world.playerVel.set(0, 0, 0)
      world.resetPlayer = true
      world.invulnUntil = performance.now() + 3000
      const s = get()
      set({
        dead: false,
        hp: get().maxHp(),
        boost: get().maxBoost(),
        wanted: 0,
        cops: [],
        cash: Math.max(0, s.cash - 200),
      })
      if (s.stage === 'active' && s.chapter < STORY.length) get().beginObjective()
      else get().setMission('BACK IN ACTION', reason + ' Dry-dock fee: $200.')
    }, 3200)
  },
}))
