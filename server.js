const { createServer } = require('http')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Shared orbital epoch — every client computes planet positions from the same
// clock so the solar system looks identical across the lobby.
const EPOCH = Date.now()

app.prepare().then(() => {
  const srv = createServer((req, res) => handle(req, res))
  const io = new Server(srv, { cors: { origin: '*' } })
  const players = new Map()

  io.on('connection', (sock) => {
    sock.emit('init', { id: sock.id, epoch: EPOCH, players: [...players.values()] })

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
      if (from && players.has(target)) io.to(target).emit('damaged', { from: from.name, dmg: 10 })
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
