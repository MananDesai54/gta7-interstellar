import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { world } from '../game/world'
import { BODIES } from '../game/physics'

const T = {
  earth: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
  earthNormal: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
  earthSpec: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
  clouds: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png',
  saturn: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/saturnmap.jpg',
  ringColor: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/saturnringcolor.jpg',
  ringAlpha: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/saturnringpattern.gif',
  mars: 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/marsmap1k.jpg',
}

// Each planet group tracks its orbital position from world.bodyPos (computed
// by PhysicsSystem) — the planets genuinely move.
function useOrbit(name, ref) {
  useFrame(() => {
    if (ref.current) ref.current.position.copy(world.bodyPos[name])
  })
}

function Earth() {
  const [map, normalMap, specularMap, cloudMap] = useTexture([T.earth, T.earthNormal, T.earthSpec, T.clouds])
  const group = useRef()
  const clouds = useRef()
  const planet = useRef()
  useOrbit('earth', group)
  useFrame((_, dt) => {
    if (planet.current) planet.current.rotation.y += dt * 0.02
    if (clouds.current) clouds.current.rotation.y += dt * 0.012
  })
  const R = BODIES.earth.radius
  return (
    <group ref={group}>
      <mesh ref={planet}>
        <sphereGeometry args={[R, 64, 48]} />
        <meshPhongMaterial map={map} normalMap={normalMap} specularMap={specularMap} specular="#334455" shininess={14} />
      </mesh>
      <mesh ref={clouds}>
        <sphereGeometry args={[R * 1.018, 64, 48]} />
        <meshLambertMaterial map={cloudMap} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.06, 48, 32]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function Saturn() {
  const [map, ringColor, ringAlpha] = useTexture([T.saturn, T.ringColor, T.ringAlpha])
  const group = useRef()
  const planet = useRef()
  useOrbit('saturn', group)
  const R = BODIES.saturn.radius
  const ringGeo = useMemo(() => {
    const inner = R * 1.3
    const outer = R * 2.1
    const g = new THREE.RingGeometry(inner, outer, 128, 4)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5)
    }
    return g
  }, [R])
  useFrame((_, dt) => {
    if (planet.current) planet.current.rotation.y += dt * 0.015
  })
  return (
    <group ref={group}>
      <mesh ref={planet}>
        <sphereGeometry args={[R, 64, 48]} />
        <meshStandardMaterial map={map} roughness={0.95} />
      </mesh>
      <mesh geometry={ringGeo} rotation-x={Math.PI / 2.25}>
        <meshBasicMaterial map={ringColor} alphaMap={ringAlpha} transparent opacity={0.95} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Mars() {
  const map = useTexture(T.mars)
  const group = useRef()
  useOrbit('mars', group)
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.025
  })
  return (
    <mesh ref={group}>
      <sphereGeometry args={[BODIES.mars.radius, 48, 32]} />
      <meshStandardMaterial map={map} roughness={1} />
    </mesh>
  )
}

// faint orbit guide rings around Helios
function OrbitLines() {
  const lines = useMemo(
    () =>
      ['mars', 'earth', 'saturn'].map((n) => {
        const a = BODIES[n].orbit.a
        const pts = []
        for (let i = 0; i <= 128; i++) {
          const w = (i / 128) * Math.PI * 2
          pts.push(new THREE.Vector3(a * Math.cos(w), 0, a * Math.sin(w)))
        }
        return new THREE.BufferGeometry().setFromPoints(pts)
      }),
    [],
  )
  return (
    <>
      {lines.map((g, i) => (
        <line key={i} geometry={g}>
          <lineBasicMaterial color="#2a3a55" transparent opacity={0.35} />
        </line>
      ))}
    </>
  )
}

export function Planets() {
  return (
    <>
      <Earth />
      <Saturn />
      <Mars />
      <OrbitLines />
    </>
  )
}
