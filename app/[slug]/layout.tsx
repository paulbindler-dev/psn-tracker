import { SlugProvider } from '@/lib/slug-context'
import { TabBar } from '@/components/TabBar'

export default function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  return (
    <SlugProvider value={params.slug}>
      <div
        style={{
          paddingBottom: 'calc(49px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </div>
      <TabBar slug={params.slug} />
    </SlugProvider>
  )
}
