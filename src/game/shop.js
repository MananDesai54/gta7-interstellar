// Garage catalogue — dock at the Earth station (G) to spend your cash.
export const SHOP = [
  { id: 'armor1', name: 'ARMOR PLATING I', desc: '+50 max hull', cost: 800, requires: null },
  { id: 'armor2', name: 'ARMOR PLATING II', desc: '+100 max hull', cost: 2000, requires: 'armor1' },
  { id: 'boost1', name: 'BOOST TANK I', desc: '+50 boost capacity', cost: 700, requires: null },
  { id: 'boost2', name: 'BOOST TANK II', desc: '+100 boost capacity', cost: 1800, requires: 'boost1' },
  { id: 'engine1', name: 'ENGINE TUNE I', desc: '+20% thrust', cost: 1000, requires: null },
  { id: 'engine2', name: 'ENGINE TUNE II', desc: '+40% thrust', cost: 2500, requires: 'engine1' },
  { id: 'dual', name: 'DUAL CANNONS', desc: 'twin laser streams', cost: 1500, requires: null },
]

export const PAINTS = [
  { id: 'orange', color: '#ff7a00', cost: 0 },
  { id: 'crimson', color: '#e8233a', cost: 250 },
  { id: 'viper', color: '#3ddc66', cost: 250 },
  { id: 'ice', color: '#41d6ff', cost: 250 },
  { id: 'royal', color: '#8a5cff', cost: 250 },
  { id: 'gold', color: '#f5c843', cost: 500 },
]

export function maxHpFor(upgrades) {
  return 100 + (upgrades.armor1 ? 50 : 0) + (upgrades.armor2 ? 100 : 0)
}
export function maxBoostFor(upgrades) {
  return 100 + (upgrades.boost1 ? 50 : 0) + (upgrades.boost2 ? 100 : 0)
}
export function thrustMultFor(upgrades) {
  return 1 + (upgrades.engine1 ? 0.2 : 0) + (upgrades.engine2 ? 0.4 : 0)
}
