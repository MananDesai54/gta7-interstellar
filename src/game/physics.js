import * as THREE from 'three'

// Gameplay-scaled Newtonian gravity. Planets ride analytic orbits (on rails,
// KSP-style) around Helios; the ship feels inverse-square pull from every
// body, so slingshots and decaying orbits are real.
export const BODIES = {
  helios: { radius: 700, gm: 9.0e7, killR: 770, fixed: [0, 0, 0] },
  mars: { radius: 200, gm: 1.5e6, bounceR: 215, orbit: { a: 2000, period: 320, phase: 2.1, incl: 0.05 } },
  earth: { radius: 320, gm: 4.0e6, bounceR: 338, orbit: { a: 2900, period: 480, phase: 0.4, incl: 0.03 } },
  luna: { radius: 85, gm: 2.5e5, bounceR: 95, orbit: { a: 640, period: 75, phase: 1.2, incl: 0.18, parent: 'earth' } },
  saturn: { radius: 480, gm: 8.0e6, bounceR: 500, orbit: { a: 4300, period: 900, phase: 4.2, incl: 0.08 } },
  gargantua: { radius: 260, gm: 2.2e8, killR: 300, fixed: [-1400, 350, -5800] },
  comet: { radius: 38, gm: 0, orbit: { ellipse: true, a: 5400, e: 0.58, period: 1500, phase: 2.6, incl: 0.2 } },
}

export const BODY_NAMES = Object.keys(BODIES)
export const MAP_R = 6500

export function bodyPos(name, t, out) {
  const b = BODIES[name]
  if (b.fixed) return out.set(b.fixed[0], b.fixed[1], b.fixed[2])
  const o = b.orbit
  const w = (2 * Math.PI * t) / o.period + o.phase
  if (o.ellipse) {
    // visually elliptical sweep (uniform angle — close enough for gameplay)
    const r = (o.a * (1 - o.e * o.e)) / (1 + o.e * Math.cos(w))
    out.set(r * Math.cos(w), o.a * Math.sin(o.incl) * Math.sin(w), r * Math.sin(w))
    return out
  }
  out.set(o.a * Math.cos(w), o.a * Math.sin(o.incl) * Math.sin(w * 2), o.a * Math.sin(w))
  if (o.parent) {
    const p = bodyPos(o.parent, t, _parentTmp)
    out.add(p)
  }
  return out
}
const _parentTmp = new THREE.Vector3()

const tmpB = new THREE.Vector3()

// Sum gravitational acceleration at `pos` given the live body positions map.
// Returns total accel magnitude (for the HUD gravity warning).
export function applyGravity(pos, vel, dt, bodyPosMap) {
  let total = 0
  for (const name of BODY_NAMES) {
    const gm = BODIES[name].gm
    if (!gm) continue
    const bp = bodyPosMap[name]
    if (!bp) continue
    tmpB.copy(bp).sub(pos)
    const d2 = Math.max(tmpB.lengthSq(), 10000)
    const a = Math.min(gm / d2, 600)
    total += a
    vel.addScaledVector(tmpB.normalize(), a * dt)
  }
  return total
}
