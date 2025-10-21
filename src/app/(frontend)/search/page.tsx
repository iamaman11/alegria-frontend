import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { searchContent } from '@/lib/api'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'

// Force dynamic rendering for search page
export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{
    q?: string
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const searchParams = await searchParamsPromise
  const query = searchParams?.q || ''

  // Search in both posts and pages via Workers API
  const results = query
    ? await searchContent(query, ['posts'])
    : { posts: { docs: [], totalDocs: 0 } }

  const posts = results.posts || { docs: [], totalDocs: 0 }

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">Search</h1>

          <div className="max-w-[50rem] mx-auto">
            <Search />
          </div>
        </div>
      </div>

      {posts.totalDocs > 0 ? (
        <CollectionArchive posts={posts.docs as CardPostData[]} />
      ) : (
        <div className="container">
          {query ? 'No results found.' : 'Enter a search query above.'}
        </div>
      )}
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Payload Website Template Search`,
  }
}
