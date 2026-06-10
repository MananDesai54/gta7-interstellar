import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Ship } from './Ship'
import { world, fireLaser } from '../game/world'
import { useStore } from '../game/store'

const COUNT = 3
const SLOT0 = 10 // keep clear of the hideout pirates (0..6)

// Random event: raiders jump you in deep space when you're worth robbing
// (ore in the hold or a fat wallet). Drive them off or feed them.
export function Ambush() {
  const refs = useRef([])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const state = useRef({ active: false, nextAt: 130, until: 0 })
  world.ambushState = state.current
  const entries = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        ref: { current: null },
        data: { hp: 50, alive: false, boss: false, respawnAt: Infinity, fireCd: 0 },
      })),
    [],
  )

  useEffect(() => {
    entries.forEach((e, i) => {
      world.pirates[SLOT0 + i] = e
    })
    return () => {
      entries.forEach((_, i) => {
        world.pirates[SLOT0 + i] = null
      })
    }
  }, [entries])

  useFrame((st8, dt) => {
    const s = useStore.getState()
    if (!s.started || s.paused) return
    const t = st8.clock.elapsedTime
    const st = state.current
    entries.forEach((e, i) => (e.ref.current = refs.current[i]))

    if (!st.active) {
      const worthRobbing = s.ore > 0 || s.cash > 1500
      if (t > st.nextAt && worthRobbing && !world.surface && !s.dead && s.stage !== 'dialogue') {
        st.active = true
        st.until = t + 50
        entries.forEach((e, i) => {
          e.data.hp = 50
          e.data.alive = true
          const a = (i / COUNT) * Math.PI * 2
          const m = refs.current[i]
          if (m) {
            m.position.copy(world.playerPos).add(tmp.set(Math.cos(a) * 1100, (Math.random() - 0.5) * 300, Math.sin(a) * 1100))
            m.visible = true
          }
        })
        s.showBanner('☠ RAIDERS ON SCANNERS — THEY WANT YOUR CARGO', '#ff4433')
      }
      return
    }

    // active: chase + shoot
    let anyAlive = false
    for (const e of entries) {
      const m = e.ref.current
      if (!m || !e.data.alive) continue
      anyAlive = true
      tmp.copy(world.playerPos).sub(m.position)
      const d = tmp.length()
      m.lookAt(world.playerPos)
      if (d > 130) m.position.addScaledVector(tmp.normalize(), 175 * dt)
      e.data.fireCd -= dt
      if (d < 700 && e.data.fireCd <= 0 && !s.dead && s.stage !== 'dialogue' && !world.surface) {
        e.data.fireCd = 1.3
        const dir = tmp.copy(world.playerPos).sub(m.position).normalize()
        dir.x += (Math.random() - 0.5) * 0.07
        dir.y += (Math.random() - 0.5) * 0.07
        dir.z += (Math.random() - 0.5) * 0.07
        fireLaser(m.position.clone().addScaledVector(dir, 25), dir, 'pirate')
      }
    }

    const expired = t > st.until
    if (!anyAlive || expired || world.surface) {
      st.active = false
      st.nextAt = t + 150 + Math.random() * 90
      entries.forEach((e, i) => {
        e.data.alive = false
        const m = refs.current[i]
        if (m) m.visible = false
      })
      if (!anyAlive) s.showBanner('RAIDERS DRIVEN OFF', '#6dd96d')
      else if (expired) s.showBanner('RAIDERS BROKE OFF — CARGO INTACT', '#7ec8ff')
    }
  })

  return (
    <>
      {entries.map((e, i) => (
        <Ship
          key={i}
          ref={(el) => (refs.current[i] = el)}
          body="#1c0f12"
          accent="#ff7a22"
          engine="#ff5533"
          scale={1.05}
          visible={false}
        />
      ))}
    </>
  )
}
