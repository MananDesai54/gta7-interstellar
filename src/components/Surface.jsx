import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../game/store'
import { world, fireLaser } from '../game/world'
import { SURFACES, surfaceProps } from '../game/surfaces'
import { Model, CITY_BUILDINGS } from './Model'

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
      <Turrets cfg={cfg} />
      <Pedestrians cfg={cfg} count={id === 'earth' ? 9 : 4} />
    </group>
  )
}

// Locals going about their day. Shoot one and the whole system hears
// about it — heat spikes, and the patrols remember when you fly back up.
function Pedestrians({ cfg, count }) {
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const peds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        ref: { current: null },
        data: {
          alive: true,
          respawnAt: 0,
          speed: 9 + Math.random() * 8,
          target: new THREE.Vector3(),
          home: new THREE.Vector3(Math.cos((i / count) * Math.PI * 2) * (180 + Math.random() * 420), 0, Math.sin((i / count) * Math.PI * 2) * (180 + Math.random() * 420)),
        },
      })),
    [count],
  )

  useEffect(() => {
    world.peds = peds
    peds.forEach((p) => p.data.target.copy(p.data.home))
    return () => {
      world.peds = []
    }
  }, [peds])

  useFrame((state, dt) => {
    const s = useStore.getState()
    if (s.paused) return
    const t = state.clock.elapsedTime
    for (const p of peds) {
      const m = p.ref.current
      if (!m) continue
      if (!p.data.alive) {
        if (t > p.data.respawnAt) {
          p.data.alive = true
          m.visible = true
          m.position.copy(p.data.home).setY(0)
        }
        continue
      }
      tmp.copy(p.data.target).sub(m.position)
      tmp.y = 0
      if (tmp.length() < 8) {
        const a = Math.random() * Math.PI * 2
        p.data.target.copy(p.data.home).add(new THREE.Vector3(Math.cos(a) * 140, 0, Math.sin(a) * 140))
      } else {
        m.position.addScaledVector(tmp.normalize(), p.data.speed * dt)
        m.lookAt(m.position.x + tmp.x, m.position.y, m.position.z + tmp.z)
        // amble bob
        m.children[0] && (m.children[0].position.y = Math.abs(Math.sin(t * 6 + p.data.speed)) * 0.5)
      }
    }
  })

  return (
    <>
      {peds.map((p, i) => (
        <group key={i} ref={(el) => (p.ref.current = el)} position={p.data.home.toArray()}>
          <Model url="/models/astronautB.glb" scale={8} rotation-y={Math.PI} />
        </group>
      ))}
    </>
  )
}

// Claim-jumper defense turrets: they shoot first. $250 + a chip each.
const TURRET_SPOTS = [
  [820, 0, -380],
  [-640, 0, 760],
  [240, 0, 1240],
]

function Turrets({ cfg }) {
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const entries = useMemo(
    () =>
      TURRET_SPOTS.map((pos) => ({
        ref: { current: null },
        data: { hp: 40, alive: true, respawnAt: 0, fireCd: 0, pos },
      })),
    [],
  )

  useEffect(() => {
    world.turrets = entries
    return () => {
      world.turrets = []
    }
  }, [entries])

  useFrame((state, dt) => {
    const s = useStore.getState()
    if (s.paused || s.dead || s.stage === 'dialogue') return
    const t = state.clock.elapsedTime
    for (const e of entries) {
      const m = e.ref.current
      if (!m) continue
      if (!e.data.alive) {
        if (t > e.data.respawnAt) {
          e.data.alive = true
          e.data.hp = 40
          m.visible = true
        }
        continue
      }
      m.getWorldPosition(tmp)
      const d = tmp.distanceTo(world.playerPos)
      if (d < 700 && d > 40) {
        m.lookAt(world.playerPos.x, m.position.y + cfg.y, world.playerPos.z)
        e.data.fireCd -= dt
        if (e.data.fireCd <= 0) {
          e.data.fireCd = 1.8
          const dir = tmp2g.copy(world.playerPos).sub(tmp).normalize()
          dir.x += (Math.random() - 0.5) * 0.06
          dir.y += (Math.random() - 0.5) * 0.06
          dir.z += (Math.random() - 0.5) * 0.06
          fireLaser(tmp.addScaledVector(dir, 20), dir, 'pirate')
        }
      }
    }
  })

  return (
    <>
      {entries.map((e, i) => (
        <group key={i} ref={(el) => (e.ref.current = el)} position={e.data.pos}>
          <Model url="/models/turret_double.glb" scale={16} />
          <pointLight color="#ff4433" intensity={20} distance={200} decay={1.7} position={[0, 30, 0]} />
        </group>
      ))}
    </>
  )
}
const tmp2g = new THREE.Vector3()

function EarthIsland({ props }) {
  // proper Kenney City Kit buildings on a downtown grid — skyscrapers in
  // the core, low-rise out toward the beach
  const blocks = useMemo(() => {
    const out = []
    const lot = 230
    for (let gx = -3; gx <= 3; gx++) {
      for (let gz = -3; gz <= 3; gz++) {
        const ring = Math.max(Math.abs(gx), Math.abs(gz))
        if (gx === 0 && gz === 0) continue // beacon plaza
        if (Math.hypot(gx, gz) > 3.2) continue
        const sky = ring <= 1
        const pool = sky ? CITY_BUILDINGS.slice(8) : CITY_BUILDINGS.slice(0, 8)
        const idx = Math.abs(gx * 7 + gz * 13) % pool.length
        out.push({
          url: pool[idx],
          x: gx * lot + ((gx * 31) % 23),
          z: gz * lot + ((gz * 17) % 23),
          rot: (Math.abs(gx + gz) % 4) * (Math.PI / 2),
          scale: sky ? 34 : 26,
        })
      }
    }
    return out
  }, [])
  return (
    <>
      {/* sand island under the city */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 1, 0]}>
        <circleGeometry args={[1600, 48]} />
        <meshStandardMaterial color="#d8c690" roughness={1} />
      </mesh>
      {/* downtown asphalt */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 1.6, 0]}>
        <circleGeometry args={[900, 48]} />
        <meshStandardMaterial color="#3a3f48" roughness={0.95} />
      </mesh>
      {blocks.map((b, i) => (
        <Model key={i} url={b.url} scale={b.scale} position={[b.x, 2, b.z]} rotation-y={b.rot} />
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
            <Model url="/models/monorail_trainCargo.glb" scale={18} position={[60, 0, 30]} rotation-y={i} />
          </group>
        ))}
      {/* launch site */}
      <Model url="/models/rocket_baseA.glb" scale={30} position={[180, 0, -240]} />
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
            <Model url="/models/hangar_roundGlass.glb" scale={45} rotation-y={i * 2} />
            <pointLight position={[0, 40, 0]} color="#ffd24a" intensity={30} distance={300} decay={1.7} />
          </group>
        ))}
      <Model url="/models/satelliteDish_detailed.glb" scale={35} position={[150, 0, 480]} rotation-y={2.4} />
    </>
  )
}
