import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'
import { useStore } from '../game/store'
import { beep } from '../game/audio'
import { sendPvpHit } from '../game/net'

const POOL = 80

const laserGeo = new THREE.CylinderGeometry(0.6, 0.6, 14, 6)
laserGeo.rotateX(Math.PI / 2)
const MATS = {
  friendly: new THREE.MeshBasicMaterial({ color: '#ff3344', toneMapped: false }),
  cop: new THREE.MeshBasicMaterial({ color: '#3d8bff', toneMapped: false }),
  remote: new THREE.MeshBasicMaterial({ color: '#ffd24a', toneMapped: false }),
}

export function Lasers() {
  const meshes = useRef([])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const s = useStore.getState()
    const t = state.clock.elapsedTime

    for (let i = world.lasers.length - 1; i >= 0; i--) {
      const L = world.lasers[i]
      L.pos.addScaledVector(L.vel, dt)
      L.life -= dt
      let hit = false

      if (L.kind === 'friendly') {
        for (const slot of world.npcs) {
          if (!slot || !slot.data.alive || !slot.ref.current) continue
          if (L.pos.distanceTo(slot.ref.current.position) < 18) {
            slot.data.hp -= 15
            hit = true
            if (s.wanted < 1) {
              s.setWanted(1)
              s.showBanner('★ WANTED ★', '#ffffff')
            }
            if (slot.data.hp <= 0) {
              slot.data.alive = false
              slot.data.hideUntil = t + 15
              slot.ref.current.visible = false
              world.explode(slot.ref.current.position.clone(), '#ffaa33')
              s.addCash(50)
              s.setWanted(s.wanted + 1)
            }
          }
        }
        for (const [id, c] of world.cops) {
          if (!c.alive || !c.ref.current) continue
          if (L.pos.distanceTo(c.ref.current.position) < 18) {
            c.hp -= 15
            hit = true
            if (c.hp <= 0) {
              c.alive = false
              world.explode(c.ref.current.position.clone(), '#88aaff')
              s.addCash(150)
              s.setWanted(s.wanted + 1)
              s.killCop(id)
              s.onCopKilled()
            }
          }
        }
        // PvP: my laser clipping another pilot — tell the server, they take it
        for (const [id, rref] of world.remoteRefs) {
          if (!rref.current || !rref.current.visible) continue
          if (L.pos.distanceTo(rref.current.position) < 18) {
            hit = true
            world.explode(L.pos.clone(), '#ff5fa8')
            sendPvpHit(id)
          }
        }
      } else if (L.kind === 'cop' && !s.dead && s.started && L.pos.distanceTo(world.playerPos) < 16) {
        hit = true
        beep(180, 0.1)
        s.damage(8, 'Smoked by space cops.')
      }
      // 'remote' lasers are cosmetic here — damage arrives via the server

      if (hit || L.life <= 0) world.lasers.splice(i, 1)
    }

    for (let i = 0; i < POOL; i++) {
      const m = meshes.current[i]
      if (!m) continue
      const L = world.lasers[i]
      if (L) {
        m.visible = true
        m.position.copy(L.pos)
        m.material = MATS[L.kind]
        tmp.copy(L.pos).add(L.vel)
        m.lookAt(tmp)
      } else {
        m.visible = false
      }
    }
  })

  return (
    <group>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh key={i} ref={(el) => (meshes.current[i] = el)} geometry={laserGeo} material={MATS.friendly} visible={false} />
      ))}
    </group>
  )
}
