import { GameList } from '@/components/GameList'

export default function HomePage() {
  return (
    <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <GameList />
    </main>
  )
}
