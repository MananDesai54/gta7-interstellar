import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls, Trail } from '@react-three/drei'
import { Ship } from './Ship'
import { world, fireLaser } from '../game/world'
import { useStore } from '../game/store'
import { advanceMission } from '../game/missions'
import { STORY } from '../game/story'
import { beep, setEngine } from '../game/audio'
import { BODIES, applyGravity } from '../game/physics'
import { thrustMultFor } from '../game/shop'
import { BH_POS, CITY_POS, CITY_PAD } from '../game/constants'
import { DOCK_RANGE } from './Station'
import { BELT_A, BELT_SPREAD } from './AsteroidBelt'

const BOUNCY = ['earth', 'saturn', 'mars', 'luna']

export function PlayerShip() {
  const ref = useRef()
  const { camera, gl } = useThree()
  const [, getKeys] = useKeyboardControls()
  const paint = useStore((s) => s.paint)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const side = useMemo(() => new THREE.Vector3(), [])
  const camTarget = useMemo(() => new THREE.Vector3(), [])
  const fireCd = useRef(0)
  const copCd = useRef(0)
  const decay = useRef(0)
  const boostLocal = useRef(100)
  const spawned = useRef(false)
  const muzzleFlip = useRef(false)

  // pointer-lock mouse flight: click canvas to grab, ESC frees the cursor
  useEffect(() => {
    const el = gl.domElement
    const onClick = () => {
      const s = useStore.getState()
      if (s.started && !s.dead && !s.paused && !s.shopOpen && s.stage !== 'dialogue' && document.pointerLockElement !== el) {
        el.requestPointerLock()
      }
    }
    const onMove = (e) => {
      if (document.pointerLockElement === el) {
        world.mouse.dx += e.movementX
        world.mouse.dy += e.movementY
      }
    }
    el.addEventListener('click', onClick)
    document.addEventListener('mousemove', onMove)
    return () => {
      el.removeEventListener('click', onClick)
      document.removeEventListener('mousemove', onMove)
    }
  }, [gl])

  const spawnAtEarth = (ship) => {
    ship.position.copy(world.bodyPos.earth).add(tmp.set(0, 140, 760))
    ship.quaternion.identity()
  }

  useFrame((state, dt0) => {
    const ship = ref.current
    if (!ship) return
    const dt = Math.min(dt0, 0.05)
    const t = state.clock.elapsedTime
    const s = useStore.getState()

    if (world.resetPlayer) {
      spawnAtEarth(ship)
      world.resetPlayer = false
      boostLocal.current = s.maxBoost()
      world.warp = 0
    }
    if (world.teleportTo) {
      ship.position.set(...world.teleportTo)
      world.playerVel.set(0, 0, 0)
      world.teleportTo = null
    }

    if (!s.started) {
      const a = t * 0.04
      camera.position.set(BH_POS.x + Math.sin(a) * 2600, BH_POS.y + 1250, BH_POS.z + Math.cos(a) * 2600)
      camera.lookAt(BH_POS)
      return
    }

    if (!spawned.current) {
      spawned.current = true
      spawnAtEarth(ship)
    }

    ship.visible = !s.dead
    if (s.dead || s.paused) {
      setEngine(0, false)
      world.mouse.dx = world.mouse.dy = 0
      if (s.paused && document.pointerLockElement) document.exitPointerLock()
      return
    }

    const k = getKeys()
    const freeze = s.stage === 'dialogue' || s.shopOpen
    if (freeze && document.pointerLockElement) document.exitPointerLock()

    if (!freeze) {
      // mouse steering + keyboard fallback
      const mx = world.mouse.dx
      const my = world.mouse.dy
      world.mouse.dx = world.mouse.dy = 0
      ship.rotateY(-mx * 0.0021 + ((k.left ? 1 : 0) - (k.right ? 1 : 0)) * 1.6 * dt)
      ship.rotateX(-my * 0.0019 + ((k.pitchDown ? 1 : 0) - (k.pitchUp ? 1 : 0)) * 1.3 * dt)
      ship.rotateZ(((k.rollL ? 1 : 0) - (k.rollR ? 1 : 0)) * 1.8 * dt)
    } else {
      world.mouse.dx = world.mouse.dy = 0
    }

    fwd.set(0, 0, -1).applyQuaternion(ship.quaternion)

    const mult = thrustMultFor(s.upgrades)
    const maxBoost = s.maxBoost()
    let thrust = 0
    let boosting = false
    if (!freeze) {
      if (k.forward) thrust = 220 * mult
      if (k.back) thrust = -120 * mult
      boosting = k.boost && k.forward && boostLocal.current > 0
      if (boosting) {
        thrust = 520 * mult
        boostLocal.current = Math.max(0, boostLocal.current - 22 * dt)
      } else {
        boostLocal.current = Math.min(maxBoost, boostLocal.current + 8 * dt)
      }
      if (Math.abs(boostLocal.current - s.boost) > 1) s.setBoost(Math.round(boostLocal.current))
    }

    // ---- overdrive (X): long-haul travel. Cuts out near gravity, heat or rocks ----
    const copNear = [...world.cops.values()].some(
      (c) => c.alive && c.ref.current && c.ref.current.position.distanceTo(ship.position) < 1200,
    )
    const gravAccelPeek = world.lastGrav || 0
    const warpAllowed = !freeze && k.warp && k.forward && !copNear && gravAccelPeek < 28 && !world.inBelt
    world.warp = THREE.MathUtils.lerp(world.warp, warpAllowed ? 1 : 0, 1 - Math.exp(-3 * dt))
    if (world.warp > 0.02) thrust *= 1 + world.warp * 5
    camera.fov = THREE.MathUtils.lerp(camera.fov, 70 + world.warp * 16, 1 - Math.exp(-6 * dt))
    camera.updateProjectionMatrix()

    setEngine(thrust > 0 ? Math.min(1, thrust / (520 * mult)) : 0, boosting || world.warp > 0.4)

    world.playerVel.addScaledVector(fwd, thrust * dt)
    world.playerVel.multiplyScalar(1 - (0.35 + world.warp * 0.5) * dt)

    // Newtonian gravity from every body — real pull, real slingshots
    const gravAccel = applyGravity(ship.position, world.playerVel, dt, world.bodyPos)
    world.lastGrav = gravAccel
    world.gravWarn = gravAccel > 30

    if (ship.position.distanceTo(world.bodyPos.helios) < BODIES.helios.killR) {
      s.kill('Flash-fried by Helios.')
      return
    }
    if (ship.position.distanceTo(world.bodyPos.gargantua) < BODIES.gargantua.killR) {
      s.kill('Spaghettified by Gargantua.')
      return
    }

    ship.position.addScaledVector(world.playerVel, dt)

    // planet + moon collisions — bounce, take hull damage
    for (const name of BOUNCY) {
      tmp.copy(ship.position).sub(world.bodyPos[name])
      if (tmp.length() < BODIES[name].bounceR) {
        ship.position.copy(world.bodyPos[name]).addScaledVector(tmp.normalize(), BODIES[name].bounceR + 2)
        world.playerVel.reflect(tmp)
        world.playerVel.multiplyScalar(0.4)
        beep(90, 0.2, 'sawtooth')
        s.damage(12, 'Lithobraked at terminal velocity.')
      }
    }

    // Neo Vega buildings — AABB pushout
    if (ship.position.distanceTo(CITY_POS) < 950) {
      for (const b of world.buildings) {
        const p = ship.position
        if (p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z) {
          // push out along the axis of least penetration
          const dx = Math.min(p.x - b.min.x, b.max.x - p.x)
          const dy = Math.min(p.y - b.min.y, b.max.y - p.y)
          const dz = Math.min(p.z - b.min.z, b.max.z - p.z)
          if (dx <= dy && dx <= dz) {
            p.x = p.x - b.min.x < b.max.x - p.x ? b.min.x - 1 : b.max.x + 1
            world.playerVel.x *= -0.3
          } else if (dy <= dz) {
            p.y = p.y - b.min.y < b.max.y - p.y ? b.min.y - 1 : b.max.y + 1
            world.playerVel.y *= -0.3
          } else {
            p.z = p.z - b.min.z < b.max.z - p.z ? b.min.z - 1 : b.max.z + 1
            world.playerVel.z *= -0.3
          }
          world.playerVel.multiplyScalar(0.6)
          beep(100, 0.15, 'sawtooth')
          s.damage(8, 'Became a billboard on a Neo Vega tower.')
          break
        }
      }
    }

    // asteroid belt: collisions + police scent cover
    const flatR = Math.hypot(ship.position.x, ship.position.z)
    world.inBelt = Math.abs(flatR - BELT_A) < BELT_SPREAD + 60 && Math.abs(ship.position.y) < 220
    if (world.inBelt) {
      for (const rock of world.asteroids) {
        tmp.copy(ship.position).sub(rock.pos)
        const d = tmp.length()
        if (d < rock.r + 14) {
          ship.position.copy(rock.pos).addScaledVector(tmp.normalize(), rock.r + 16)
          world.playerVel.reflect(tmp)
          world.playerVel.multiplyScalar(0.45)
          beep(110, 0.18, 'sawtooth')
          s.damage(8, 'Cratered into a belt rock.')
          break
        }
      }
    }

    // dock detection: Meridian Station or the Neo Vega pad
    s.setNearStation(
      ship.position.distanceTo(world.stationPos) < DOCK_RANGE || ship.position.distanceTo(CITY_PAD) < 240,
    )

    // exhaust flicker + nav light blink
    ship.traverse((o) => {
      if (o.name === 'exhaust') {
        o.material.color.set(world.warp > 0.5 ? '#ff2bd6' : boosting ? '#ffaa00' : '#41d6ff')
        o.scale.setScalar(1 + (thrust > 0 ? 0.5 : 0) + world.warp * 0.8 + Math.sin(t * 30) * 0.15)
      }
      if (o.name === 'navL' || o.name === 'navR') o.visible = Math.sin(t * 5) > -0.6
    })

    // chase camera + shake
    world.shake = Math.max(0, world.shake - dt * 1.6)
    camTarget.copy(ship.position).addScaledVector(fwd, -70).add(tmp.set(0, 24, 0).applyQuaternion(ship.quaternion))
    if (world.shake > 0.01) {
      camTarget.x += (Math.random() - 0.5) * 14 * world.shake
      camTarget.y += (Math.random() - 0.5) * 14 * world.shake
      camTarget.z += (Math.random() - 0.5) * 14 * world.shake
    }
    camera.position.lerp(camTarget, 1 - Math.exp(-6 * dt))
    camera.quaternion.slerp(ship.quaternion, 1 - Math.exp(-6 * dt))

    // fire — dual cannons alternate barrels
    fireCd.current -= dt
    if (!freeze && k.fire && fireCd.current <= 0) {
      fireCd.current = s.upgrades.dual ? 0.11 : 0.16
      side.set(1, 0, 0).applyQuaternion(ship.quaternion)
      const lateral = s.upgrades.dual ? (muzzleFlip.current ? 7 : -7) : 0
      muzzleFlip.current = !muzzleFlip.current
      const muzzle = tmp.copy(ship.position).addScaledVector(fwd, 20).addScaledVector(side, lateral)
      fireLaser(muzzle, fwd, 'friendly')
    }

    // ---- objectives ----
    const nearMarker = !world.markerHidden && ship.position.distanceTo(world.missionPos) < 70
    if (s.stage === 'active' && s.chapter < STORY.length) {
      const obj = STORY[s.chapter].objective
      if (obj.type === 'goto' && nearMarker) {
        beep(1320, 0.25, 'sine')
        s.completeChapter()
      } else if (obj.type === 'checkpoints' && nearMarker) {
        beep(990, 0.15, 'sine')
        s.onCheckpoint()
      } else if (obj.type === 'corewell') {
        if (!s.carryingCore && nearMarker) {
          beep(990, 0.15, 'sine')
          s.pickupCore()
        } else if (s.carryingCore && ship.position.distanceTo(world.bodyPos.gargantua) > obj.escapeDist) {
          beep(1320, 0.25, 'sine')
          s.completeChapter()
        }
      }
      // collectOre / destroyBoss complete via store hooks
    } else if (s.stage === 'freeroam' && world.mission && nearMarker) {
      beep(world.missionPhase === 0 ? 990 : 1320, 0.2, 'sine')
      advanceMission(s)
    }

    // wanted: cop spawns + heat decay (belt cover decays 3x faster)
    if (s.wanted > 0) {
      copCd.current -= dt
      const alive = [...world.cops.values()].filter((c) => c.alive).length
      if (alive < s.wanted * 2 && copCd.current <= 0) {
        s.spawnCop()
        copCd.current = 4
      }
      const copClose = [...world.cops.values()].some(
        (c) => c.alive && c.ref.current && c.ref.current.position.distanceTo(ship.position) < 1800,
      )
      decay.current = copClose ? 0 : decay.current + dt * (world.inBelt ? 3 : 1)
      if (decay.current > 12) {
        decay.current = 0
        const next = s.wanted - 1
        s.setWanted(next)
        if (next === 0) {
          s.showBanner('HEAT LOST', '#7ec8ff')
          s.onHeatLost()
        }
      }
    }

    world.playerPos.copy(ship.position)
    world.playerQuat.copy(ship.quaternion)
  })

  return (
    <Ship ref={ref} body="#15151a" accent={paint} position={[0, 0, 600]}>
      {/* engine trails ride the nacelle exhausts */}
      {[-4.6, 4.6].map((x) => (
        <Trail key={x} width={5} length={7} color="#41d6ff" attenuation={(t) => t * t} decay={1.5}>
          <mesh position={[x, -0.4, 11]}>
            <sphereGeometry args={[0.1, 4, 4]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </Trail>
      ))}
    </Ship>
  )
}
