import { Metadata } from 'next'
import { getPageBySlug } from '@/lib/api'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { generateMeta } from '@/utilities/generateMeta'

// ISR configuration
export const revalidate = 300 // 5 minutes - will be invalidated by webhook
export const dynamicParams = true

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('home', false, {
    next: { revalidate: 300 },
  })

  if (!page) {
    return {
      title: 'Poshta - Content Management',
      description: 'Welcome to Poshta - Your content management platform',
    }
  }

  return generateMeta({ doc: page })
}

export default async function HomePage() {
  const page = await getPageBySlug('home', false, {
    next: { revalidate: 300 },
  })

  if (!page) {
    return (
      <article className="pt-16 pb-24">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Welcome to Poshta</h1>
          <p>Home page is loading. Please check back soon.</p>
        </div>
      </article>
    )
  }

  return (
    <article className="pt-16 pb-24">
      {page.title && (
        <header className="mb-8">
          <h1 className="text-4xl font-bold">{page.title}</h1>
          {page.description && (
            <p className="mt-4 text-lg text-muted-foreground">{page.description}</p>
          )}
        </header>
      )}

      {page.layout && <RenderBlocks blocks={page.layout} />}
    </article>
  )
}
