import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Ship } from './Ship'
import { world, fireLaser } from '../game/world'
import { useStore } from '../game/store'
import { HIDEOUT_POS } from '../game/constants'

const COUNT = 5
const AGGRO = 950

function Pirate({ index, boss }) {
  const ref = useRef()
  const data = useMemo(
    () => ({
      hp: boss ? 400 : 50,
      alive: true,
      respawnAt: 0,
      boss,
      fireCd: 0,
      home: boss
        ? HIDEOUT_POS.clone().add(new THREE.Vector3(0, 60, 0))
        : HIDEOUT_POS.clone().add(
            new THREE.Vector3((Math.random() - 0.5) * 900, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 900),
          ),
      idle: Math.random() * Math.PI * 2,
    }),
    [boss],
  )
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const entry = { ref, data }
    world.pirates[index] = entry
    return () => {
      world.pirates[index] = null
    }
  }, [index, data])

  useFrame((state, dt) => {
    const m = ref.current
    if (!m) return
    const s = useStore.getState()
    if (s.paused) return
    const t = state.clock.elapsedTime

    if (!data.alive) {
      if (t > data.respawnAt) {
        data.alive = true
        data.hp = data.boss ? 400 : 50
        m.position.copy(data.home)
        m.visible = true
      }
      return
    }

    const d = tmp.copy(world.playerPos).sub(m.position).length()
    if (s.started && !s.dead && d < AGGRO) {
      // aggro: chase + shoot
      m.lookAt(world.playerPos)
      if (d > (data.boss ? 180 : 110)) {
        tmp.copy(world.playerPos).sub(m.position).normalize()
        m.position.addScaledVector(tmp, (data.boss ? 165 : 140) * dt)
      }
      data.fireCd -= dt
      if (d < 750 && data.fireCd <= 0) {
        data.fireCd = data.boss ? 0.55 : 1.0
        const dir = tmp.copy(world.playerPos).sub(m.position).normalize()
        dir.x += (Math.random() - 0.5) * 0.07
        dir.y += (Math.random() - 0.5) * 0.07
        dir.z += (Math.random() - 0.5) * 0.07
        fireLaser(m.position.clone().addScaledVector(dir, 25), dir, 'pirate')
      }
    } else {
      // idle: lazy figure-eight around home
      data.idle += dt * 0.3
      tmp.set(Math.cos(data.idle) * 120, Math.sin(data.idle * 2) * 40, Math.sin(data.idle) * 120).add(data.home)
      m.lookAt(tmp)
      tmp.sub(m.position)
      if (tmp.length() > 10) m.position.addScaledVector(tmp.normalize(), 50 * dt)
    }
  })

  return (
    <Ship
      ref={ref}
      body="#26090b"
      accent="#e8233a"
      engine="#ff4433"
      scale={boss ? 1.9 : 1}
      position={data.home.toArray()}
    >
      {boss && <pointLight color="#ff2222" intensity={90} distance={350} decay={1.5} position={[0, 8, 0]} />}
    </Ship>
  )
}

export function Pirates() {
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <Pirate key={i} index={i} boss={false} />
      ))}
      <Pirate index={COUNT} boss />
    </>
  )
}
