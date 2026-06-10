// Exploration: find these, get paid, fill the logbook (J).
// pos: static [x,y,z] | body: tracks an orbiting body
export const DISCOVERIES = [
  { id: 'vega', name: 'NEO VEGA CITY', bonus: 500, pos: [4300, 40, -3200], range: 900, hint: 'A neon glow between Earth and the black hole.' },
  { id: 'luna', name: 'LUNA', bonus: 300, body: 'luna', range: 300, hint: "Earth keeps a small grey companion." },
  { id: 'hideout', name: 'PIRATE HIDEOUT', bonus: 600, pos: [-1790, 0, -1680], range: 500, hint: 'One belt rock is hollow — and lit from inside.' },
  { id: 'derelict', name: 'DERELICT SCIENCE VESSEL', bonus: 600, pos: [-1400, 430, -4850], range: 350, hint: "Something dead drifts in Gargantua's well." },
  { id: 'monolith', name: 'THE MONOLITH', bonus: 1000, pos: [-600, 150, -4300], range: 300, hint: 'A black rectangle hums where no rectangle should be.' },
  { id: 'comet', name: 'COMET ICARUS-9', bonus: 800, body: 'comet', range: 320, hint: 'A burning snowball loops the whole system. Catch it.' },
  { id: 'helios-graze', name: 'CORONA GRAZE', bonus: 700, body: 'helios', range: 1000, hint: 'Fly close enough to the sun to smell it. Not too close.' },
]
