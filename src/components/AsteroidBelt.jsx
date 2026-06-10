import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { world } from '../game/world'

export const BELT_A = 2450 // between Mars (2000) and Earth (2900)
export const BELT_SPREAD = 260
const COUNT = 380

// Static rock field in a torus between the inner orbits. Cops lose your scent
// 3x faster inside — see PlayerShip.
export function AsteroidBelt() {
  const mesh = useRef()
  const rocks = useMemo(() => {
    const arr = []
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2
      const rad = BELT_A + (Math.random() - 0.5) * 2 * BELT_SPREAD
      arr.push({
        pos: new THREE.Vector3(Math.cos(a) * rad, (Math.random() - 0.5) * 160, Math.sin(a) * rad),
        r: 8 + Math.random() * 24,
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
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

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#6b6258" roughness={1} metalness={0.1} flatShading />
    </instancedMesh>
  )
}
