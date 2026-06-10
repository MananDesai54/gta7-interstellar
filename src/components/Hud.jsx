import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useStore } from '../game/store'
import { world } from '../game/world'
import { STATIONS } from '../game/constants'
import { MAP_R } from '../game/physics'
import { net } from '../game/net'
import { beep } from '../game/audio'

const fwdTmp = new THREE.Vector3()

export function Hud() {
  const {
    started, dead, deathReason, hp, boost, cash, wanted,
    missionTitle, missionBody, banner, station, dialogue, lineIdx, remoteIds,
  } = useStore()
  const nextStation = useStore((s) => s.nextStation)
  const canvas = useRef()
  const [speed, setSpeed] = useState(0)
  const [gravWarn, setGravWarn] = useState(false)

  // radio + dialogue advance
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
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [nextStation])

  // minimap + speedo poll
  useEffect(() => {
    const iv = setInterval(() => {
      setSpeed(Math.round(world.playerVel.length()))
      setGravWarn(world.gravWarn)
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
      const dot = (p, color, r) => {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc((p.x - px) * scale, (p.z - pz) * scale, r, 0, Math.PI * 2)
        ctx.fill()
      }
      dot(world.bodyPos.helios, '#ffe9a8', 10)
      dot(world.bodyPos.earth, '#3fa9f5', 6)
      dot(world.bodyPos.saturn, '#d6b27a', 8)
      dot(world.bodyPos.mars, '#c1542f', 4)
      dot(world.bodyPos.gargantua, '#ff8800', 6)
      if (!world.markerHidden) dot(world.missionPos, '#ffd24a', 4)
      world.npcs.forEach((n) => n?.data.alive && n.ref.current && dot(n.ref.current.position, '#bbb', 2))
      world.cops.forEach((c) => c.alive && c.ref.current && dot(c.ref.current.position, '#f33', 2.5))
      world.remoteRefs.forEach((r) => r.current?.visible && dot(r.current.position, '#41d6ff', 3.5))
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

  return (
    <div className="hud">
      <div className="mission">
        <div className="m-title">{missionTitle}</div>
        <div className="m-body">{missionBody}</div>
        {remoteIds.length > 0 && (
          <div className="pilots-online">
            {remoteIds.length} other pilot{remoteIds.length > 1 ? 's' : ''} in system:{' '}
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
      </div>

      <div className="bars">
        <div className="bar-label">HULL</div>
        <div className="bar"><div className="hp" style={{ width: `${Math.max(0, hp)}%` }} /></div>
        <div className="bar-label">BOOST</div>
        <div className="bar"><div className="boost" style={{ width: `${Math.max(0, boost)}%` }} /></div>
      </div>

      <div className="speedo">{speed}<span> km/s</span></div>
      <canvas ref={canvas} className="minimap" width={190} height={190} />
      <div className="radio">{STATIONS[station]}</div>
      {banner && <div className="banner" style={{ color: banner.color }}>{banner.text}</div>}
      {gravWarn && !dead && <div className="grav-warn">⚠ GRAVITY WELL ⚠</div>}
      <div className="crosshair">+</div>

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
