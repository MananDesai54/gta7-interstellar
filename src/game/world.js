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

  asteroids: [], // {pos: Vector3, r} — filled by AsteroidBelt
  inBelt: false,
  stationPos: new THREE.Vector3(), // Earth garage, updated by Station
  convoy: null, // {groupRef, ships:[{offset, hp, alive}]} — set by Convoy

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
  world.missionAnchor = { body: anchor.body, offset: new THREE.Vector3(...anchor.offset) }
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
