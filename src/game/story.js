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
  {
    id: 6,
    title: 'WELCOME TO NEO VEGA',
    lines: [
      ['DJ QUASAR', '🎧', "Heat's off. Time you saw the only city the Marshals never tamed — Neo Vega. Neon, noodles, no questions."],
      ['DJ QUASAR', '🎧', 'Dock at the landing pad. Tip: hold X for overdrive when the lanes are clear. The void is big.'],
    ],
    objective: { type: 'goto', anchorStatic: [4300, 70, -2840], text: 'Dock at the Neo Vega landing pad' },
    pay: 800,
  },
  {
    id: 7,
    title: 'ROCK HUSTLE',
    lines: [
      ['MAMA NOODLE', '🍜', "New face. Vega runs on ore, kid. Gold-glow rocks in the belt — crack them, catch what spills."],
      ['DJ QUASAR', '🎧', "She's good for it. Bring back 5 ore chunks. Watch the belt though — Red Varga's crew shoots first."],
    ],
    objective: { type: 'collectOre', count: 5, anchorStatic: [-1700, 0, -1750], text: 'Mine 5 ore chunks from glowing belt rocks' },
    pay: 1200,
  },
  {
    id: 8,
    title: 'KING OF THE BELT',
    lines: [
      ['DJ QUASAR', '🎧', "Red Varga heard you were poaching his rocks. He's put a price on your hull."],
      ['RED VARGA', '☠️', 'This belt feeds MY crew, drifter. Come collect your funeral.'],
      ['DJ QUASAR', '🎧', "His hideout's a hollowed rock in the belt. Big ship, big ego, big explosion. End him."],
    ],
    objective: { type: 'destroyBoss', anchorStatic: [-1790, 0, -1680], text: 'Destroy RED VARGA at the pirate hideout' },
    pay: 4000,
  },
]

export const EPILOGUE = [
  ['DJ QUASAR', '🎧', "Okoye's filing paperwork, Varga's stardust, and Neo Vega's buying you drinks. The system knows your name."],
  ['DJ QUASAR', '🎧', 'The drift is yours, pilot. Freelance jobs on the gold marker, ore in the belt, races at Saturn. Go be a legend.'],
]
