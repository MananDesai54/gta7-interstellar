import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world, spawnPickup } from '../game/world'
import { useStore } from '../game/store'
import { beep } from '../game/audio'

const POOL = 80

const laserGeo = new THREE.CylinderGeometry(0.6, 0.6, 14, 6)
laserGeo.rotateX(Math.PI / 2)
const MATS = {
  friendly: new THREE.MeshBasicMaterial({ color: '#ff3344', toneMapped: false }),
  cop: new THREE.MeshBasicMaterial({ color: '#3d8bff', toneMapped: false }),
  pirate: new THREE.MeshBasicMaterial({ color: '#ff7a22', toneMapped: false }),
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
              s.addCash(c.elite ? 350 : 150)
              spawnPickup(c.ref.current.position, c.elite ? 100 : 50)
              s.setWanted(s.wanted + 1)
              s.killCop(id)
              s.onCopKilled()
            }
          }
        }
        // pirates (and the boss)
        for (const slot of world.pirates) {
          if (!slot || !slot.data.alive || !slot.ref.current) continue
          if (L.pos.distanceTo(slot.ref.current.position) < (slot.data.boss ? 34 : 18)) {
            slot.data.hp -= 15
            hit = true
            if (slot.data.hp <= 0) {
              slot.data.alive = false
              slot.data.respawnAt = t + (slot.data.boss ? 120 : 60)
              slot.ref.current.visible = false
              world.explode(slot.ref.current.position.clone(), '#ff4433')
              if (slot.data.boss) {
                for (let j = 0; j < 4; j++) spawnPickup(slot.ref.current.position, 500)
                s.showBanner('RED VARGA DOWN', '#ff4433')
                s.onBossKilled()
              } else {
                s.addCash(150)
                spawnPickup(slot.ref.current.position, 50)
                if (Math.random() < 0.5) spawnPickup(slot.ref.current.position, 50)
              }
            }
          }
        }
        // ore rocks — crack them open
        for (const rock of world.asteroids) {
          if (!rock.ore || t < rock.oreReadyAt) continue
          if (L.pos.distanceTo(rock.pos) < rock.r + 8) {
            rock.oreHp -= 15
            hit = true
            beep(300, 0.08, 'triangle')
            if (rock.oreHp <= 0) {
              rock.oreHp = 30
              rock.oreReadyAt = t + 40
              world.explode(rock.pos.clone(), '#ffd24a')
              const n = 2 + (Math.random() < 0.4 ? 1 : 0)
              for (let j = 0; j < n; j++) spawnPickup(rock.pos, 0, 'ore')
            }
            break
          }
        }
        // smuggler convoy haulers
        if (world.convoy?.groupRef.current) {
          const g = world.convoy.groupRef.current
          for (const sh of world.convoy.ships) {
            if (!sh.alive) continue
            tmp.copy(sh.offset)
            g.localToWorld(tmp)
            if (L.pos.distanceTo(tmp) < 22) {
              sh.hp -= 15
              hit = true
              if (sh.hp <= 0) {
                sh.alive = false
                if (sh.ref) sh.ref.visible = false
                world.explode(tmp.clone(), '#f5c843')
                s.addCash(100)
              }
            }
          }
        }
      } else if ((L.kind === 'cop' || L.kind === 'pirate') && !s.dead && s.started && L.pos.distanceTo(world.playerPos) < 16) {
        hit = true
        beep(180, 0.1)
        s.damage(L.kind === 'pirate' ? 9 : 8, L.kind === 'pirate' ? "Shredded by Varga's crew." : 'Smoked by space cops.')
      }

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
