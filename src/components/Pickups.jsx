import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'
import { useStore } from '../game/store'
import { beep } from '../game/audio'

const POOL = 48
const cashMat = new THREE.MeshBasicMaterial({ color: '#6dd96d', toneMapped: false })
const oreMat = new THREE.MeshBasicMaterial({ color: '#ffd24a', toneMapped: false })

// Floating loot: green credit chips and gold ore chunks. Fly through to grab.
export function Pickups() {
  const meshes = useRef([])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const s = useStore.getState()
    const t = state.clock.elapsedTime
    for (let i = 0; i < POOL; i++) {
      const m = meshes.current[i]
      const p = world.pickups[i]
      if (!m) continue
      if (!p || !p.live) {
        m.visible = false
        continue
      }
      m.visible = true
      m.position.copy(p.pos)
      m.position.y += Math.sin(t * 2 + i) * 4
      m.rotation.y = t * 2 + i
      m.material = p.type === 'ore' ? oreMat : cashMat
      if (s.started && !s.dead && !s.paused && tmp.copy(world.playerPos).distanceTo(p.pos) < 42) {
        p.live = false
        if (p.type === 'ore') {
          s.collectOre()
          beep(1180, 0.12, 'triangle')
        } else {
          s.addCash(p.value)
          beep(1400, 0.1, 'sine')
        }
      }
    }
  })

  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh key={i} ref={(el) => (meshes.current[i] = el)} visible={false} material={cashMat}>
          <octahedronGeometry args={[7, 0]} />
        </mesh>
      ))}
    </>
  )
}
