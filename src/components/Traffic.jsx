import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Model, CRAFTS } from './Model'
import { world } from '../game/world'
import { useStore } from '../game/store'
import { randPos } from '../game/constants'

const NPC_COUNT = 14

function Npc({ index }) {
  const ref = useRef()
  const data = useMemo(
    () => ({
      target: randPos(),
      speed: 60 + Math.random() * 60,
      hp: 30,
      alive: true,
      hideUntil: 0,
      spawn: randPos(),
    }),
    [],
  )
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    world.npcs[index] = { ref, data }
    return () => {
      world.npcs[index] = null
    }
  }, [index, data])

  useFrame((state, dt) => {
    const m = ref.current
    if (!m) return
    if (useStore.getState().paused) return
    const t = state.clock.elapsedTime
    if (!data.alive) {
      if (t > data.hideUntil) {
        data.alive = true
        data.hp = 30
        m.position.copy(randPos())
        m.visible = true
      }
      return
    }
    tmp.copy(data.target).sub(m.position)
    if (tmp.length() < 100) data.target = randPos()
    else {
      m.position.addScaledVector(tmp.normalize(), data.speed * dt)
      m.lookAt(data.target)
    }
  })

  return (
    <group ref={ref} position={data.spawn}>
      <Model url={CRAFTS[index % CRAFTS.length]} scale={11} rotation-y={Math.PI} />
    </group>
  )
}

export function Traffic() {
  return (
    <>
      {Array.from({ length: NPC_COUNT }, (_, i) => (
        <Npc key={i} index={i} />
      ))}
    </>
  )
}
