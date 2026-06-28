import { GameList } from '@/components/GameList'

export default function SlugHomePage() {
  return (
    <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <GameList />
    </main>
  )
}
