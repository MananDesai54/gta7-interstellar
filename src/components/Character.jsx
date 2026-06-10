import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { Model } from './Model'
import { world, fireLaser } from '../game/world'
import { useStore } from '../game/store'
import { beep, setEngine } from '../game/audio'
import { SURFACES } from '../game/surfaces'

const WALK = 42
const RUN = 85

// On-foot mode: the pilot steps out of the parked ship. WASD walk (mouse
// turns), SHIFT run, SPACE jump (glorious on Luna), click to fire the
// sidearm, F near the ship to board.
export function Character() {
  const onFoot = useStore((s) => s.onFoot)
  if (!onFoot) return null
  return <Astronaut />
}

function Astronaut() {
  const ref = useRef()
  const { camera, gl } = useThree()
  const [, getKeys] = useKeyboardControls()
  const vel = useMemo(() => new THREE.Vector3(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const camTarget = useMemo(() => new THREE.Vector3(), [])
  const boardHeld = useRef(true) // F still held from exiting — wait for release
  const fireCd = useRef(0)
  const bob = useRef(0)

  // sidearm: click while pointer-locked
  useEffect(() => {
    const onDown = () => {
      if (document.pointerLockElement !== gl.domElement) return
      const m = ref.current
      if (!m || fireCd.current > 0) return
      fireCd.current = 0.25
      fwd.set(0, 0, -1).applyQuaternion(m.quaternion)
      fireLaser(tmp.copy(m.position).add(fwd.clone().multiplyScalar(5)).add(new THREE.Vector3(0, 3.5, 0)), fwd, 'friendly')
    }
    gl.domElement.addEventListener('mousedown', onDown)
    return () => gl.domElement.removeEventListener('mousedown', onDown)
  }, [gl, fwd, tmp])

  useFrame((state, dt0) => {
    const m = ref.current
    if (!m) return
    const dt = Math.min(dt0, 0.05)
    const s = useStore.getState()
    const cfg = SURFACES[world.surface]
    if (!cfg) return
    if (s.dead || s.paused || s.stage === 'dialogue' || s.shopOpen) return
    const k = getKeys()
    fireCd.current -= dt
    setEngine(0, false)

    if (world.footTeleport) {
      m.position.set(...world.footTeleport)
      world.footTeleport = null
    }
    // first frame: spawn beside the ship
    if (!m.userData.spawned) {
      m.userData.spawned = true
      m.position.copy(world.shipPos).add(tmp.set(14, 0, 6))
      m.position.y = cfg.y + 10
      m.quaternion.copy(world.playerQuat)
      vel.set(0, 0, 0)
    }

    // mouse turns the character
    const mx = world.mouse.dx
    world.mouse.dx = world.mouse.dy = 0
    m.rotateY(-mx * 0.0024 + ((k.left ? 1 : 0) - (k.right ? 1 : 0)) * 2.2 * dt)

    fwd.set(0, 0, -1).applyQuaternion(m.quaternion)
    const grounded = m.position.y <= cfg.y + 10.2

    // walk / run
    const speed = k.boost ? RUN : WALK
    const move = (k.forward ? 1 : 0) - (k.back ? 1 : 0)
    vel.x = fwd.x * move * speed
    vel.z = fwd.z * move * speed

    // jump — height tuned per-planet so Luna feels like Luna
    if (k.fire && grounded) {
      vel.y = Math.sqrt(2 * cfg.gravity * 7)
      beep(330, 0.08, 'triangle')
    }
    vel.y -= cfg.gravity * dt

    m.position.addScaledVector(vel, dt)
    if (m.position.y < cfg.y + 10) {
      m.position.y = cfg.y + 10
      vel.y = 0
    }
    // stay on the island
    const flat = Math.hypot(m.position.x, m.position.z)
    if (flat > 5500) {
      const f = 5500 / flat
      m.position.x *= f
      m.position.z *= f
    }

    // walk bob
    bob.current += dt * (Math.abs(move) > 0 ? (k.boost ? 14 : 9) : 0)
    m.children[0] && (m.children[0].position.y = grounded && move ? Math.abs(Math.sin(bob.current)) * 0.7 : 0)

    // GTA-style third person: pulled back, raised, slight right-shoulder
    // offset — the astronaut stays fully in frame lower-center
    const right = tmp.set(1, 0, 0).applyQuaternion(m.quaternion)
    camTarget
      .copy(m.position)
      .addScaledVector(fwd, -44)
      .addScaledVector(right, 7)
      .add(new THREE.Vector3(0, 20, 0))
    camera.position.lerp(camTarget, 1 - Math.exp(-8 * dt))
    tmp.copy(m.position).addScaledVector(fwd, 22).add(new THREE.Vector3(0, 5, 0))
    camera.lookAt(tmp)

    // board the ship
    const nearShip = m.position.distanceTo(world.shipPos) < 30
    world.boardPrompt = nearShip
    if (k.exit && !boardHeld.current && nearShip) {
      boardHeld.current = true
      world.boardPrompt = false
      useStore.getState().setOnFoot(false)
      world.playerVel.set(0, 0, 0)
      beep(660, 0.12, 'sine')
      return
    }
    if (!k.exit) boardHeld.current = false

    // pickups + turret targeting follow the pilot now
    world.playerPos.copy(m.position)
    world.playerQuat.copy(m.quaternion)
  })

  return (
    <group ref={ref}>
      <Model url="/models/astronautA.glb" scale={9} rotation-y={Math.PI} />
    </group>
  )
}
