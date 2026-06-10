import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'
import { applyGravity } from '../game/physics'
import { useStore } from '../game/store'

const STEPS = 110
const DT = 0.35

// KSP-style predicted path: integrates your current velocity through the
// gravity field. Bodies are treated as frozen for the prediction — close
// enough at these speeds, and it makes slingshots readable.
export function Trajectory() {
  const line = useRef()
  const pos = useMemo(() => new THREE.Vector3(), [])
  const vel = useMemo(() => new THREE.Vector3(), [])
  const positions = useMemo(() => new Float32Array((STEPS + 1) * 3), [])

  useFrame(() => {
    const l = line.current
    if (!l) return
    const s = useStore.getState()
    const speed = world.playerVel.length()
    if (!s.started || s.dead || speed < 25 || world.surface) {
      l.visible = false
      return
    }
    l.visible = true
    pos.copy(world.playerPos)
    vel.copy(world.playerVel)
    positions[0] = pos.x
    positions[1] = pos.y
    positions[2] = pos.z
    for (let i = 1; i <= STEPS; i++) {
      applyGravity(pos, vel, DT, world.bodyPos)
      vel.multiplyScalar(1 - 0.35 * DT) // same drag the ship feels
      pos.addScaledVector(vel, DT)
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z
    }
    l.geometry.attributes.position.needsUpdate = true
  })

  return (
    <line ref={line} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#41d6ff" transparent opacity={0.45} />
    </line>
  )
}
