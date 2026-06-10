import { useFrame, useThree } from '@react-three/fiber'
import { world } from '../game/world'
import { bodyPos, BODY_NAMES } from '../game/physics'
import { simNow } from '../game/net'

// Runs first each frame: advances the clock, positions every celestial body,
// and drags the mission marker along with its anchor body.
export function PhysicsSystem() {
  const { camera } = useThree()
  useFrame(() => {
    world.camera = camera
    const t = simNow()
    world.simTime = t
    for (const name of BODY_NAMES) bodyPos(name, t, world.bodyPos[name])
    if (world.missionAnchor) {
      world.missionPos.copy(world.bodyPos[world.missionAnchor.body]).add(world.missionAnchor.offset)
    }
  }, -10)
  return null
}
