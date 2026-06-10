import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'
import { beep } from '../game/audio'

const POOL = 8
const N = 60
const LIFE = 1.2

export function Explosions() {
  const slots = useMemo(
    () =>
      Array.from({ length: POOL }, () => ({
        life: 0,
        vels: Array.from({ length: N }, () => new THREE.Vector3()),
      })),
    [],
  )
  const points = useRef([])

  useEffect(() => {
    world.explode = (pos, color = '#ffaa33') => {
      const idx = slots.findIndex((s) => s.life <= 0)
      const slot = slots[idx === -1 ? 0 : idx]
      const p = points.current[idx === -1 ? 0 : idx]
      if (!p) return
      slot.life = LIFE
      const arr = p.geometry.attributes.position
      for (let i = 0; i < N; i++) {
        arr.setXYZ(i, pos.x, pos.y, pos.z)
        slot.vels[i]
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .setLength(40 + Math.random() * 120)
      }
      arr.needsUpdate = true
      p.material.color.set(color)
      p.visible = true
      beep(120, 0.25, 'sawtooth')
    }
    return () => {
      world.explode = () => {}
    }
  }, [slots])

  useFrame((_, dt) => {
    slots.forEach((slot, idx) => {
      const p = points.current[idx]
      if (!p || slot.life <= 0) return
      slot.life -= dt
      if (slot.life <= 0) {
        p.visible = false
        return
      }
      const arr = p.geometry.attributes.position
      for (let i = 0; i < N; i++) {
        arr.setXYZ(i, arr.getX(i) + slot.vels[i].x * dt, arr.getY(i) + slot.vels[i].y * dt, arr.getZ(i) + slot.vels[i].z * dt)
      }
      arr.needsUpdate = true
      p.material.opacity = slot.life / LIFE
    })
  })

  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <points key={i} ref={(el) => (points.current[i] = el)} visible={false} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[new Float32Array(N * 3), 3]} />
          </bufferGeometry>
          <pointsMaterial size={6} transparent toneMapped={false} />
        </points>
      ))}
    </>
  )
}
