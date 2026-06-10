// Story mode: THE DRIFT — five chapters of working your way up from
// fresh-off-the-freighter nobody to the pilot Marshal Okoye couldn't catch.
export const STORY = [
  {
    id: 1,
    title: 'FRESH OFF THE FREIGHTER',
    lines: [
      ['DJ QUASAR', '🎧', "You the drifter who jumped ship at Meridian Station? Cute ride. Prove it flies."],
      ['YOU', '🚀', 'Point me somewhere.'],
      ['DJ QUASAR', '🎧', "Supply cache in Earth orbit. Tag it before the vultures do. Mind the gravity — everything out here pulls."],
    ],
    objective: { type: 'goto', anchor: { body: 'earth', offset: [620, 90, 220] }, text: 'Reach the supply cache in Earth orbit' },
    pay: 300,
  },
  {
    id: 2,
    title: 'RING RUNNER',
    lines: [
      ['DJ QUASAR', '🎧', "Spice run. Three drop buoys threaded around Saturn. Planet's moving, so lead your target."],
      ['DJ QUASAR', '🎧', "Clip the rings doing 300 and you're a pretty crater. Don't."],
    ],
    objective: {
      type: 'checkpoints',
      anchors: [
        { body: 'saturn', offset: [950, 130, 0] },
        { body: 'saturn', offset: [0, -70, 1000] },
        { body: 'saturn', offset: [-960, 50, -320] },
      ],
      text: 'Hit all 3 drop buoys around Saturn',
    },
    pay: 600,
  },
  {
    id: 3,
    title: 'BADGE OF DISHONOR',
    lines: [
      ['MARSHAL OKOYE', '🚨', "Sector tax, drifter. Pay up or fly away — oh wait. You can't outfly a Marshal."],
      ['YOU', '🚀', 'How about I pay in scrap metal.'],
      ['DJ QUASAR', '🎧', "That's the spirit. Dust three of Okoye's patrol ships. Lasers are on the spacebar, hero."],
    ],
    objective: { type: 'destroyCops', count: 3, wanted: 2, text: 'Destroy 3 of Okoye\'s patrol ships' },
    pay: 900,
  },
  {
    id: 4,
    title: 'THE DERELICT',
    lines: [
      ['DJ QUASAR', '🎧', "Old science vessel went dark inside Gargantua's gravity well. Its data core is worth more than your hull."],
      ['DJ QUASAR', '🎧', "Get in, grab it, burn out before the well eats you. Full boost on the way up or you're spaghetti."],
    ],
    objective: {
      type: 'corewell',
      anchor: { body: 'gargantua', offset: [0, 80, 950] },
      escapeDist: 2900,
      text: 'Pull the data core from the derelict',
      escapeText: 'ESCAPE THE GRAVITY WELL — FULL BOOST',
    },
    pay: 1500,
  },
  {
    id: 5,
    title: 'SLINGSHOT',
    lines: [
      ['MARSHAL OKOYE', '🚨', 'That core is Marshal property. Full alert, drifter. Nowhere left to run.'],
      ['DJ QUASAR', '🎧', "Wrong. Everywhere to run. Dust five of them, then vanish into the black. Make him regret the badge."],
    ],
    objective: { type: 'destroyCops', count: 5, wanted: 4, needCool: true, text: 'Destroy 5 patrol ships, then lose the heat' },
    pay: 2500,
  },
]

export const EPILOGUE = [
  ['DJ QUASAR', '🎧', "Okoye's filing paperwork from a rescue pod. The Sagittarius System knows your name now."],
  ['DJ QUASAR', '🎧', 'The drift is yours, pilot. Freelance jobs on the gold marker whenever you want them.'],
]
