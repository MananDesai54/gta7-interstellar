// Single-player build — networking removed. Stubs keep the systems simple;
// multiplayer history lives in git (commit 837b7b1) if it ever comes back.
const EPOCH = Date.now()

export function sendFire() {}
export function sendRace() {}

export function simNow() {
  return (Date.now() - EPOCH) / 1000
}
