import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getAllPostSlugs, type Post } from '@/lib/api'
import React, { cache } from 'react'
import RichText from '@/components/RichText'
import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'

// ISR Configuration: 7-day fallback + webhook-based on-demand invalidation
export const revalidate = 604800 // 7 days fallback

// Allow dynamic params for posts not in generateStaticParams
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const slugs = await getAllPostSlugs()

    return slugs.map((slug) => ({
      slug: [slug], // catch-all requires array
    }))
  } catch (error) {
    console.warn('[generateStaticParams] Failed to fetch posts:', error)
    return []
  }
}

type Args = {
  params: Promise<{
    slug?: string[]
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { slug = [] } = await paramsPromise
  const postSlug = slug?.[0] || ''

  if (!postSlug) {
    notFound()
  }

  const url = '/posts/' + postSlug

  try {
    const post = await queryPostBySlug({ slug: postSlug, draft: false })

    if (!post) {
      notFound()
    }

    return (
      <article className="pt-16 pb-16">
        <PageClient />
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
    )
  } catch (error) {
    console.error(`[Post] Error fetching post "${postSlug}":`, error)
    notFound()
  }
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = [] } = await paramsPromise
  const postSlug = slug?.[0]

  if (!postSlug) {
    return { title: 'Post Not Found' }
  }

  try {
    const post = await queryPostBySlug({ slug: postSlug, draft: false })
    return generateMeta({ doc: post })
  } catch (error) {
    console.error(`[generateMetadata] Failed to fetch metadata for post "${postSlug}":`, error)
    return {
      title: postSlug,
      description: `Post: ${postSlug}`,
    }
  }
}

const queryPostBySlug = cache(async ({ slug, draft }: { slug: string; draft: boolean }) => {
  const post = await getPostBySlug(slug, draft)
  return post
})
