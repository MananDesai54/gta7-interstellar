import { useMemo } from 'react'
import * as THREE from 'three'

// Distant nebulae: big additive radial-gradient sprites. Pure atmosphere,
// one texture per hue, no per-frame cost.
function cloudTexture(hue) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const x = c.getContext('2d')
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 128)
  g.addColorStop(0, `hsla(${hue}, 80%, 62%, .85)`)
  g.addColorStop(0.4, `hsla(${hue}, 75%, 45%, .35)`)
  g.addColorStop(1, `hsla(${hue}, 70%, 30%, 0)`)
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  // lumpy secondary blobs so it reads as gas, not a circle
  for (let i = 0; i < 5; i++) {
    const bx = 60 + Math.random() * 136
    const by = 60 + Math.random() * 136
    const br = 30 + Math.random() * 60
    const g2 = x.createRadialGradient(bx, by, 4, bx, by, br)
    g2.addColorStop(0, `hsla(${hue + 20}, 85%, 70%, .5)`)
    g2.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = g2
    x.fillRect(0, 0, 256, 256)
  }
  return new THREE.CanvasTexture(c)
}

const CLOUDS = [
  { hue: 280, pos: [14000, 4500, -16000], scale: 16000 },
  { hue: 190, pos: [-19000, -3000, 9000], scale: 14000 },
  { hue: 20, pos: [6000, -6500, 21000], scale: 12000 },
  { hue: 320, pos: [-12000, 7000, -20000], scale: 10000 },
  { hue: 210, pos: [22000, 1500, 6000], scale: 9000 },
  { hue: 160, pos: [-4000, -9000, -14000], scale: 7000 },
]

export function Nebula() {
  const mats = useMemo(
    () =>
      CLOUDS.map(
        (c) =>
          new THREE.SpriteMaterial({
            map: cloudTexture(c.hue),
            transparent: true,
            opacity: 0.32,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  )
  return (
    <>
      {CLOUDS.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale, c.scale * 0.7, 1]} material={mats[i]} />
      ))}
    </>
  )
}
