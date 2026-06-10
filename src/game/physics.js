import * as THREE from 'three'

// Gameplay-scaled Newtonian gravity. Planets ride analytic circular orbits
// (on rails, KSP-style) around Helios; the ship feels inverse-square pull
// from every body, so slingshots and decaying orbits are real.
export const BODIES = {
  helios: { radius: 700, gm: 9.0e7, killR: 770, fixed: [0, 0, 0] },
  mars: { radius: 200, gm: 1.5e6, bounceR: 215, orbit: { a: 2000, period: 320, phase: 2.1, incl: 0.05 } },
  earth: { radius: 320, gm: 4.0e6, bounceR: 338, orbit: { a: 2900, period: 480, phase: 0.4, incl: 0.03 } },
  saturn: { radius: 480, gm: 8.0e6, bounceR: 500, orbit: { a: 4300, period: 900, phase: 4.2, incl: 0.08 } },
  gargantua: { radius: 260, gm: 2.2e8, killR: 300, fixed: [-1400, 350, -5800] },
}

export const BODY_NAMES = Object.keys(BODIES)
export const MAP_R = 6500

export function bodyPos(name, t, out) {
  const b = BODIES[name]
  if (b.fixed) return out.set(b.fixed[0], b.fixed[1], b.fixed[2])
  const w = (2 * Math.PI * t) / b.orbit.period + b.orbit.phase
  out.set(
    b.orbit.a * Math.cos(w),
    b.orbit.a * Math.sin(b.orbit.incl) * Math.sin(w * 2),
    b.orbit.a * Math.sin(w),
  )
  return out
}

const tmpB = new THREE.Vector3()

// Sum gravitational acceleration at `pos` given the live body positions map.
// Returns total accel magnitude (for the HUD gravity warning).
export function applyGravity(pos, vel, dt, bodyPosMap) {
  let total = 0
  for (const name of BODY_NAMES) {
    const bp = bodyPosMap[name]
    if (!bp) continue
    tmpB.copy(bp).sub(pos)
    const d2 = Math.max(tmpB.lengthSq(), 10000)
    const a = Math.min(BODIES[name].gm / d2, 600)
    total += a
    vel.addScaledVector(tmpB.normalize(), a * dt)
  }
  return total
}
