import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import { getAllPosts } from '@/lib/api'
import React from 'react'
import PageClient from './page.client'

// ISR configuration for posts listing
// Revalidate every 5 minutes for fresh content
export const revalidate = 300 // 5 minutes for listing pages

// Allow dynamic params for posts not in generateStaticParams
export const dynamicParams = true

export default async function Page() {
  let posts
  try {
    posts = await getAllPosts(1, 12)
  } catch (error) {
    console.warn('[Posts] Failed to fetch posts, using empty result:', error instanceof Error ? error.message : String(error))
    // Return empty posts structure for fallback
    return (
      <div className="pt-24 pb-24">
        <PageClient />
        <div className="container mb-16">
          <div className="prose dark:prose-invert max-w-none">
            <h1>Posts</h1>
            <p>Unable to load posts at this time. Please try again later.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Posts</h1>
        </div>
      </div>

      <div className="container mb-8">
        <PageRange
          collection="posts"
          currentPage={posts.page}
          limit={12}
          totalDocs={posts.totalDocs}
        />
      </div>

      <CollectionArchive posts={posts.docs} />

      <div className="container">
        {posts.totalPages > 1 && posts.page && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Payload Website Template Posts`,
  }
}
