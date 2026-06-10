import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'
import { CITY_POS, CITY_PAD } from '../game/constants'
import { Model } from './Model'

// ---- procedural textures (client-only) ----
function windowTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const x = c.getContext('2d')
  x.fillStyle = '#06070d'
  x.fillRect(0, 0, 64, 128)
  for (let j = 4; j < 124; j += 8) {
    for (let i = 4; i < 60; i += 8) {
      if (Math.random() < 0.45) {
        const warm = Math.random() < 0.6
        x.fillStyle = warm ? `rgba(255,${190 + Math.random() * 60 | 0},120,1)` : 'rgba(140,210,255,1)'
        x.fillRect(i, j, 5, 5)
      }
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function neonTexture(text, color, bg = 'rgba(0,0,0,0)') {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const x = c.getContext('2d')
  x.fillStyle = bg
  x.fillRect(0, 0, 512, 128)
  x.font = 'bold 72px "Arial Black", Arial'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.shadowColor = color
  x.shadowBlur = 26
  x.fillStyle = color
  x.fillText(text, 256, 66)
  x.shadowBlur = 0
  x.fillStyle = '#ffffff'
  x.globalAlpha = 0.55
  x.fillText(text, 256, 66)
  return new THREE.CanvasTexture(c)
}

const SIGNS = [
  ['NEO VEGA', '#ff2bd6'],
  ['PISSWASSER ZERO-G', '#41d6ff'],
  ["CLUCKIN' NEBULA", '#ffd24a'],
  ['AMMU-NATION ORBITAL', '#ff4433'],
  ['SPRUNK COSMIC', '#3ddc66'],
  ['HOTEL EVENT HORIZON', '#b08bff'],
  ['MAMA NOODLE', '#ff8c1a'],
  ['XERO GRAV CLUB', '#41ffd6'],
]

const PLATFORM_R = 640

export function City() {
  const group = useRef()
  const holo = useRef()

  const { blocks, aabbs, winTex, signDefs, lanes } = useMemo(() => {
    const winTex = windowTexture()
    const blocks = []
    const aabbs = []
    // city grid: 7x7 lots, streets between, skip center plaza + pad lot
    const lot = 150
    const half = 3
    for (let gx = -half; gx <= half; gx++) {
      for (let gz = -half; gz <= half; gz++) {
        if (Math.abs(gx) <= 0 && Math.abs(gz) <= 0) continue // plaza
        if (gx === 0 && gz === 2) continue // pad street
        if (Math.hypot(gx, gz) > 3.4) continue // round platform
        const x = gx * lot + (Math.random() - 0.5) * 24
        const z = gz * lot + (Math.random() - 0.5) * 24
        const w = 56 + Math.random() * 40
        const d = 56 + Math.random() * 40
        const center = Math.hypot(gx, gz)
        const h = (90 + Math.random() * 230) * (1.25 - center * 0.18)
        blocks.push({ x, z, w, d, h, glow: 0.6 + Math.random() * 1.2 })
        aabbs.push({
          min: new THREE.Vector3(CITY_POS.x + x - w / 2 - 4, CITY_POS.y, CITY_POS.z + z - d / 2 - 4),
          max: new THREE.Vector3(CITY_POS.x + x + w / 2 + 4, CITY_POS.y + h + 4, CITY_POS.z + z + d / 2 + 4),
        })
      }
    }
    // platform slab AABB so you can skim/land on it
    aabbs.push({
      min: new THREE.Vector3(CITY_POS.x - PLATFORM_R, CITY_POS.y - 40, CITY_POS.z - PLATFORM_R),
      max: new THREE.Vector3(CITY_POS.x + PLATFORM_R, CITY_POS.y + 2, CITY_POS.z + PLATFORM_R),
    })
    // neon signs stuck on tall buildings
    const tall = [...blocks].sort((a, b) => b.h - a.h).slice(0, SIGNS.length)
    const signDefs = tall.map((b, i) => ({
      text: SIGNS[i][0],
      color: SIGNS[i][1],
      pos: [b.x, b.h * (0.55 + (i % 3) * 0.15), b.z + b.d / 2 + 3],
      w: Math.min(140, b.w * 2.2),
    }))
    // traffic lanes: ring routes through the canyons at two heights
    const lanes = [110, 230].map((y, k) =>
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2
        const r = 230 + k * 150
        return new THREE.Vector3(CITY_POS.x + Math.cos(a) * r, CITY_POS.y + y, CITY_POS.z + Math.sin(a) * r)
      }),
    )
    return { blocks, aabbs, winTex, signDefs, lanes }
  }, [])

  useEffect(() => {
    world.buildings = aabbs
    return () => {
      world.buildings = []
    }
  }, [aabbs])

  const buildingMesh = useRef()
  useEffect(() => {
    const m = buildingMesh.current
    if (!m) return
    const M = new THREE.Matrix4()
    const col = new THREE.Color()
    blocks.forEach((b, i) => {
      M.makeTranslation(CITY_POS.x + b.x, CITY_POS.y + b.h / 2, CITY_POS.z + b.z)
      M.scale(new THREE.Vector3(b.w, b.h, b.d))
      m.setMatrixAt(i, M)
      m.setColorAt(i, col.setScalar(b.glow))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [blocks])

  const neonMats = useMemo(
    () => signDefs.map((s) => new THREE.MeshBasicMaterial({ map: neonTexture(s.text, s.color), transparent: true, side: THREE.DoubleSide, toneMapped: false })),
    [signDefs],
  )

  useFrame((state, dt) => {
    if (holo.current) holo.current.rotation.y += dt * 0.4
  })

  return (
    <group ref={group}>
      {/* platform */}
      <mesh position={[CITY_POS.x, CITY_POS.y - 20, CITY_POS.z]}>
        <cylinderGeometry args={[PLATFORM_R, PLATFORM_R * 0.82, 40, 48]} />
        <meshStandardMaterial color="#171a22" metalness={0.7} roughness={0.5} />
      </mesh>
      {/* platform underglow thrusters */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <mesh key={i} position={[CITY_POS.x + Math.cos(a) * 380, CITY_POS.y - 52, CITY_POS.z + Math.sin(a) * 380]}>
            <coneGeometry args={[26, 50, 12]} />
            <meshBasicMaterial color="#41a8ff" toneMapped={false} transparent opacity={0.8} />
          </mesh>
        )
      })}
      {/* buildings — one instanced draw call */}
      <instancedMesh ref={buildingMesh} args={[undefined, undefined, blocks.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0c0f16" emissive="#9db8d8" emissiveMap={winTex} emissiveIntensity={0.9} roughness={0.7} metalness={0.3} />
      </instancedMesh>
      {/* neon signs */}
      {signDefs.map((s, i) => (
        <mesh key={i} position={[CITY_POS.x + s.pos[0], CITY_POS.y + s.pos[1], CITY_POS.z + s.pos[2]]} material={neonMats[i]}>
          <planeGeometry args={[s.w, s.w * 0.25]} />
        </mesh>
      ))}
      {/* rotating holo billboard over the plaza */}
      <group ref={holo} position={[CITY_POS.x, CITY_POS.y + 320, CITY_POS.z]}>
        <mesh material={neonMats[0]}>
          <planeGeometry args={[260, 65]} />
        </mesh>
      </group>
      {/* landing pad */}
      <group position={[CITY_PAD.x, CITY_PAD.y - 6, CITY_PAD.z]}>
        <mesh>
          <cylinderGeometry args={[70, 76, 10, 24]} />
          <meshStandardMaterial color="#222733" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 5.2, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[48, 58, 32]} />
          <meshBasicMaterial color="#ffd24a" toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
        <pointLight color="#ffd24a" intensity={60} distance={400} decay={1.6} position={[0, 40, 0]} />
        <Model url="/models/turret_double.glb" scale={14} position={[85, 2, 0]} rotation-y={-0.6} />
        <Model url="/models/turret_double.glb" scale={14} position={[-85, 2, 30]} rotation-y={2.2} />
      </group>
      {/* city glow */}
      <pointLight position={[CITY_POS.x, CITY_POS.y + 260, CITY_POS.z]} color="#ff2bd6" intensity={160} distance={1600} decay={1.7} />
      <pointLight position={[CITY_POS.x + 200, CITY_POS.y + 120, CITY_POS.z - 200]} color="#41d6ff" intensity={120} distance={1200} decay={1.7} />
      <CityTraffic lanes={lanes} />
    </group>
  )
}

// small shuttles looping the canyon ring lanes
function CityTraffic({ lanes }) {
  const ships = useRef([])
  const data = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        lane: lanes[i % lanes.length],
        idx: Math.floor(Math.random() * 10),
        speed: 55 + Math.random() * 45,
        color: ['#ff2bd6', '#41d6ff', '#ffd24a', '#3ddc66'][i % 4],
      })),
    [lanes],
  )
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    data.forEach((d, i) => {
      const m = ships.current[i]
      if (!m) return
      const target = d.lane[d.idx]
      tmp.copy(target).sub(m.position)
      if (tmp.length() < 25) d.idx = (d.idx + 1) % d.lane.length
      else {
        m.position.addScaledVector(tmp.normalize(), d.speed * dt)
        m.lookAt(target)
      }
    })
  })

  return (
    <>
      {data.map((d, i) => (
        <group key={i} ref={(el) => (ships.current[i] = el)} position={d.lane[0].toArray()}>
          <mesh>
            <boxGeometry args={[8, 3, 14]} />
            <meshStandardMaterial color="#1a1d26" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 8]}>
            <sphereGeometry args={[1.8, 8, 6]} />
            <meshBasicMaterial color={d.color} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}
