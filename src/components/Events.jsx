import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'
import { useStore } from '../game/store'
import { beep } from '../game/audio'

const FLARE_RANGE = 2800
const WARN_S = 10
const STORM_S = 10

// Solar flares: every few minutes Helios erupts. 10s warning, then 10s of
// hull-cooking radiation across the inner system. Hide behind distance,
// an atmosphere, or your own bravado.
export function Events() {
  useFrame((state, dt) => {
    const s = useStore.getState()
    if (!s.started || s.paused) return
    const t = state.clock.elapsedTime
    if (!world.flareState) {
      world.flareState = { phase: 'idle', until: t + 90, dmg: 0 }
      world.flare = 0
      world.flareWarn = false
    }
    const st = world.flareState

    if (st.phase === 'idle' && t > st.until) {
      st.phase = 'warn'
      st.until = t + WARN_S
      world.flareWarn = true
      s.showBanner('⚠ SOLAR FLARE INBOUND — CLEAR THE INNER SYSTEM', '#ff7a22')
      beep(220, 0.5, 'sawtooth')
    } else if (st.phase === 'warn' && t > st.until) {
      st.phase = 'storm'
      st.until = t + STORM_S
      world.flareWarn = false
      world.flare = 1
      s.showBanner('SOLAR FLARE PEAK', '#ff5522')
      beep(160, 0.8, 'sawtooth')
    } else if (st.phase === 'storm') {
      if (t > st.until) {
        st.phase = 'idle'
        st.until = t + 150 + Math.random() * 90
        world.flare = 0
        st.dmg = 0
      } else if (!world.surface && !s.dead) {
        const d = world.playerPos.distanceTo(world.bodyPos.helios)
        if (d < FLARE_RANGE) {
          // closer = hotter
          st.dmg += (4 + 8 * (1 - d / FLARE_RANGE)) * dt
          if (st.dmg >= 1) {
            const n = Math.floor(st.dmg)
            st.dmg -= n
            s.damage(n, 'Cooked by a solar flare.')
          }
        }
      }
    }
  })
  return null
}
