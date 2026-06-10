import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../game/store'
import { SURFACES, surfaceProps } from '../game/surfaces'

// The active planet surface. Mounted only while landed — a ground disc,
// a sky dome with fog, per-planet props, and its own lighting.
export function Surface() {
  const surface = useStore((s) => s.surface)
  if (!surface) return null
  return <SurfaceWorld key={surface} id={surface} />
}

function SurfaceWorld({ id }) {
  const cfg = SURFACES[id]
  const props = useMemo(() => surfaceProps(id), [id])

  return (
    <group position={[0, cfg.y, 0]}>
      {/* sky dome + fog volume */}
      <mesh>
        <sphereGeometry args={[6200, 32, 24]} />
        <meshBasicMaterial color={cfg.sky} side={THREE.BackSide} fog={false} />
      </mesh>
      {/* ground */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[6000, 64]} />
        <meshStandardMaterial color={cfg.ground} roughness={1} />
      </mesh>
      {/* landing beacon at center */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[60, 66, 12, 24]} />
        <meshStandardMaterial color="#222733" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 13, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[40, 50, 32]} />
        <meshBasicMaterial color="#41d6ff" toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 120, 0]} color="#41d6ff" intensity={80} distance={700} decay={1.6} />

      {/* per-planet lighting */}
      <ambientLight intensity={cfg.ambient} color={cfg.sun} />
      <directionalLight position={[1800, 2600, 1200]} intensity={1.8} color={cfg.sun} />

      {id === 'earth' && <EarthIsland props={props} />}
      {id === 'mars' && <MarsGulch props={props} />}
      {id === 'luna' && <LunaFlats props={props} />}
    </group>
  )
}

function EarthIsland({ props }) {
  const buildings = props.filter((p) => p.kind === 'building')
  return (
    <>
      {/* sand island under the city */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 1, 0]}>
        <circleGeometry args={[1600, 48]} />
        <meshStandardMaterial color="#d8c690" roughness={1} />
      </mesh>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 + 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d2]} />
          <meshStandardMaterial color={b.c} roughness={0.85} />
        </mesh>
      ))}
      {/* breakers ring — reads as surf line */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 1.5, 0]}>
        <ringGeometry args={[1600, 1660, 48]} />
        <meshBasicMaterial color="#bfe8f5" transparent opacity={0.5} />
      </mesh>
    </>
  )
}

function MarsGulch({ props }) {
  return (
    <>
      {props
        .filter((p) => p.kind === 'rock')
        .map((p, i) => (
          <mesh key={i} position={[p.x, p.s * 0.4, p.z]} rotation={[0.3 * (i % 3), i, 0]}>
            <dodecahedronGeometry args={[p.s, 0]} />
            <meshStandardMaterial color="#6e3018" roughness={1} flatShading />
          </mesh>
        ))}
      {props
        .filter((p) => p.kind === 'rig')
        .map((p, i) => (
          <group key={`rig${i}`} position={[p.x, 0, p.z]}>
            <mesh position={[0, 60, 0]}>
              <boxGeometry args={[24, 120, 24]} />
              <meshStandardMaterial color="#5a5043" metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh position={[0, 130, 0]}>
              <sphereGeometry args={[8, 8, 6]} />
              <meshBasicMaterial color="#ff7a22" toneMapped={false} />
            </mesh>
            <pointLight position={[0, 130, 0]} color="#ff7a22" intensity={40} distance={400} decay={1.7} />
          </group>
        ))}
    </>
  )
}

function LunaFlats({ props }) {
  return (
    <>
      {props
        .filter((p) => p.kind === 'crater')
        .map((p, i) => (
          <mesh key={i} position={[p.x, 1.5, p.z]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[p.s * 0.7, p.s, 24]} />
            <meshStandardMaterial color="#3e4147" roughness={1} side={THREE.DoubleSide} />
          </mesh>
        ))}
      {props
        .filter((p) => p.kind === 'dome')
        .map((p, i) => (
          <group key={`dome${i}`} position={[p.x, 0, p.z]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#c8ccd4" roughness={0.4} metalness={0.3} />
            </mesh>
            <mesh position={[0, 70, 0]}>
              <cylinderGeometry args={[1.5, 1.5, 60, 6]} />
              <meshStandardMaterial color="#888" metalness={0.7} />
            </mesh>
            <mesh position={[18, 22, 42]}>
              <sphereGeometry args={[4, 8, 6]} />
              <meshBasicMaterial color="#ffd24a" toneMapped={false} />
            </mesh>
          </group>
        ))}
    </>
  )
}
