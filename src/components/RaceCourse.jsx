import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'
import { useStore } from '../game/store'
import { beep } from '../game/audio'
import { sendRace } from '../game/net'

// Saturn Circuit: start gate + 7 rings looping the planet. Fly through the
// cyan gate to start the time trial; thread every ring; return to the gate.
const START = new THREE.Vector3(1350, 0, 0)
const RINGS = Array.from({ length: 7 }, (_, i) => {
  const a = ((i + 1) / 8) * Math.PI * 2
  return new THREE.Vector3(Math.cos(a) * 1350, (i % 2 ? 1 : -1) * 140, Math.sin(a) * 1350)
})
const RING_R = 85

function Ring({ idx, refFn }) {
  return (
    <group ref={refFn}>
      <mesh>
        <torusGeometry args={[RING_R, 5, 10, 40]} />
        <meshBasicMaterial color={idx === -1 ? '#41d6ff' : '#ffd24a'} toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

export function RaceCourse() {
  const startRef = useRef()
  const ringRefs = useRef([])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const cooldown = useRef(0)

  useFrame((state, dt) => {
    cooldown.current -= dt
    const saturn = world.bodyPos.saturn
    if (startRef.current) startRef.current.position.copy(saturn).add(START)
    const s = useStore.getState()
    RINGS.forEach((off, i) => {
      const r = ringRefs.current[i]
      if (!r) return
      r.position.copy(saturn).add(off)
      r.visible = s.race.active
      if (s.race.active) {
        const isNext = i === s.race.idx
        r.children[0].material.opacity = isNext ? 0.95 : 0.18
        if (isNext) r.rotation.y += dt * 2
      }
    })
    if (!s.started || s.dead || s.stage === 'dialogue') return

    const startPos = tmp.copy(saturn).add(START)
    const dStart = world.playerPos.distanceTo(startPos)

    if (!s.race.active) {
      if (dStart < RING_R && cooldown.current <= 0) {
        cooldown.current = 3
        beep(880, 0.2, 'sine')
        s.startRace()
      }
      return
    }

    // abandon if you wander off the circuit
    if (world.playerPos.distanceTo(saturn) > 3200) {
      s.cancelRace()
      return
    }

    if (s.race.idx < RINGS.length) {
      const target = tmp.copy(saturn).add(RINGS[s.race.idx])
      if (world.playerPos.distanceTo(target) < RING_R) {
        beep(990 + s.race.idx * 60, 0.12, 'sine')
        s.hitRing()
      }
    } else if (dStart < RING_R) {
      s.finishRace(sendRace)
      cooldown.current = 3
    }
  })

  return (
    <>
      <Ring idx={-1} refFn={(el) => (startRef.current = el)} />
      {RINGS.map((_, i) => (
        <Ring key={i} idx={i} refFn={(el) => (ringRefs.current[i] = el)} />
      ))}
    </>
  )
}
