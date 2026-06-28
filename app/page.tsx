import { GameList } from '@/components/GameList'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="max-w-lg mx-auto min-h-screen bg-[#f2f2f7]">
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#f2f2f7]/90 backdrop-blur-sm border-b border-gray-200 max-w-lg mx-auto">
        <div className="flex items-center justify-end px-4 pt-12 pb-3">
          <Link href="/search" className="text-[#007AFF] text-[17px]">
            + Ajouter
          </Link>
        </div>
      </div>
      <div className="pt-[72px]">
        <GameList />
      </div>
    </main>
  )
}
