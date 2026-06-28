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
        <details className="mt-8 px-4 text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600 select-none">
            ⚙️ Outils d'ajout rapide
          </summary>
          <div className="mt-3 space-y-2 pl-2 pb-8">
            <p>
              <strong>Bookmarklet desktop :</strong> copie le contenu de{' '}
              <code className="text-gray-500">bookmarklet/bookmarklet.min.txt</code>
              {' '}dans un favori de ton navigateur, puis ouvre-le sur une fiche PSN.
            </p>
            <p>
              <strong>Raccourci iOS :</strong> voir{' '}
              <code className="text-gray-500">docs/ios-shortcut.md</code>
              {' '}dans le projet pour la configuration.
            </p>
            <p className="text-gray-300">
              (Remplace <code>your-psn-tracker.vercel.app</code> par ton URL Vercel dans les deux cas.)
            </p>
          </div>
        </details>
      </div>
    </main>
  )
}
