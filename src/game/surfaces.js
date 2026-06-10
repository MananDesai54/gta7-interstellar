// Landable planet surfaces. Each lives at its own deep-Y offset in scene
// space so the solar system stays where it is. Gravity is per-world;
// climb past `ceiling` to return to orbit.
export const SURFACES = {
  earth: {
    name: 'BAHÍA LIBRE',
    y: -40000,
    sky: '#6fb7e0',
    fog: '#8ec7e6',
    fogFar: 5200,
    ground: '#0e3a52', // ocean
    gravity: 70,
    sun: '#fff4da',
    ambient: 1.1,
  },
  mars: {
    name: 'RED GULCH',
    y: -60000,
    sky: '#c46a3a',
    fog: '#b05a32',
    fogFar: 4200,
    ground: '#7e3b22',
    gravity: 45,
    sun: '#ffd9b8',
    ambient: 0.8,
  },
  luna: {
    name: 'TRANQUILITY FLATS',
    y: -80000,
    sky: '#05060a',
    fog: '#05060a',
    fogFar: 9000,
    ground: '#54575e',
    gravity: 16,
    sun: '#ffffff',
    ambient: 0.5,
  },
}

export const LANDABLE = Object.keys(SURFACES)
export const SURFACE_CEILING = 1150 // climb this high above ground -> orbit
export const SURFACE_SPAWN_ALT = 320

// deterministic-ish prop scatter, generated once per session
function rand(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function surfaceProps(key) {
  const r = rand({ earth: 1234, mars: 5678, luna: 9012 }[key])
  const props = []
  if (key === 'earth') {
    // island city blocks around center, ocean beyond
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2
      const d = 140 + r() * 1300
      props.push({
        kind: 'building',
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        w: 30 + r() * 50,
        d2: 30 + r() * 50,
        h: 50 + r() * 240,
        c: ['#e8b4c8', '#9fd8d0', '#f0e0a8', '#b8c8e8', '#d8a890'][Math.floor(r() * 5)],
      })
    }
  }
  if (key === 'mars') {
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2
      const d = 120 + r() * 2600
      props.push({ kind: 'rock', x: Math.cos(a) * d, z: Math.sin(a) * d, s: 14 + r() * 90 })
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5
      props.push({ kind: 'rig', x: Math.cos(a) * 700, z: Math.sin(a) * 700 })
    }
  }
  if (key === 'luna') {
    for (let i = 0; i < 60; i++) {
      const a = r() * Math.PI * 2
      const d = 150 + r() * 3000
      props.push({ kind: 'crater', x: Math.cos(a) * d, z: Math.sin(a) * d, s: 30 + r() * 120 })
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 1
      props.push({ kind: 'dome', x: Math.cos(a) * 420, z: Math.sin(a) * 420 })
    }
  }
  return props
}
