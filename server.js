const { createServer } = require('http')
const next = require('next')
const { Server } = require('socket.io')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Shared orbital epoch — every client computes planet positions from the same
// clock so the solar system looks identical across the lobby.
const EPOCH = Date.now()

// No-DB leaderboard: in-memory, flushed to a JSON file. Survives restarts on
// any host with a disk (Railway/Fly/VPS).
const BOARD_FILE = path.join(__dirname, 'data', 'leaderboard.json')
let board = {}
try {
  board = JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8'))
} catch {}
let flushTimer
function flushBoard() {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(BOARD_FILE), { recursive: true })
      fs.writeFileSync(BOARD_FILE, JSON.stringify(board, null, 2))
    } catch (e) {
      console.error('leaderboard flush failed:', e.message)
    }
  }, 1000)
}
function topBoard() {
  return Object.values(board)
    .sort((a, b) => (b.cash || 0) - (a.cash || 0))
    .slice(0, 10)
}

app.prepare().then(() => {
  const srv = createServer((req, res) => handle(req, res))
  const io = new Server(srv, { cors: { origin: '*' } })
  const players = new Map()

  io.on('connection', (sock) => {
    sock.emit('init', { id: sock.id, epoch: EPOCH, players: [...players.values()] })
    sock.emit('leaderboard', topBoard())

    sock.on('join', ({ name }) => {
      const p = { id: sock.id, name: String(name || 'DRIFTER').slice(0, 16).toUpperCase() }
      players.set(sock.id, p)
      sock.broadcast.emit('player-joined', p)
      console.log(`+ ${p.name} (${players.size} online)`)
    })

    sock.on('state', (s) => {
      if (players.has(sock.id)) sock.volatile.broadcast.emit('state', { id: sock.id, s })
    })

    sock.on('fire', (f) => sock.broadcast.emit('fire', f))

    sock.on('pvp-hit', ({ target }) => {
      const from = players.get(sock.id)
      if (from && players.has(target)) io.to(target).emit('damaged', { from: from.name, fromId: sock.id, dmg: 10 })
    })

    sock.on('pvp-death', ({ to, amount }) => {
      const victim = players.get(sock.id)
      if (victim && players.has(to) && Number.isFinite(amount) && amount >= 0) {
        io.to(to).emit('bounty', { amount: Math.floor(amount), victim: victim.name })
      }
    })

    sock.on('score', ({ cash }) => {
      const p = players.get(sock.id)
      if (!p || !Number.isFinite(cash)) return
      const e = (board[p.name] = board[p.name] || { name: p.name, cash: 0, bestMs: null })
      e.cash = Math.max(e.cash, Math.floor(cash))
      flushBoard()
      io.emit('leaderboard', topBoard())
    })

    sock.on('race', ({ ms }) => {
      const p = players.get(sock.id)
      if (!p || !Number.isFinite(ms) || ms <= 0) return
      const e = (board[p.name] = board[p.name] || { name: p.name, cash: 0, bestMs: null })
      e.bestMs = e.bestMs == null ? Math.floor(ms) : Math.min(e.bestMs, Math.floor(ms))
      flushBoard()
      io.emit('leaderboard', topBoard())
    })

    sock.on('disconnect', () => {
      const p = players.get(sock.id)
      players.delete(sock.id)
      if (p) {
        io.emit('player-left', { id: sock.id })
        console.log(`- ${p.name} (${players.size} online)`)
      }
    })
  })

  const port = process.env.PORT || 3000
  srv.listen(port, () => {
    console.log(`> GTA VII: INTERSTELLAR ONLINE — http://localhost:${port}`)
    console.log(`> Share it:  ngrok http ${port}`)
  })
})
