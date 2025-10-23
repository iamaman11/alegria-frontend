import type { Metadata } from 'next'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import { getPageBySlug } from '@/lib/api'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import React, { cache } from 'react'

// Static generation with on-demand revalidation via webhook
// Homepage is fully static (not ISR) and cached in R2
// Updates from CMS trigger webhook invalidation to Workers API
export const dynamicParams = true

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await queryPageBySlug({ slug: 'home', draft: false })
    return generateMeta({ doc: page })
  } catch (error) {
    console.error('[generateMetadata] Home page error:', error)
    return {
      title: 'Home - Poshta',
      description: 'Welcome to Poshta',
    }
  }
}

export default async function HomePage() {
  const page = await queryPageBySlug({ slug: 'home', draft: false })

  if (!page) return <PayloadRedirects url="/" />

  return (
    <article>
      {page.hero && <RenderHero {...page.hero} />}

      <div className="pt-16 pb-24">
        {page.title && (
          <header className="mb-8 container">
            <h1 className="text-4xl font-bold">{page.title}</h1>
            {(page as any).description && (
              <p className="mt-4 text-lg text-muted-foreground">{(page as any).description}</p>
            )}
          </header>
        )}

        {(page as any).layout && (page as any).layout.length > 0 ? (
          <RenderBlocks blocks={(page as any).layout} />
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No layout blocks available</p>
          </div>
        )}
      </div>
    </article>
  )
}

const queryPageBySlug = cache(async ({ slug, draft }: { slug: string; draft: boolean }) => {
  const page = await getPageBySlug(slug, draft)
  return page
})
