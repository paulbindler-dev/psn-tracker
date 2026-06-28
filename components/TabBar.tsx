'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function ListIcon({ active }: { active: boolean }) {
  const color = active ? '#0070d1' : '#8e8e93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* PlayStation gamepad */}
      <path
        d="M6.5 12C6.5 9.52 8.52 7.5 11 7.5h2c2.48 0 4.5 2.02 4.5 4.5v1.5c0 2.48-2.02 4.5-4.5 4.5h-2C8.52 18 6.5 15.98 6.5 13.5V12z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      {/* D-pad cross */}
      <line x1="9.5" y1="12.75" x2="11" y2="12.75" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="10.25" y1="12" x2="10.25" y2="13.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Buttons */}
      <circle cx="14.5" cy="11.5" r="0.6" fill={color}/>
      <circle cx="15.1" cy="12.5" r="0.6" fill={color}/>
      <circle cx="13.9" cy="12.5" r="0.6" fill={color}/>
      <circle cx="14.5" cy="13.5" r="0.6" fill={color}/>
      {/* Sticks */}
      <circle cx="9" cy="14.5" r="1" stroke={color} strokeWidth="1" fill="none"/>
      <circle cx="13" cy="14.5" r="1" stroke={color} strokeWidth="1" fill="none"/>
    </svg>
  )
}

function SearchIcon({ active }: { active: boolean }) {
  const color = active ? '#0070d1' : '#8e8e93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke={color} strokeWidth="1.7" fill="none"/>
      <line x1="15.8" y1="15.8" x2="20" y2="20" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  )
}

function DemosIcon({ active }: { active: boolean }) {
  const color = active ? '#0070d1' : '#8e8e93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Play button inside a screen */}
      <rect x="3" y="5" width="18" height="13" rx="2.5" stroke={color} strokeWidth="1.6" fill="none"/>
      <path d="M10 9.5l5 3-5 3V9.5z" fill={color}/>
      <line x1="8" y1="20" x2="16" y2="20" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="12" y1="18" x2="12" y2="20" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

export function TabBar({ slug }: { slug: string }) {
  const path = usePathname()

  const tabs = [
    {
      href: `/${slug}`,
      label: 'Ma liste',
      active: path === `/${slug}`,
      Icon: ListIcon,
    },
    {
      href: `/${slug}/search`,
      label: 'Rechercher',
      active: path.startsWith(`/${slug}/search`),
      Icon: SearchIcon,
    },
    {
      href: `/${slug}/demos`,
      label: 'Démos',
      active: path.startsWith(`/${slug}/demos`),
      Icon: DemosIcon,
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex max-w-lg mx-auto"
      style={{
        backgroundColor: 'var(--tabbar)',
        borderTop: '1px solid var(--sep)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Navigation principale"
    >
      {tabs.map(({ href, label, active, Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center justify-center flex-1 min-h-[49px] pt-2 pb-1 gap-0.5"
          style={{ color: active ? '#0070d1' : '#8e8e93' }}
          aria-current={active ? 'page' : undefined}
        >
          <Icon active={active} />
          <span
            className="text-[10px] font-medium leading-none"
            style={{ color: active ? '#0070d1' : '#8e8e93' }}
          >
            {label}
          </span>
        </Link>
      ))}
    </nav>
  )
}
