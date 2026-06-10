import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'

export function MissionMarker() {
  const ref = useRef()
  useFrame((state, dt) => {
    const m = ref.current
    if (!m) return
    m.visible = !world.markerHidden
    m.position.copy(world.missionPos)
    m.rotation.y += dt * 1.5
    m.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.12)
  })
  return (
    <group ref={ref}>
      <mesh>
        <torusGeometry args={[40, 4, 12, 48]} />
        <meshBasicMaterial color="#ffd24a" toneMapped={false} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[40, 2.5, 10, 48]} />
        <meshBasicMaterial color="#ffe9a8" toneMapped={false} transparent opacity={0.7} />
      </mesh>
      <pointLight color="#ffd24a" intensity={40} distance={400} decay={1.6} />
    </group>
  )
}
