'use client'

import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { PhysicsSystem } from './components/PhysicsSystem'
import { Sun } from './components/Sun'
import { Planets } from './components/Planets'
import { BlackHole } from './components/BlackHole'
import { AsteroidBelt } from './components/AsteroidBelt'
import { Trajectory } from './components/Trajectory'
import { Station } from './components/Station'
import { RaceCourse } from './components/RaceCourse'
import { Convoy } from './components/Convoy'
import { PlayerShip } from './components/PlayerShip'
import { RemotePlayers } from './components/RemotePlayers'
import { Traffic } from './components/Traffic'
import { Police } from './components/Police'
import { Lasers } from './components/Lasers'
import { Explosions } from './components/Explosions'
import { MissionMarker } from './components/MissionMarker'
import { Hud } from './components/Hud'
import { TitleScreen } from './components/TitleScreen'
import { useStore } from './game/store'
import { world } from './game/world'

const KEYMAP = [
  { name: 'forward', keys: ['KeyW'] },
  { name: 'back', keys: ['KeyS'] },
  { name: 'left', keys: ['KeyA'] },
  { name: 'right', keys: ['KeyD'] },
  { name: 'pitchUp', keys: ['ArrowUp'] },
  { name: 'pitchDown', keys: ['ArrowDown'] },
  { name: 'rollL', keys: ['KeyQ'] },
  { name: 'rollR', keys: ['KeyE'] },
  { name: 'boost', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'fire', keys: ['Space'] },
]

export default function Game() {
  const dead = useStore((s) => s.dead)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') window.__game = { world, useStore }
  }, [])

  return (
    <KeyboardControls map={KEYMAP}>
      <div className={`stage ${dead ? 'is-dead' : ''}`}>
        <Canvas
          camera={{ fov: 70, near: 0.1, far: 80000, position: [-400, 300, -2800] }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#02030a']} />
          <ambientLight intensity={0.35} color="#46566e" />
          <Stars radius={16000} depth={30000} count={9000} factor={180} saturation={0} fade speed={0.4} />
          <PhysicsSystem />
          <Sun />
          <Suspense fallback={null}>
            <Planets />
          </Suspense>
          <BlackHole />
          <AsteroidBelt />
          <Trajectory />
          <Station />
          <RaceCourse />
          <Convoy />
          <PlayerShip />
          <RemotePlayers />
          <Traffic />
          <Police />
          <Lasers />
          <Explosions />
          <MissionMarker />
          <EffectComposer>
            <Bloom intensity={1.15} luminanceThreshold={0.22} mipmapBlur radius={0.72} />
            <Vignette eskil={false} offset={0.18} darkness={0.82} />
          </EffectComposer>
        </Canvas>
      </div>
      <div className="grain" />
      <Hud />
      <TitleScreen />
    </KeyboardControls>
  )
}
