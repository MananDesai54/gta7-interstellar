import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Ship } from './Ship'
import { world } from '../game/world'
import { useStore } from '../game/store'
import { WORLD_R } from '../game/constants'

const OFFSETS = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-60, 10, 70), new THREE.Vector3(60, -10, 70)]
const SPEED = 95
const SPAWN_EVERY = 110 // seconds between convoys

// Random event: a smuggler convoy crosses the system every couple of minutes.
// Wipe all three haulers for a fat payout (and a fat wanted level).
export function Convoy() {
  const group = useRef()
  const [run, setRun] = useState(0) // bump to respawn ships fresh
  const data = useMemo(
    () => ({
      active: false,
      nextAt: 35, // first convoy ~35s in
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      ships: OFFSETS.map((offset) => ({ offset, hp: 40, alive: true })),
    }),
    [],
  )
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const s = useStore.getState()
    const t = state.clock.elapsedTime
    const g = group.current

    if (!data.active) {
      if (s.started && t > data.nextAt) {
        data.active = true
        const a = Math.random() * Math.PI * 2
        data.from.set(Math.cos(a) * WORLD_R, (Math.random() - 0.5) * 400, Math.sin(a) * WORLD_R)
        data.to.copy(data.from).multiplyScalar(-1)
        data.ships.forEach((sh) => {
          sh.hp = 40
          sh.alive = true
        })
        world.convoy = { groupRef: group, ships: data.ships }
        setRun((r) => r + 1)
        if (g) {
          g.position.copy(data.from)
          g.lookAt(data.to)
          g.visible = true
        }
        s.showBanner('SMUGGLER CONVOY SIGHTED', '#f5c843')
      }
      return
    }

    if (!g) return
    tmp.copy(data.to).sub(g.position)
    if (tmp.length() < 200) {
      // made it across — gone
      data.active = false
      data.nextAt = t + SPAWN_EVERY
      world.convoy = null
      g.visible = false
      return
    }
    g.position.addScaledVector(tmp.normalize(), SPEED * dt)

    // all destroyed?
    if (data.ships.every((sh) => !sh.alive)) {
      data.active = false
      data.nextAt = t + SPAWN_EVERY
      world.convoy = null
      g.visible = false
      s.addCash(1000)
      s.setWanted(s.wanted + 2)
      s.showBanner('CONVOY ROBBED — $1,000', '#6dd96d')
    }
  })

  return (
    <group ref={group} visible={false} key={run}>
      {data.ships.map((sh, i) => (
        <group key={i} position={sh.offset} ref={(el) => (sh.ref = el)}>
          <Ship body="#3a2f1a" accent="#f5c843" engine="#ffae00" scale={1.15} />
        </group>
      ))}
    </group>
  )
}
