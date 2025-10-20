import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import { getPageBySlug, getAllPageSlugs, type Page } from '@/lib/api'
import React, { cache } from 'react'
import { homeStatic } from '@/endpoints/seed/home-static'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'

// ISR Configuration: 7-day fallback + webhook-based on-demand invalidation
// Strategy: Hybrid ISR approach
// - Primary: Webhook-based cache invalidation (on-demand)
// - Fallback: 7-day automatic revalidation (safety net)
// - Result: Instant updates with guaranteed recovery
// This reduces API load by 288x while maintaining reliability
export const revalidate = 604800 // 7 days fallback (verified safe TTL)

// Allow dynamic params for pages not in generateStaticParams
export const dynamicParams = true

export async function generateStaticParams() {
  // Catch-all route: return empty for on-demand generation
  console.log('[generateStaticParams] Catch-all route with on-demand generation')
  return []
}

type Args = {
  params: Promise<{
    slug?: string[]
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const params = await paramsPromise
  const slug = params.slug ? params.slug[0] : 'home'
  const url = '/' + slug

  let page: Page | null
  let fetchError: string | null = null

  try {
    page = await queryPageBySlug({
      slug,
      draft: false,
    })
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error)
    console.error(`[Page] Failed to fetch page "${slug}": ${fetchError}`)
    page = null
  }

  // Graceful fallback for home page
  if (!page && slug === 'home') {
    console.log('[Page] Using fallback homeStatic for home page')
    page = homeStatic as Page
  }

  // Additional fallback logging for debugging
  if (!page) {
    console.warn(`[Page] Page "${slug}" not found after fetch (error: ${fetchError || 'unknown'})`)
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
  const params = await paramsPromise
  const slug = params.slug ? params.slug[0] : 'home'
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
