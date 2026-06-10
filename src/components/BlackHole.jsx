import { useRef } from 'react'
import * as THREE from 'three'
import { extend, useFrame } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import { BH_POS, BH_EVENT_HORIZON } from '../game/constants'

const INNER = BH_EVENT_HORIZON * 1.25
const OUTER = BH_EVENT_HORIZON * 3.4

const AccretionMaterial = shaderMaterial(
  { uTime: 0, uInner: INNER, uOuter: OUTER },
  /* glsl */ `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float uTime, uInner, uOuter;
    varying vec3 vPos;
    void main() {
      float r = length(vPos.xy);
      if (r < uInner || r > uOuter) discard;
      float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
      float ang = atan(vPos.y, vPos.x);
      float sw = sin(ang * 7.0 - uTime * 2.4 + r * 0.025) * 0.5 + 0.5;
      float sw2 = sin(ang * 13.0 + uTime * 1.7 - r * 0.05) * 0.5 + 0.5;
      float band = 0.55 + 0.45 * sin(r * 0.12 + sw * 4.0);
      vec3 hot = vec3(1.0, 0.97, 0.88);
      vec3 cool = vec3(1.0, 0.42, 0.06);
      vec3 col = mix(hot, cool, t) * (band * 0.9 + 0.5) * (1.0 + sw * 0.7 + sw2 * 0.3);
      float a = smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.7, 1.0, t));
      gl_FragColor = vec4(col * 1.6, a);
    }
  `,
)
extend({ AccretionMaterial })

function Disk({ tilt }) {
  const mat = useRef()
  useFrame((state) => {
    if (mat.current) mat.current.uTime = state.clock.elapsedTime
  })
  return (
    <mesh rotation-x={tilt}>
      <circleGeometry args={[OUTER, 128]} />
      <accretionMaterial
        ref={mat}
        key={AccretionMaterial.key}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export function BlackHole() {
  return (
    <group position={BH_POS}>
      {/* event horizon */}
      <mesh>
        <sphereGeometry args={[BH_EVENT_HORIZON, 48, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* photon ring */}
      <mesh rotation-x={Math.PI / 2.05}>
        <torusGeometry args={[BH_EVENT_HORIZON * 1.12, 5, 12, 96]} />
        <meshBasicMaterial color="#fff3d0" toneMapped={false} />
      </mesh>
      <Disk tilt={Math.PI / 2.05} />
      <Disk tilt={Math.PI / 2.05 + 0.5} />
      <pointLight color="#ffaa55" intensity={3} distance={6000} decay={1} />
    </group>
  )
}
