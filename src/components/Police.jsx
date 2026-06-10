import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Ship } from './Ship'
import { world, fireLaser } from '../game/world'
import { useStore } from '../game/store'

function Cop({ id }) {
  const ref = useRef()
  const siren = useRef()
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const entry = { ref, hp: 60, alive: true, fireCd: 0, init: false }
    world.cops.set(id, entry)
    return () => world.cops.delete(id)
  }, [id])

  useFrame((state, dt) => {
    const m = ref.current
    const entry = world.cops.get(id)
    if (!m || !entry || !entry.alive) return
    const t = state.clock.elapsedTime
    const s = useStore.getState()

    if (!entry.init) {
      entry.init = true
      const off = new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.3, Math.random() - 0.5).setLength(1500)
      m.position.copy(world.playerPos).add(off)
    }

    if (siren.current) siren.current.intensity = 60 + Math.sin(t * 12) * 60

    tmp.copy(world.playerPos).sub(m.position)
    const d = tmp.length()
    m.lookAt(world.playerPos)
    if (d > 120) m.position.addScaledVector(tmp.normalize(), (130 + s.wanted * 25) * dt)

    entry.fireCd -= dt
    if (d < 700 && entry.fireCd <= 0 && !s.dead && s.started && s.stage !== 'dialogue') {
      entry.fireCd = 1.1 - s.wanted * 0.12
      const dir = tmp.normalize().clone()
      dir.x += (Math.random() - 0.5) * 0.08
      dir.y += (Math.random() - 0.5) * 0.08
      dir.z += (Math.random() - 0.5) * 0.08
      fireLaser(tmp.copy(m.position).addScaledVector(dir, 22), dir, 'cop')
    }
  })

  return (
    <Ship ref={ref} body="#e9e9f2" accent="#0a3bd1" engine="#7fb4ff">
      <pointLight ref={siren} color="#ff2230" intensity={60} distance={260} decay={1.4} position={[0, 7, 0]} />
    </Ship>
  )
}

export function Police() {
  const cops = useStore((s) => s.cops)
  return (
    <>
      {cops.map((id) => (
        <Cop key={id} id={id} />
      ))}
    </>
  )
}
