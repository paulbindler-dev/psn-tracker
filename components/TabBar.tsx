'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GameController, MagnifyingGlass, PlayCircle } from '@phosphor-icons/react'

export function TabBar({ slug }: { slug: string }) {
  const path = usePathname()

  const tabs = [
    { href: `/${slug}`, label: 'Ma liste', Icon: GameController, exact: true },
    { href: `/${slug}/search`, label: 'Rechercher', Icon: MagnifyingGlass, exact: false },
    { href: `/${slug}/demos`, label: 'Démos', Icon: PlayCircle, exact: false },
  ]

  const isActive = (href: string, exact: boolean) =>
    exact ? path === href : path.startsWith(href)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
      style={{
        backgroundColor: 'var(--tabbar)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '0.5px solid var(--sep)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Navigation principale"
    >
      <div className="flex">
        {tabs.map(({ href, label, Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1 min-h-[49px] pt-2 pb-1 gap-0.5"
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                size={24}
                weight={active ? 'fill' : 'regular'}
                color={active ? '#0070d1' : '#8e8e93'}
              />
              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: active ? '#0070d1' : '#8e8e93' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
