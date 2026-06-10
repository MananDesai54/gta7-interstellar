import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { world } from '../game/world'
import { useStore } from '../game/store'
import { beep } from '../game/audio'

const BASE_FAR = 4200
const STORM_FAR = 1000

// Mars weather: dust storms roll in every couple of minutes on Red Gulch —
// the fog wall closes to 1km, wind shoves you sideways, then it passes.
export function Weather() {
  const { scene } = useThree()
  const st = useRef({ phase: 'idle', until: 60, dir: 0 })
  const wind = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const s = useStore.getState()
    const t = state.clock.elapsedTime
    const m = st.current

    if (world.surface !== 'mars') {
      world.storm = 0
      world.stormWind = null
      m.phase = 'idle'
      m.until = t + 45 + Math.random() * 60
      return
    }

    if (m.phase === 'idle' && t > m.until) {
      m.phase = 'storm'
      m.until = t + 30
      m.dir = Math.random() * Math.PI * 2
      s.showBanner('🌪 DUST STORM ROLLING IN', '#ff9a55')
      beep(110, 0.6, 'sawtooth')
    } else if (m.phase === 'storm' && t > m.until) {
      m.phase = 'idle'
      m.until = t + 70 + Math.random() * 80
      s.showBanner('STORM PASSING', '#d8b89a')
    }

    const target = m.phase === 'storm' ? 1 : 0
    world.storm = THREE.MathUtils.lerp(world.storm || 0, target, 1 - Math.exp(-1.2 * dt))
    // swirling wind vector
    m.dir += dt * 0.15
    wind.set(Math.cos(m.dir), 0.08, Math.sin(m.dir))
    world.stormWind = wind

    // close the fog wall in
    if (scene.fog) scene.fog.far = THREE.MathUtils.lerp(BASE_FAR, STORM_FAR, world.storm)
  })
  return null
}
