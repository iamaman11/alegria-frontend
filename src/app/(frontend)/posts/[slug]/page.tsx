import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { getPostBySlug, getAllPostSlugs, type Post } from '@/lib/api'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'
import { generatePostJSONLD } from '@/utilities/generateJSONLD'
import PageClient from './page.client'

// Static generation with on-demand revalidation via webhook
// Posts are fully static (not ISR) and cached in R2
// Updates from CMS trigger webhook invalidation to Workers API
export const dynamicParams = true // Allow runtime generation for new posts

export async function generateStaticParams() {
  try {
    const slugs = await getAllPostSlugs()

    return slugs.map((slug) => ({
      slug,
    }))
  } catch (error) {
    // If API is not available during build, return fallback slug
    // This ensures dynamic routes compile even if API is down
    // On Cloudflare Pages, we MUST return at least one param for route to compile
    console.warn('[generateStaticParams] Failed to fetch posts, using fallback:', error)
    return [{ slug: 'fallback' }]
  }
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const url = '/posts/' + slug
  const post = await queryPostBySlug({ slug, draft: false })

  if (!post) return <PayloadRedirects url={url} />

  const postJSONLD = generatePostJSONLD(post)


  return (
    <>
      {postJSONLD && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(postJSONLD) }}
        />
      )}
    <article className="pt-16 pb-16">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      <PostHero post={post} />

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container">
          <RichText className="max-w-[48rem] mx-auto" data={post.content} enableGutter={false} />
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <RelatedPosts
              className="mt-12 max-w-[52rem] lg:grid lg:grid-cols-subgrid col-start-1 col-span-3 grid-rows-[2fr]"
              docs={post.relatedPosts.filter((post) => typeof post === 'object')}
            />
          )}
        </div>
      </div>
    </article>
    </>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise

  try {
    const post = await queryPostBySlug({ slug, draft: false })
    return generateMeta({ doc: post })
  } catch (error) {
    console.error(`[generateMetadata] Failed to fetch metadata for post "${slug}":`, error)
    // Return default metadata for on-demand generated posts
    return {
      title: slug || 'Post',
      description: `Post: ${slug}`,
    }
  }
}

const queryPostBySlug = cache(async ({ slug, draft }: { slug: string; draft: boolean }) => {
  const post = await getPostBySlug(slug, draft)
  return post
})
