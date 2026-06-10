import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { Ship } from './Ship'
import { world, fireLaser } from '../game/world'
import { useStore } from '../game/store'
import { advanceMission } from '../game/missions'
import { STORY } from '../game/story'
import { beep, setEngine } from '../game/audio'
import { BODIES, applyGravity } from '../game/physics'
import { thrustMultFor } from '../game/shop'
import { BH_POS } from '../game/constants'
import { BELT_A, BELT_SPREAD } from './AsteroidBelt'

export function PlayerShip() {
  const ref = useRef()
  const { camera } = useThree()
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
    if (s.dead) {
      setEngine(0, false)
      return
    }

    const k = getKeys()
    const freeze = s.stage === 'dialogue' || s.shopOpen

    if (!freeze) {
      ship.rotateY(((k.left ? 1 : 0) - (k.right ? 1 : 0)) * 1.6 * dt)
      ship.rotateX(((k.pitchDown ? 1 : 0) - (k.pitchUp ? 1 : 0)) * 1.3 * dt)
      ship.rotateZ(((k.rollL ? 1 : 0) - (k.rollR ? 1 : 0)) * 1.8 * dt)
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
    setEngine(thrust > 0 ? Math.min(1, thrust / (520 * mult)) : 0, boosting)

    world.playerVel.addScaledVector(fwd, thrust * dt)
    world.playerVel.multiplyScalar(1 - 0.35 * dt)

    // Newtonian gravity from every body — real pull, real slingshots
    const gravAccel = applyGravity(ship.position, world.playerVel, dt, world.bodyPos)
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

    // planet collisions — bounce, take hull damage
    for (const name of ['earth', 'saturn', 'mars']) {
      tmp.copy(ship.position).sub(world.bodyPos[name])
      if (tmp.length() < BODIES[name].bounceR) {
        ship.position.copy(world.bodyPos[name]).addScaledVector(tmp.normalize(), BODIES[name].bounceR + 2)
        world.playerVel.reflect(tmp)
        world.playerVel.multiplyScalar(0.4)
        beep(90, 0.2, 'sawtooth')
        s.damage(12, 'Lithobraked at terminal velocity.')
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

    // exhaust flicker + nav light blink
    ship.traverse((o) => {
      if (o.name === 'exhaust') {
        o.material.color.set(boosting ? '#ffaa00' : '#41d6ff')
        o.scale.setScalar(1 + (thrust > 0 ? 0.5 : 0) + Math.sin(t * 30) * 0.15)
      }
      if (o.name === 'navL' || o.name === 'navR') o.visible = Math.sin(t * 5) > -0.6
    })

    // chase camera
    camTarget.copy(ship.position).addScaledVector(fwd, -70).add(tmp.set(0, 24, 0).applyQuaternion(ship.quaternion))
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
      const copNear = [...world.cops.values()].some(
        (c) => c.alive && c.ref.current && c.ref.current.position.distanceTo(ship.position) < 1800,
      )
      decay.current = copNear ? 0 : decay.current + dt * (world.inBelt ? 3 : 1)
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

  return <Ship ref={ref} body="#15151a" accent={paint} position={[0, 0, 600]} />
}
