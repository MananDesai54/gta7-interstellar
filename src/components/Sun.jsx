import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { BODIES } from '../game/physics'

const R = BODIES.helios.radius

export function Sun() {
  const corona = useRef()
  useFrame((state) => {
    if (corona.current) corona.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.025)
  })
  return (
    <group>
      <mesh>
        <sphereGeometry args={[R, 64, 48]} />
        <meshBasicMaterial color="#fff0c0" toneMapped={false} />
      </mesh>
      <mesh ref={corona}>
        <sphereGeometry args={[R * 1.25, 48, 32]} />
        <meshBasicMaterial color="#ffb340" transparent opacity={0.32} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.7, 48, 32]} />
        <meshBasicMaterial color="#ff7a00" transparent opacity={0.1} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* the system's key light — no falloff, it's a star */}
      <pointLight color="#fff2dd" intensity={2.4} distance={0} decay={0} />
    </group>
  )
}
