import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Ship } from './Ship'
import { net } from '../game/net'
import { world } from '../game/world'
import { useStore } from '../game/store'

const COLORS = ['#41d6ff', '#ff5fa8', '#9dff5f', '#ffd24a', '#b08bff', '#ff8c5f']

function RemoteShip({ id, index }) {
  const ref = useRef()
  const targetPos = useMemo(() => new THREE.Vector3(), [])
  const targetQuat = useMemo(() => new THREE.Quaternion(), [])
  const hasState = useRef(false)

  useEffect(() => {
    world.remoteRefs.set(id, ref)
    return () => world.remoteRefs.delete(id)
  }, [id])

  useFrame((_, dt) => {
    const m = ref.current
    const r = net.remotes.get(id)
    if (!m || !r) return
    if (!r.last) {
      m.visible = false
      return
    }
    const [px, py, pz, qx, qy, qz, qw] = r.last
    targetPos.set(px, py, pz)
    targetQuat.set(qx, qy, qz, qw)
    if (!hasState.current) {
      hasState.current = true
      m.position.copy(targetPos)
      m.quaternion.copy(targetQuat)
    } else {
      m.position.lerp(targetPos, 1 - Math.exp(-10 * dt))
      m.quaternion.slerp(targetQuat, 1 - Math.exp(-10 * dt))
    }
    m.visible = true
  })

  const name = net.remotes.get(id)?.name || 'PILOT'
  return (
    <Ship ref={ref} body="#1a1a24" accent={COLORS[index % COLORS.length]} engine={COLORS[index % COLORS.length]}>
      <Html position={[0, 14, 0]} center distanceFactor={600} occlude={false}>
        <div className="pilot-tag">{name}</div>
      </Html>
    </Ship>
  )
}

export function RemotePlayers() {
  const remoteIds = useStore((s) => s.remoteIds)
  return (
    <>
      {remoteIds.map((id, i) => (
        <RemoteShip key={id} id={id} index={i} />
      ))}
    </>
  )
}
