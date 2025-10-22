import type { Metadata } from 'next'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import { generatePageJSONLD, generateBreadcrumbsJSONLD } from '@/utilities/generateJSONLD'
import { getPageBySlug } from '@/lib/api'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import React, { cache } from 'react'

// Static generation with on-demand revalidation via webhook
// Pages are fully static (not ISR) and cached in R2
// Updates from CMS trigger webhook invalidation to Workers API
export const dynamicParams = true // Allow runtime generation for new slugs

export async function generateStaticParams() {
  try {
    // Fetch all page slugs from API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.poshta.cloud'}/api/pages?limit=1000`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    const pages = data.docs || []

    return pages
      .filter((page: any) => page.slug && page.slug !== 'home')
      .map((page: any) => ({
        slug: page.slug,
      }))
  } catch (error) {
    console.warn('[generateStaticParams] Failed to fetch pages:', error)
    return []
  }
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const url = '/' + slug
  const page = await queryPageBySlug({ slug, draft: false })

  if (!page) return <PayloadRedirects url={url} />

  const pageJSONLD = generatePageJSONLD(page)
  const breadcrumbsJSONLD = generateBreadcrumbsJSONLD(page)

  return (
    <>
      {pageJSONLD && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJSONLD) }}
        />
      )}
      {breadcrumbsJSONLD && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJSONLD) }}
        />
      )}
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
    </>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise

  try {
    const page = await queryPageBySlug({ slug, draft: false })
    return generateMeta({ doc: page })
  } catch (error) {
    console.error(`[generateMetadata] Failed to fetch metadata for page "${slug}":`, error)
    return {
      title: slug || 'Page',
      description: `Page: ${slug}`,
    }
  }
}

const queryPageBySlug = cache(async ({ slug, draft }: { slug: string; draft: boolean }) => {
  const page = await getPageBySlug(slug, draft)
  return page
})
