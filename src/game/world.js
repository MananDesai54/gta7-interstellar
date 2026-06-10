import * as THREE from 'three'
import { beep } from './audio'
import { BODY_NAMES } from './physics'

// Mutable per-frame game state shared between systems. Kept outside React/zustand
// so 60fps mutation never triggers renders; the HUD polls what it needs.
export const world = {
  playerPos: new THREE.Vector3(0, 0, 600),
  playerQuat: new THREE.Quaternion(),
  playerVel: new THREE.Vector3(),
  resetPlayer: false,
  gravWarn: false,

  simTime: 0, // shared-epoch seconds, drives orbits
  bodyPos: Object.fromEntries(BODY_NAMES.map((n) => [n, new THREE.Vector3()])),

  lasers: [], // {pos, vel, life, kind: 'friendly'|'cop'}
  npcs: [],
  cops: new Map(),

  asteroids: [], // {pos: Vector3, r, ore?} — filled by AsteroidBelt
  inBelt: false,
  stationPos: new THREE.Vector3(), // Earth garage, updated by Station
  convoy: null, // {groupRef, ships:[{offset, hp, alive}]} — set by Convoy

  buildings: [], // city AABBs {min, max} — filled by City
  pirates: [], // {ref, data:{hp, alive, boss, ...}} — filled by Pirates
  pickups: [], // {pos, value, type:'cash'|'ore', live} — floating loot
  camera: null, // live three camera, for HUD screen projection
  mouse: { dx: 0, dy: 0 },
  shake: 0, // camera shake amount, decays in PlayerShip
  flashT: 0, // last damage timestamp (performance.now), HUD reads
  warp: 0, // 0..1 overdrive amount, HUD reads
  invulnUntil: 0, // respawn grace period (performance.now)
  surface: null, // mirrors store.surface for the frame loops
  landedBody: null, // which body we landed on, for the return-to-orbit
  turrets: [], // surface defense turrets {ref, data:{hp, alive, ...}}

  // mission marker, anchored to an orbiting body when anchor is set
  mission: null,
  missionPhase: 0,
  missionPos: new THREE.Vector3(0, 0, 0),
  missionAnchor: null, // {body, offset: Vector3} | null (static)
  markerHidden: false,

  explode: () => {},
}

export function setAnchor(anchor) {
  if (!anchor) {
    world.missionAnchor = null
    return
  }
  if (anchor.static) {
    world.missionAnchor = null
    world.missionPos.set(...anchor.static)
    return
  }
  world.missionAnchor = { body: anchor.body, offset: new THREE.Vector3(...anchor.offset) }
}

const PICKUP_POOL = 48
export function spawnPickup(pos, value, type = 'cash') {
  let slot = world.pickups.find((p) => !p.live)
  if (!slot) {
    if (world.pickups.length >= PICKUP_POOL) slot = world.pickups[0]
    else {
      slot = { pos: new THREE.Vector3(), value: 0, type: 'cash', live: false }
      world.pickups.push(slot)
    }
  }
  slot.pos.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 50))
  slot.value = value
  slot.type = type
  slot.live = true
}

export function fireLaser(pos, dir, kind) {
  world.lasers.push({
    pos: pos.clone(),
    vel: dir.clone().normalize().multiplyScalar(900),
    life: 2.2,
    kind,
  })
  const dist = kind === 'friendly' ? 0 : pos.distanceTo(world.playerPos)
  beep(kind === 'friendly' ? 880 : 440, 0.08, 'square', dist)
}
