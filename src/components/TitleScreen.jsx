import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../game/store'
import { initAudio, beep } from '../game/audio'
import { loadSave, wipeSave } from '../game/save'

export function TitleScreen() {
  const started = useStore((s) => s.started)
  const save = useMemo(() => (typeof window !== 'undefined' ? loadSave() : null), [])
  const [name, setName] = useState(save?.name || '')

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
    useStore.getState().start(pilot)
  }

  if (started) return null

  return (
    <div className="title-screen">
      <div className="title-vignette" />
      <div className="title-inner">
        <div className="t-kicker">ROCKSTAR GALACTIC PRESENTS</div>
        <h1 className="t-gta">GTA&nbsp;VII</h1>
        <h2 className="t-sub">INTERSTELLAR</h2>
        <p className="t-tag">The Sagittarius System. Real gravity. Real cops. Nowhere soft to land.</p>
        <input
          className="t-name"
          placeholder="PILOT NAME"
          maxLength={16}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {save && (
          <div className="t-save">
            SAVE FOUND — {save.name} · ${(save.cash || 0).toLocaleString()} · CH{Math.min((save.chapter || 0) + 1, 9)}
            <button
              className="t-wipe"
              onClick={() => {
                wipeSave()
                location.reload()
              }}
            >
              NEW GAME
            </button>
          </div>
        )}
        <div className="t-controls">
          <div><b>CLICK</b><span>mouse flight</span></div>
          <div><b>W / S</b><span>thrust / brake</span></div>
          <div><b>SHIFT</b><span>boost</span></div>
          <div><b>X</b><span>overdrive</span></div>
          <div><b>SPACE</b><span>lasers</span></div>
          <div><b>G</b><span>dock</span></div>
          <div><b>J</b><span>galaxy log</span></div>
          <div><b>R</b><span>radio</span></div>
        </div>
        <div className="t-press" onClick={launch}>— PRESS ENTER TO FLY —</div>
      </div>
    </div>
  )
}
