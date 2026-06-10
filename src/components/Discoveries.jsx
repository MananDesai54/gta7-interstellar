import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'
import { useStore } from '../game/store'
import { DISCOVERIES } from '../game/discoveries'
import { HIDEOUT_POS } from '../game/constants'

const MONOLITH = DISCOVERIES.find((d) => d.id === 'monolith').pos
const DERELICT = DISCOVERIES.find((d) => d.id === 'derelict').pos

// POI meshes + proximity discovery checks.
export function Discoveries() {
  const comet = useRef()
  const tail = useRef()
  const derelictLight = useRef()
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const checkAcc = useRef(0)

  const tailGeo = useMemo(() => {
    const n = 120
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const d = Math.random()
      pos[i * 3] = (Math.random() - 0.5) * 30 * (0.3 + d)
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30 * (0.3 + d)
      pos[i * 3 + 2] = d * 260
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    // comet rides its ellipse; tail points away from Helios
    if (comet.current) {
      comet.current.position.copy(world.bodyPos.comet)
      comet.current.lookAt(tmp.copy(world.bodyPos.comet).multiplyScalar(2)) // away from origin
    }
    if (derelictLight.current) derelictLight.current.intensity = Math.random() < 0.06 ? 90 : 12

    // proximity checks ~4x/sec
    checkAcc.current += dt
    if (checkAcc.current < 0.25) return
    checkAcc.current = 0
    const s = useStore.getState()
    if (!s.started || s.dead) return
    for (const d of DISCOVERIES) {
      if (s.discoveries.includes(d.id)) continue
      const p = d.body ? world.bodyPos[d.body] : tmp.set(d.pos[0], d.pos[1], d.pos[2])
      if (p && world.playerPos.distanceTo(p) < d.range) s.discover(d.id)
    }
  })

  return (
    <>
      {/* THE MONOLITH — 1:4:9, of course */}
      <group position={MONOLITH}>
        <mesh rotation={[0.2, 0.7, 0.1]}>
          <boxGeometry args={[11, 44, 99]} />
          <meshStandardMaterial color="#000000" roughness={0.15} metalness={0.9} />
        </mesh>
        <pointLight color="#b08bff" intensity={30} distance={400} decay={1.8} />
      </group>

      {/* derelict science vessel near Gargantua */}
      <group position={DERELICT} rotation={[0.4, 1.2, 0.3]}>
        <mesh>
          <cylinderGeometry args={[14, 18, 130, 10]} />
          <meshStandardMaterial color="#3a3d45" roughness={0.8} metalness={0.5} />
        </mesh>
        <mesh position={[0, 80, 0]} rotation={[0.5, 0, 0.4]}>
          <cylinderGeometry args={[10, 14, 60, 8]} />
          <meshStandardMaterial color="#2c2f36" roughness={0.9} metalness={0.4} />
        </mesh>
        <mesh position={[20, -30, 10]}>
          <torusGeometry args={[30, 5, 8, 24]} />
          <meshStandardMaterial color="#34373f" roughness={0.85} metalness={0.5} />
        </mesh>
        <pointLight ref={derelictLight} color="#ff8855" intensity={12} distance={300} decay={1.8} />
      </group>

      {/* pirate hideout — hollowed rock with a red maw */}
      <group position={HIDEOUT_POS}>
        <mesh rotation={[0.5, 1.1, 0.2]}>
          <dodecahedronGeometry args={[130, 1]} />
          <meshStandardMaterial color="#4a4038" roughness={1} flatShading />
        </mesh>
        <mesh position={[80, 10, 60]}>
          <sphereGeometry args={[46, 12, 8]} />
          <meshBasicMaterial color="#1a0505" />
        </mesh>
        <pointLight color="#ff3322" intensity={70} distance={600} decay={1.6} position={[90, 10, 70]} />
      </group>

      {/* comet Icarus-9 */}
      <group ref={comet}>
        <mesh>
          <icosahedronGeometry args={[34, 1]} />
          <meshStandardMaterial color="#cfe6ff" roughness={0.4} emissive="#88bbff" emissiveIntensity={0.35} flatShading />
        </mesh>
        <points ref={tail} geometry={tailGeo}>
          <pointsMaterial color="#aaddff" size={9} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
        <pointLight color="#aaddff" intensity={50} distance={500} decay={1.7} />
      </group>
    </>
  )
}
