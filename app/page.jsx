'use client'

import dynamic from 'next/dynamic'

const Game = dynamic(() => import('../src/Game'), { ssr: false })

export default function Page() {
  return <Game />
}
