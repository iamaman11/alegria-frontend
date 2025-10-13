import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import { getPageBySlug, getAllPageSlugs, type Page } from '@/lib/api'
import React, { cache } from 'react'
import { homeStatic } from '@/endpoints/seed/home-static'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'

// ISR Configuration: Revalidate every 5 minutes for content pages
// This provides good balance between freshness and CDN efficiency
// Workers API cache provides additional layer with webhook invalidation
export const revalidate = 300 // 5 minutes for content pages

// Allow dynamic params for pages not in generateStaticParams
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const slugs = await getAllPageSlugs()

    return slugs
      .filter((slug) => slug !== 'home')
      .map((slug) => ({
        slug,
      }))
  } catch (error) {
    // If API is not available during build, return empty array
    // Pages will be generated on-demand with ISR
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
  const { slug = 'home' } = await paramsPromise
  const url = '/' + slug

  let page: Page | null

  page = await queryPageBySlug({
    slug,
    draft: false,
  })

  // Remove this code once your website is seeded
  if (!page && slug === 'home') {
    page = homeStatic as Page
  }

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page

  return (
    <article className="pt-16 pb-24">
      <PageClient />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      <RenderHero {...hero} />
      <RenderBlocks blocks={layout} />
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = 'home' } = await paramsPromise
  const page = await queryPageBySlug({
    slug,
    draft: false,
  })

  return generateMeta({ doc: page })
}

const queryPageBySlug = cache(async ({ slug, draft }: { slug: string; draft: boolean }) => {
  const page = await getPageBySlug(slug, draft)
  return page
})
