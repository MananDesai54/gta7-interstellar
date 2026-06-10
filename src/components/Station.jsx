import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { world } from '../game/world'
import { useStore } from '../game/store'

const OFFSET = new THREE.Vector3(540, 160, 540)
export const DOCK_RANGE = 340

// Meridian Station — the garage. Rides along in Earth orbit; fly within
// range and press G to dock.
export function Station() {
  const ref = useRef()
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const m = ref.current
    if (!m) return
    m.position.copy(world.bodyPos.earth).add(OFFSET)
    world.stationPos.copy(m.position)
    m.rotation.y += dt * 0.25
    const s = useStore.getState()
    if (s.started && !s.dead) {
      s.setNearStation(tmp.copy(world.playerPos).distanceTo(m.position) < DOCK_RANGE)
    }
  })

  return (
    <group ref={ref}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[90, 14, 12, 48]} />
        <meshStandardMaterial color="#3a3f4d" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[18, 18, 70, 12]} />
        <meshStandardMaterial color="#4a505f" metalness={0.8} roughness={0.3} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 45, 0, Math.sin(a) * 45]} rotation-y={-a}>
          <boxGeometry args={[90, 6, 6]} />
          <meshStandardMaterial color="#2c303b" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {/* landing beacon lights */}
      <mesh position={[0, 42, 0]}>
        <sphereGeometry args={[5, 8, 6]} />
        <meshBasicMaterial color="#41d6ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, -42, 0]}>
        <sphereGeometry args={[5, 8, 6]} />
        <meshBasicMaterial color="#ffd24a" toneMapped={false} />
      </mesh>
      <pointLight color="#41d6ff" intensity={50} distance={500} decay={1.6} />
      <Html position={[0, 130, 0]} center distanceFactor={900} occlude={false}>
        <div className="station-tag">⬡ MERIDIAN STATION</div>
      </Html>
    </group>
  )
}
