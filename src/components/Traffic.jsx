import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Ship } from './Ship'
import { world } from '../game/world'
import { randPos } from '../game/constants'

const COLORS = ['#4f9fe8', '#7fd97f', '#e88fb8', '#c8c8d0', '#9a7fe8']
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

  return <Ship ref={ref} body="#23232b" accent={COLORS[index % COLORS.length]} position={data.spawn} scale={0.9} />
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
