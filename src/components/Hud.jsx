import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useStore } from '../game/store'
import { world } from '../game/world'
import { STATIONS } from '../game/constants'
import { MAP_R } from '../game/physics'
import { SHOP, PAINTS, maxHpFor } from '../game/shop'
import { net } from '../game/net'
import { beep, startRadio } from '../game/audio'

const fwdTmp = new THREE.Vector3()
const cvTmp = new THREE.Vector3()

function fmtMs(ms) {
  return ms == null ? '—' : (ms / 1000).toFixed(2) + 's'
}

export function Hud() {
  const {
    started, dead, deathReason, hp, boost, cash, wanted,
    missionTitle, missionBody, banner, station, dialogue, lineIdx, remoteIds,
    shopOpen, nearStation, showLeaderboard, leaderboard, race, upgrades, paint,
  } = useStore()
  const nextStation = useStore((s) => s.nextStation)
  const buy = useStore((s) => s.buy)
  const buyPaint = useStore((s) => s.buyPaint)
  const canvas = useRef()
  const [speed, setSpeed] = useState(0)
  const [gravWarn, setGravWarn] = useState(false)
  const [inBelt, setInBelt] = useState(false)
  const [raceMs, setRaceMs] = useState(0)

  // keys: radio, dialogue advance, dock, leaderboard
  useEffect(() => {
    const onKey = (e) => {
      const s = useStore.getState()
      if (!s.started) return
      if (e.code === 'KeyR') {
        nextStation()
        beep(660, 0.1, 'sine')
      }
      if (e.code === 'Enter' && s.stage === 'dialogue') {
        beep(520, 0.06, 'sine')
        s.advanceLine()
      }
      if (e.code === 'KeyG') s.toggleShop()
      if (e.code === 'KeyL') s.toggleLeaderboard()
      if (e.code === 'Escape' && s.shopOpen) s.toggleShop()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [nextStation])

  // radio follows the station dial
  useEffect(() => {
    if (started) startRadio(station)
  }, [started, station])

  // minimap + speedo + race timer poll
  useEffect(() => {
    const iv = setInterval(() => {
      setSpeed(Math.round(world.playerVel.length()))
      setGravWarn(world.gravWarn)
      setInBelt(world.inBelt)
      const r = useStore.getState().race
      if (r.active) setRaceMs(performance.now() - r.t0)
      const ctx = canvas.current?.getContext('2d')
      if (!ctx) return
      const W = 190
      const cx = W / 2
      const scale = cx / MAP_R
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
      dot(world.bodyPos.saturn, '#d6b27a', 8)
      dot(world.bodyPos.mars, '#c1542f', 4)
      dot(world.bodyPos.gargantua, '#ff8800', 6)
      dot(world.stationPos, '#41d6ff', 3)
      if (!world.markerHidden) dot(world.missionPos, '#ffd24a', 4)
      world.npcs.forEach((n) => n?.data.alive && n.ref.current && dot(n.ref.current.position, '#bbb', 2))
      world.cops.forEach((c) => c.alive && c.ref.current && dot(c.ref.current.position, '#f33', 2.5))
      world.remoteRefs.forEach((rr) => rr.current?.visible && dot(rr.current.position, '#41d6ff', 3.5))
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

  const line = dialogue?.[lineIdx]
  const maxHp = maxHpFor(upgrades)

  return (
    <div className="hud">
      <div className="mission">
        <div className="m-title">{missionTitle}</div>
        <div className="m-body">{missionBody}</div>
        {remoteIds.length > 0 && (
          <div className="pilots-online">
            {remoteIds.length} other pilot{remoteIds.length > 1 ? 's' : ''}:{' '}
            {remoteIds.map((id) => net.remotes.get(id)?.name).filter(Boolean).join(', ')}
          </div>
        )}
      </div>

      <div className="stats">
        <div className="cash">${cash.toLocaleString()}</div>
        <div className="stars">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < wanted ? 'lit' : 'dim'}>★</span>
          ))}
        </div>
        {race.bestMs != null && <div className="best-time">SATURN CIRCUIT BEST {fmtMs(race.bestMs)}</div>}
      </div>

      <div className="bars">
        <div className="bar-label">HULL</div>
        <div className="bar"><div className="hp" style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} /></div>
        <div className="bar-label">BOOST</div>
        <div className="bar"><div className="boost" style={{ width: `${Math.max(0, (boost / useStore.getState().maxBoost()) * 100)}%` }} /></div>
      </div>

      <div className="speedo">{speed}<span> km/s</span></div>
      <canvas ref={canvas} className="minimap" width={190} height={190} />
      <div className="radio">{STATIONS[station]}</div>
      {banner && <div className="banner" style={{ color: banner.color }}>{banner.text}</div>}
      {gravWarn && !dead && <div className="grav-warn">⚠ GRAVITY WELL ⚠</div>}
      {inBelt && !dead && <div className="belt-hint">ASTEROID COVER — HEAT FADES FAST</div>}
      <div className="crosshair">+</div>

      {race.active && <div className="race-timer">{fmtMs(raceMs)} <span>RING {Math.min(race.idx + 1, 8)}/8</span></div>}

      {nearStation && !shopOpen && !dead && <div className="dock-prompt">⬡ MERIDIAN STATION — PRESS G TO DOCK</div>}

      {shopOpen && (
        <div className="shop">
          <div className="shop-title">MERIDIAN GARAGE</div>
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

      {showLeaderboard && (
        <div className="leaderboard">
          <div className="lb-title">SYSTEM LEADERBOARD</div>
          {leaderboard.length === 0 && <div className="lb-row"><span>no pilots ranked yet</span></div>}
          {leaderboard.map((e, i) => (
            <div key={e.name} className="lb-row">
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">{e.name}</span>
              <span className="lb-cash">${(e.cash || 0).toLocaleString()}</span>
              <span className="lb-race">{fmtMs(e.bestMs)}</span>
            </div>
          ))}
          <div className="shop-hint">L to close</div>
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
    </div>
  )
}
