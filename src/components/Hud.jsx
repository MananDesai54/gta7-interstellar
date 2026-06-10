import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useStore } from '../game/store'
import { world } from '../game/world'
import { STATIONS, CITY_POS, HIDEOUT_POS } from '../game/constants'
import { MAP_R } from '../game/physics'
import { SHOP, PAINTS, maxHpFor, ORE_PRICE } from '../game/shop'
import { DISCOVERIES } from '../game/discoveries'
import { SURFACES } from '../game/surfaces'
import { beep, startRadio } from '../game/audio'

const fwdTmp = new THREE.Vector3()
const cvTmp = new THREE.Vector3()
const projTmp = new THREE.Vector3()

function fmtMs(ms) {
  return ms == null ? '—' : (ms / 1000).toFixed(2) + 's'
}
function fmtDist(d) {
  return d > 1000 ? (d / 1000).toFixed(1) + 'K' : Math.round(d)
}

export function Hud() {
  const {
    started, dead, deathReason, hp, boost, cash, wanted, ore,
    missionTitle, missionBody, banner, station, dialogue, lineIdx,
    shopOpen, nearStation, race, upgrades, paint, paused, showLog, discoveries, chapterCard, busted,
    surface, landPrompt,
  } = useStore()
  const nextStation = useStore((s) => s.nextStation)
  const buy = useStore((s) => s.buy)
  const buyPaint = useStore((s) => s.buyPaint)
  const sellOre = useStore((s) => s.sellOre)
  const newGame = useStore((s) => s.newGame)
  const togglePause = useStore((s) => s.togglePause)
  const canvas = useRef()
  const wayRef = useRef()
  const [speed, setSpeed] = useState(0)
  const [gravWarn, setGravWarn] = useState(false)
  const [inBelt, setInBelt] = useState(false)
  const [flare, setFlare] = useState(0)
  const [flareWarn, setFlareWarn] = useState(false)
  const [warpOn, setWarpOn] = useState(false)
  const [flash, setFlash] = useState(false)
  const [raceMs, setRaceMs] = useState(0)
  const [photoMode, setPhotoMode] = useState(false)
  const [fareLeft, setFareLeft] = useState(0)
  const mapZoom = useRef(1) // M cycles 0.45 / 1 / 2.2

  // keys
  useEffect(() => {
    const onKey = (e) => {
      const s = useStore.getState()
      if (!s.started) return
      if (e.code === 'KeyR' && !s.paused) {
        nextStation()
        beep(660, 0.1, 'sine')
      }
      if (e.code === 'Enter' && s.stage === 'dialogue') {
        beep(520, 0.06, 'sine')
        s.advanceLine()
      }
      if (e.code === 'KeyG' && !s.paused) s.toggleShop()
      if (e.code === 'KeyJ' && !s.paused) s.toggleLog()
      if (e.code === 'KeyH' && !s.paused) setPhotoMode((v) => !v)
      if (e.code === 'KeyM' && !s.paused) {
        mapZoom.current = mapZoom.current === 1 ? 2.2 : mapZoom.current === 2.2 ? 0.45 : 1
        beep(540, 0.06, 'sine')
      }
      if (e.code === 'Escape') {
        if (s.shopOpen) s.toggleShop()
        else if (s.showLog) s.toggleLog()
        else if (!document.pointerLockElement) s.togglePause()
      }
      if (e.code === 'KeyP') s.togglePause()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [nextStation])

  // radio follows the station dial
  useEffect(() => {
    if (started) startRadio(station)
  }, [started, station])

  // controller hotplug toasts
  useEffect(() => {
    const on = () => useStore.getState().showBanner('🎮 CONTROLLER CONNECTED', '#7ec8ff')
    const off = () => useStore.getState().showBanner('🎮 CONTROLLER LOST', '#ff7a22')
    addEventListener('gamepadconnected', on)
    addEventListener('gamepaddisconnected', off)
    return () => {
      removeEventListener('gamepadconnected', on)
      removeEventListener('gamepaddisconnected', off)
    }
  }, [])

  // fast loop: waypoint projection (smooth) — direct DOM writes, no re-render
  useEffect(() => {
    let raf
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = wayRef.current
      if (!el) return
      const s = useStore.getState()
      const cam = world.camera
      if (!s.started || s.dead || s.paused || world.markerHidden || !cam || s.stage === 'dialogue') {
        el.style.display = 'none'
        return
      }
      projTmp.copy(world.missionPos).project(cam)
      const behind = projTmp.z > 1
      let x = projTmp.x
      let y = projTmp.y
      if (behind) {
        x = -x
        y = -y
      }
      const off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.88
      if (off) {
        // clamp to screen edge, point arrow outward
        const ang = Math.atan2(y, x)
        x = Math.cos(ang) * 0.92
        y = Math.sin(ang) * 0.88
        el.className = 'waypoint edge'
        el.firstChild.style.transform = `rotate(${-ang + Math.PI / 2}rad)`
      } else {
        el.className = 'waypoint'
        el.firstChild.style.transform = 'rotate(45deg)'
      }
      el.style.display = 'block'
      el.style.left = `${((x + 1) / 2) * 100}%`
      el.style.top = `${((1 - y) / 2) * 100}%`
      el.lastChild.textContent = fmtDist(world.playerPos.distanceTo(world.missionPos))
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  // slow loop: minimap + readouts
  useEffect(() => {
    const iv = setInterval(() => {
      setSpeed(Math.round(world.playerVel.length()))
      setGravWarn(world.gravWarn)
      setInBelt(world.inBelt)
      setFlare(world.flare || 0)
      setFlareWarn(!!world.flareWarn)
      setFareLeft(world.missionDeadline ? Math.max(0, world.missionDeadline - performance.now()) : 0)
      setWarpOn(world.warp > 0.5)
      setFlash(performance.now() - world.flashT < 220)
      const r = useStore.getState().race
      if (r.active) setRaceMs(performance.now() - r.t0)
      const ctx = canvas.current?.getContext('2d')
      if (!ctx) return
      const W = 190
      const cx = W / 2
      const scale = (cx / MAP_R) * mapZoom.current
      ctx.clearRect(0, 0, W, W)
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cx, cx - 3, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillStyle = 'rgba(2,8,20,.78)'
      ctx.fillRect(0, 0, W, W)
      fwdTmp.set(0, 0, -1).applyQuaternion(world.playerQuat)
      ctx.translate(cx, cx)
      ctx.rotate(Math.atan2(fwdTmp.x, -fwdTmp.z))
      const px = world.playerPos.x
      const pz = world.playerPos.z
      const dot = (p, color, r2) => {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc((p.x - px) * scale, (p.z - pz) * scale, r2, 0, Math.PI * 2)
        ctx.fill()
      }
      dot(world.bodyPos.helios, '#ffe9a8', 10)
      dot(world.bodyPos.earth, '#3fa9f5', 6)
      dot(world.bodyPos.luna, '#999', 2.5)
      dot(world.bodyPos.saturn, '#d6b27a', 8)
      dot(world.bodyPos.mars, '#c1542f', 4)
      dot(world.bodyPos.gargantua, '#ff8800', 6)
      dot(world.bodyPos.comet, '#aaddff', 3)
      dot(CITY_POS, '#ff2bd6', 5)
      dot(HIDEOUT_POS, '#ff4433', 3.5)
      dot(world.stationPos, '#41d6ff', 3)
      if (!world.markerHidden) dot(world.missionPos, '#ffd24a', 4)
      world.npcs.forEach((n) => n?.data.alive && n.ref.current && dot(n.ref.current.position, '#bbb', 2))
      world.cops.forEach((c) => c.alive && c.ref.current && dot(c.ref.current.position, '#f33', 2.5))
      world.pirates.forEach((p) => p?.data.alive && p.ref.current && dot(p.ref.current.position, '#ff4433', 2.5))
      if (world.convoy?.groupRef.current) {
        world.convoy.ships.forEach((sh) => {
          if (!sh.alive) return
          cvTmp.copy(sh.offset)
          world.convoy.groupRef.current.localToWorld(cvTmp)
          dot(cvTmp, '#f5c843', 3)
        })
      }
      ctx.restore()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(cx, cx - 7)
      ctx.lineTo(cx - 4.5, cx + 5)
      ctx.lineTo(cx + 4.5, cx + 5)
      ctx.fill()
    }, 90)
    return () => clearInterval(iv)
  }, [])

  if (!started) return null

  if (photoMode) {
    return (
      <div className="hud">
        <div className="photo-hint">📷 PHOTO MODE — H to exit</div>
      </div>
    )
  }

  const line = dialogue?.[lineIdx]
  const maxHp = maxHpFor(upgrades)

  return (
    <div className="hud">
      <div className={`dmg-flash ${flash ? 'on' : ''}`} />

      <div className="waypoint" ref={wayRef} style={{ display: 'none' }}>
        <div className="wp-diamond" />
        <div className="wp-dist" />
      </div>

      <div className="mission">
        <div className="m-title">{missionTitle}</div>
        <div className="m-body">{missionBody}</div>
        {fareLeft > 0 && (
          <div className={`fare-timer ${fareLeft < 15000 ? 'urgent' : ''}`}>⏱ {(fareLeft / 1000).toFixed(1)}s</div>
        )}
      </div>

      <div className="stats">
        <div className="cash">${cash.toLocaleString()}</div>
        <div className="stars">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < wanted ? 'lit' : 'dim'}>★</span>
          ))}
        </div>
        {ore > 0 && <div className="ore-count">⬢ ORE ×{ore}</div>}
        {race.bestMs != null && <div className="best-time">SATURN CIRCUIT BEST {fmtMs(race.bestMs)}</div>}
      </div>

      <div className="bars">
        <div className="bar-label">HULL</div>
        <div className="bar"><div className="hp" style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} /></div>
        <div className="bar-label">BOOST</div>
        <div className="bar"><div className="boost" style={{ width: `${Math.max(0, (boost / useStore.getState().maxBoost()) * 100)}%` }} /></div>
      </div>

      <div className="speedo">{speed}<span> km/s</span></div>
      {warpOn && <div className="overdrive">▸▸ OVERDRIVE ◂◂</div>}
      <canvas ref={canvas} className="minimap" width={190} height={190} />
      <div className="radio" key={station}>{STATIONS[station]}</div>
      {banner && <div className="banner" style={{ color: banner.color }}>{banner.text}</div>}
      {chapterCard && (
        <div className="chapter-card">
          <div className="cc-num">CHAPTER {chapterCard.num}</div>
          <div className="cc-title">{chapterCard.title}</div>
        </div>
      )}
      {gravWarn && !dead && <div className="grav-warn">⚠ GRAVITY WELL ⚠</div>}
      {flareWarn && !dead && <div className="flare-warn">☀ SOLAR FLARE INBOUND ☀</div>}
      {flare > 0 && <div className="flare-tint" />}
      {inBelt && !dead && <div className="belt-hint">ASTEROID COVER — HEAT FADES FAST</div>}
      <div className="crosshair">+</div>

      {race.active && <div className="race-timer">{fmtMs(raceMs)} <span>RING {Math.min(race.idx + 1, 8)}/8</span></div>}

      {nearStation && !shopOpen && !dead && <div className="dock-prompt">⬡ DOCK AVAILABLE — PRESS G</div>}
      {landPrompt && !dead && !surface && (
        <div className="dock-prompt land">⬇ PRESS L TO LAND ON {landPrompt.toUpperCase()}</div>
      )}
      {surface && (
        <div className="surface-tag">
          📍 {SURFACES[surface].name}, {surface.toUpperCase()} — <span>climb or press L to leave</span>
        </div>
      )}

      {shopOpen && (
        <div className="shop">
          <div className="shop-title">GARAGE &amp; TRADE</div>
          <div className="shop-cash">${cash.toLocaleString()}</div>
          <div className="shop-items">
            {SHOP.map((item) => {
              const owned = !!upgrades[item.id]
              const locked = item.requires && !upgrades[item.requires]
              const afford = cash >= item.cost
              return (
                <button
                  key={item.id}
                  className={`shop-item ${owned ? 'owned' : ''} ${locked || (!owned && !afford) ? 'locked' : ''}`}
                  onClick={() => buy(item.id)}
                  disabled={owned || locked || !afford}
                >
                  <span className="si-name">{item.name}</span>
                  <span className="si-desc">{item.desc}</span>
                  <span className="si-cost">{owned ? 'OWNED' : locked ? 'LOCKED' : `$${item.cost}`}</span>
                </button>
              )
            })}
            <button className={`shop-item ${ore <= 0 ? 'locked' : ''}`} onClick={sellOre} disabled={ore <= 0}>
              <span className="si-name">SELL ORE ×{ore}</span>
              <span className="si-desc">${ORE_PRICE} per chunk</span>
              <span className="si-cost">{ore > 0 ? `+$${ore * ORE_PRICE}` : 'EMPTY HOLD'}</span>
            </button>
          </div>
          <div className="shop-paints">
            {PAINTS.map((p) => (
              <button
                key={p.id}
                className={`paint ${paint === p.color ? 'active' : ''}`}
                style={{ background: p.color }}
                onClick={() => buyPaint(p.id)}
                title={p.cost ? `$${p.cost}` : 'free'}
              />
            ))}
          </div>
          <div className="shop-hint">G / ESC to undock</div>
        </div>
      )}

      {showLog && (
        <div className="logbook">
          <div className="lb-title">GALAXY LOG — {discoveries.length}/{DISCOVERIES.length} FOUND</div>
          {DISCOVERIES.map((d) => {
            const found = discoveries.includes(d.id)
            return (
              <div key={d.id} className={`log-row ${found ? 'found' : ''}`}>
                <span className="log-name">{found ? d.name : '???'}</span>
                <span className="log-hint">{found ? `+$${d.bonus}` : d.hint}</span>
              </div>
            )
          })}
          <div className="shop-hint">J to close</div>
        </div>
      )}

      {paused && (
        <div className="pause">
          <div className="pause-title">PAUSED</div>
          <div className="pause-stats">
            {(() => {
              const st = useStore.getState().stats
              return (
                <>
                  <div><b>{st.kills}</b><span>KILLS</span></div>
                  <div><b>{st.deaths}</b><span>DEATHS</span></div>
                  <div><b>{st.busts}</b><span>BUSTS</span></div>
                  <div><b>${st.earned.toLocaleString()}</b><span>LIFETIME EARNED</span></div>
                </>
              )
            })()}
          </div>
          <button className="pause-btn" onClick={togglePause}>RESUME</button>
          <div className="pause-controls">
            <div><b>CLICK</b> mouse flight</div>
            <div><b>W/S</b> thrust</div>
            <div><b>SHIFT</b> boost</div>
            <div><b>X</b> overdrive</div>
            <div><b>SPACE</b> lasers</div>
            <div><b>L</b> land / lift off</div>
            <div><b>G</b> dock</div>
            <div><b>J</b> galaxy log</div>
            <div><b>H</b> photo mode</div>
            <div><b>M</b> map zoom</div>
            <div><b>R</b> radio</div>
          </div>
          <button className="pause-btn danger" onClick={newGame}>NEW GAME (WIPE SAVE)</button>
        </div>
      )}

      {line && (
        <div className="dialogue">
          <div className="d-portrait">{line[1]}</div>
          <div className="d-text">
            <div className="d-who">{line[0]}</div>
            <div className="d-line">{line[2]}</div>
          </div>
          <div className="d-next">ENTER ▸</div>
        </div>
      )}

      {dead && (
        <div className="wasted">
          <div className="wasted-bar top" />
          <span>WASTED</span>
          <div className="death-reason">{deathReason}</div>
          <div className="wasted-bar bottom" />
        </div>
      )}
      {busted && (
        <div className="wasted busted">
          <div className="wasted-bar top" />
          <span>BUSTED</span>
          <div className="death-reason">Loitered into a Marshal patrol. Fine + impound.</div>
          <div className="wasted-bar bottom" />
        </div>
      )}
    </div>
  )
}
