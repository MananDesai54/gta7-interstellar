import * as THREE from 'three'
import { io } from 'socket.io-client'
import { world, fireLaser } from './world'
import { useStore } from './store'

export const net = {
  socket: null,
  id: null,
  epoch: Date.now(), // overwritten by the server's shared epoch on connect
  remotes: new Map(), // id -> {name, last: [px,py,pz,qx,qy,qz,qw] | null}
  connected: false,
}

function syncIds() {
  useStore.getState().setRemoteIds([...net.remotes.keys()])
}

export function connect(name) {
  if (net.socket) return
  const socket = io({ transports: ['websocket', 'polling'] })
  net.socket = socket

  socket.on('connect', () => {
    net.connected = true
    socket.emit('join', { name })
  })

  socket.on('init', ({ id, epoch, players }) => {
    net.id = id
    net.epoch = epoch
    players.forEach((p) => net.remotes.set(p.id, { name: p.name, last: null }))
    syncIds()
  })

  socket.on('player-joined', (p) => {
    net.remotes.set(p.id, { name: p.name, last: null })
    syncIds()
    useStore.getState().showBanner(`${p.name} ENTERED THE SYSTEM`, '#7ec8ff')
  })

  socket.on('state', ({ id, s }) => {
    const r = net.remotes.get(id)
    if (r) r.last = s
  })

  socket.on('fire', ({ pos, dir }) => {
    fireLaser(new THREE.Vector3(...pos), new THREE.Vector3(...dir), 'remote')
  })

  socket.on('damaged', ({ from, fromId, dmg }) => {
    useStore.setState({ lastAttackerId: fromId })
    useStore.getState().damage(dmg, `Dusted by ${from}.`)
  })

  socket.on('bounty', ({ amount, victim }) => {
    useStore.getState().addCash(amount)
    useStore.getState().showBanner(`BOUNTY — $${amount} OFF ${victim}`, '#6dd96d')
  })

  socket.on('leaderboard', (board) => {
    useStore.getState().setLeaderboard(board)
  })

  socket.on('player-left', ({ id }) => {
    net.remotes.delete(id)
    world.remoteRefs.delete(id)
    syncIds()
  })

  socket.on('disconnect', () => {
    net.connected = false
  })

  // PvP death payout — injected into the store to avoid an import cycle
  useStore.setState({
    reportPvpDeath: (target, amount) => {
      if (net.connected) socket.emit('pvp-death', { to: target, amount })
    },
  })

  // report score to the shared leaderboard whenever cash settles
  let scoreTimer
  let lastSent = -1
  useStore.subscribe((s) => {
    if (!net.connected || s.cash === lastSent) return
    clearTimeout(scoreTimer)
    scoreTimer = setTimeout(() => {
      lastSent = s.cash
      socket.emit('score', { cash: s.cash })
    }, 1500)
  })
}

let acc = 0
export function sendState(dt, pos, quat) {
  if (!net.connected) return
  acc += dt
  if (acc < 1 / 12) return
  acc = 0
  net.socket.volatile.emit('state', [pos.x, pos.y, pos.z, quat.x, quat.y, quat.z, quat.w])
}

export function sendFire(pos, dir) {
  if (net.connected) net.socket.emit('fire', { pos: [pos.x, pos.y, pos.z], dir: [dir.x, dir.y, dir.z] })
}

export function sendPvpHit(target) {
  if (net.connected) net.socket.emit('pvp-hit', { target })
}

export function sendRace(ms) {
  if (net.connected) net.socket.emit('race', { ms })
}

export function simNow() {
  return (Date.now() - net.epoch) / 1000
}
