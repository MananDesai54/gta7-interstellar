import * as THREE from 'three'
import { BODIES } from './physics'

export const WORLD_R = 5200

// BlackHole component + gravity warnings read these
export const BH_POS = new THREE.Vector3(...BODIES.gargantua.fixed)
export const BH_EVENT_HORIZON = BODIES.gargantua.radius

export const STATIONS = [
  '📻 Gargantua FM — Event Horizon Classics',
  '📻 Ring Road Radio — Saturn Drift Hits',
  '📻 Blue Marble 98.5 — Old Earth Anthems',
  '📻 K-SLIP — Relativity Rap',
  '📻 Helios Heat — Coronal Mass Bangers',
  '📻 Static FM — (no signal this deep in the well)',
]

export function randPos() {
  return new THREE.Vector3(
    (Math.random() - 0.5) * 2 * WORLD_R,
    (Math.random() - 0.5) * 900,
    (Math.random() - 0.5) * 2 * WORLD_R,
  )
}
