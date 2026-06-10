import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'

export const BELT_A = 2450 // between Mars (2000) and Earth (2900)
export const BELT_SPREAD = 260
const COUNT = 380
const ORE_COUNT = 16

// Static rock field in a torus between the inner orbits. Cops lose your scent
// 3x faster inside — see PlayerShip. Some rocks glow gold: shoot them to
// crack ore loose, fly through the chunks to collect.
export function AsteroidBelt() {
  const mesh = useRef()
  const oreMesh = useRef()
  const rocks = useMemo(() => {
    const arr = []
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2
      const rad = BELT_A + (Math.random() - 0.5) * 2 * BELT_SPREAD
      arr.push({
        pos: new THREE.Vector3(Math.cos(a) * rad, (Math.random() - 0.5) * 160, Math.sin(a) * rad),
        r: 8 + Math.random() * 24,
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        ore: i < ORE_COUNT, // first N are ore-bearing
        oreHp: 30,
        oreReadyAt: 0,
      })
    }
    return arr
  }, [])

  useEffect(() => {
    world.asteroids = rocks
    const m = mesh.current
    if (!m) return
    const M = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    rocks.forEach((rock, i) => {
      q.setFromEuler(rock.rot)
      M.compose(rock.pos, q, new THREE.Vector3(rock.r, rock.r * (0.7 + Math.random() * 0.5), rock.r))
      m.setMatrixAt(i, M)
    })
    m.instanceMatrix.needsUpdate = true
    return () => {
      world.asteroids = []
    }
  }, [rocks])

  // ore glow shells — scale to zero while depleted
  const oreRocks = useMemo(() => rocks.filter((r) => r.ore), [rocks])
  useFrame((state) => {
    const m = oreMesh.current
    if (!m) return
    const t = state.clock.elapsedTime
    const M = new THREE.Matrix4()
    const pulse = 1.18 + Math.sin(t * 3) * 0.06
    oreRocks.forEach((rock, i) => {
      const s = t >= rock.oreReadyAt ? rock.r * pulse : 0.001
      M.makeTranslation(rock.pos.x, rock.pos.y, rock.pos.z)
      M.scale(new THREE.Vector3(s, s, s))
      m.setMatrixAt(i, M)
    })
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#6b6258" roughness={1} metalness={0.1} flatShading />
      </instancedMesh>
      <instancedMesh ref={oreMesh} args={[undefined, undefined, ORE_COUNT]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffd24a" toneMapped={false} transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </>
  )
}
