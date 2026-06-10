import { useEffect, useState } from 'react'
import { useStore } from '../game/store'
import { initAudio, beep } from '../game/audio'
import { connect } from '../game/net'

export function TitleScreen() {
  const started = useStore((s) => s.started)
  const [name, setName] = useState('')

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Enter' || useStore.getState().started) return
      launch()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const launch = () => {
    const pilot = (name.trim() || 'DRIFTER').toUpperCase()
    initAudio()
    beep(660, 0.15, 'sine')
    connect(pilot)
    useStore.getState().start(pilot)
  }

  if (started) return null

  return (
    <div className="title-screen">
      <div className="title-vignette" />
      <div className="title-inner">
        <div className="t-kicker">ROCKSTAR GALACTIC PRESENTS</div>
        <h1 className="t-gta">GTA&nbsp;VII</h1>
        <h2 className="t-sub">INTERSTELLAR ONLINE</h2>
        <p className="t-tag">The Sagittarius System. Real gravity. Real cops. Real friends to betray.</p>
        <input
          className="t-name"
          placeholder="PILOT NAME"
          maxLength={16}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="t-controls">
          <div><b>W / S</b><span>thrust / brake</span></div>
          <div><b>A / D</b><span>yaw</span></div>
          <div><b>↑ / ↓</b><span>pitch</span></div>
          <div><b>Q / E</b><span>roll</span></div>
          <div><b>SHIFT</b><span>boost</span></div>
          <div><b>SPACE</b><span>lasers</span></div>
          <div><b>R</b><span>radio</span></div>
          <div><b>ENTER</b><span>talk / start</span></div>
        </div>
        <div className="t-press" onClick={launch}>— PRESS ENTER TO FLY —</div>
      </div>
    </div>
  )
}
