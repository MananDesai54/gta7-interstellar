import { useGLTF, Clone } from '@react-three/drei'

// Kenney Space Kit (CC0) GLBs from /public/models — cloned per instance.
export function Model({ url, ...props }) {
  const { scene } = useGLTF(url)
  return <Clone object={scene} {...props} />
}

export const CRAFTS = [
  '/models/craft_speederA.glb',
  '/models/craft_speederB.glb',
  '/models/craft_speederC.glb',
  '/models/craft_speederD.glb',
  '/models/craft_racer.glb',
  '/models/craft_miner.glb',
  '/models/craft_cargoA.glb',
  '/models/craft_cargoB.glb',
]

CRAFTS.forEach((u) => useGLTF.preload(u))
useGLTF.preload('/models/hangar_roundGlass.glb')
useGLTF.preload('/models/satelliteDish_detailed.glb')
useGLTF.preload('/models/turret_double.glb')
useGLTF.preload('/models/rocket_baseA.glb')
useGLTF.preload('/models/monorail_trainCargo.glb')
useGLTF.preload('/models/astronautA.glb')
useGLTF.preload('/models/astronautB.glb')

export const CITY_BUILDINGS = [
  '/models/building-a.glb',
  '/models/building-b.glb',
  '/models/building-c.glb',
  '/models/building-d.glb',
  '/models/building-e.glb',
  '/models/building-f.glb',
  '/models/building-g.glb',
  '/models/building-h.glb',
  '/models/building-skyscraper-a.glb',
  '/models/building-skyscraper-b.glb',
  '/models/building-skyscraper-c.glb',
  '/models/building-skyscraper-d.glb',
  '/models/building-skyscraper-e.glb',
]
CITY_BUILDINGS.forEach((u) => useGLTF.preload(u))
