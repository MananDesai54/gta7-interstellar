# GTA VII: INTERSTELLAR

Open-world space crime in the Sagittarius System. Next.js + React Three Fiber. Single-player, deploys anywhere Next.js runs — including Vercel.

![city](shots/city.png)
![title](shots/title.png)

## Run

```sh
npm install
npm run dev        # http://localhost:3000
```

Deploy: standard Next.js app — `vercel`, or `npm run build && npm start`.

## Story mode — THE DRIFT

Eight chapters with dialogue and GTA-style chapter title cards (ENTER to advance):

1. **FRESH OFF THE FREIGHTER** — prove you can fly, tag a cache in Earth orbit
2. **RING RUNNER** — thread three drop buoys around a moving Saturn
3. **BADGE OF DISHONOR** — Marshal Okoye wants a tax; pay in scrap metal
4. **THE DERELICT** — pull a data core out of Gargantua's gravity well, then escape it
5. **SLINGSHOT** — five patrols, full heat, then vanish
6. **WELCOME TO NEO VEGA** — find the neon city and dock
7. **ROCK HUSTLE** — mine 5 ore chunks from the belt's glowing rocks
8. **KING OF THE BELT** — kill RED VARGA at the pirate hideout

Finish the story to unlock endless free-roam work. Dying restarts the active objective ($200 dry-dock fee). You're safe during cutscenes.

## Places

- **Neo Vega City** — neon free-station: ~35 collidable lit towers, holo billboards, canyon shuttle traffic, landing-pad garage with twin turrets
- **Planet surfaces** — press **L** near Earth, Mars or Luna to land:
  - *Bahía Libre* (Earth): hazy coastal island city
  - *Red Gulch* (Mars): rust canyon, mining rigs, rocket launch site
  - *Tranquility Flats* (Luna): craters, glass hangars, 16 u/s² gravity hops
  - Each has its own gravity, sky, fog, courier jobs and **claim-jumper turrets** ($250 a kill, they shoot first). Climb or press L to return to orbit
- **Asteroid belt** — collisions hurt; heat decays 3× faster inside; 16 gold-glowing ore rocks; pirate territory
- **Saturn's rings** — physically there: 140 debris chunks, flying the plane sandblasts 5 hull/s
- **Meridian Station** — garage in Earth orbit

## Physics (the real kind)

- Keplerian orbits, consistent with the gravity field (T = 2π√(a³/GM)) — park in orbit and you stay there; AFK ships orbit instead of dying
- Inverse-square gravity from sun, planets, moon, black hole. Slingshots work. The trajectory line (KSP-style) shows your future
- Drag only applies while steering — coasting conserves momentum
- **Helios** and **Gargantua's event horizon** kill; planets, buildings and rocks bounce with damage
- **Solar flares** every ~3 min: 10s warning, then a radiation storm across the inner system

## Hustles

- **Side jobs** + **timed ferry fares** (countdown timer, miss = no pay)
- **Mining**: crack gold rocks, scoop ore, sell at any dock ($90/ea)
- **Pirates** at the belt hideout ($150 + chips, no heat) and boss **RED VARGA**
- **Smuggler convoys** every ~2 min ($1,000 for a full wipe)
- **Saturn Circuit** time trial — best lap saved
- **Surface courier runs** ($400 a hop) and turret bounties
- **Wanted system**: stars → patrols → INTERCEPTORS at 4+ stars. Loiter near a cop: **BUSTED** ($300 fine). Kill heat in the belt
- **Exploration**: 7 paid discoveries in the Galaxy Log (**J**) — comet, monolith, derelict, more
- **Garage** (G at any dock): armor, boost tanks, engine tunes, dual cannons, paint

## Controls

| Input | Action |
| --- | --- |
| Click | pointer-lock mouse flight |
| W / S | thrust / brake |
| A / D, ↑ / ↓, Q / E | yaw, pitch, roll |
| Shift | boost |
| X | overdrive (long-haul ~6× thrust) |
| Space | lasers |
| L | land / lift off |
| G | dock garage |
| J | galaxy log |
| M | minimap zoom |
| H | photo mode |
| R | radio (6 stations, procedural two-voice tunes) |
| ESC / P | pause (stats live here) |
| 🎮 Gamepad | stick=yaw/pitch, bumpers=roll, RT=thrust, LT=brake, A=fire, B=boost, Y=overdrive, X=land, Start=pause |

## Persistence (no database)

Save lives in `localStorage`: cash, story progress, upgrades, paint, ore, best lap, discoveries, lifetime stats (kills/deaths/busts/earnings).

## Architecture

- `src/game/physics.js` — Kepler body table + summed gravity
- `src/game/world.js` — mutable 60fps state (no React renders)
- `src/game/store.js` — zustand: HUD, story, garage, races, stats
- `src/game/story.js`, `surfaces.js`, `discoveries.js` — content tables
- `src/components/` — R3F scene; Kenney Space Kit CC0 models in `/public/models`

In dev, `window.__game = { world, useStore }` for debugging.

> Multiplayer (Socket.IO lobby, PvP bounties, shared leaderboard) was removed for Vercel compatibility — it lives at commit `837b7b1`.
