import type { Metadata } from 'next'
import { searchContent } from '@/lib/api'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import React from 'react'

// ISR configuration: cache for 5 minutes, will be invalidated by webhook
export const revalidate = 300
export const dynamicParams = true

type Args = {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Search - Poshta',
    description: 'Search posts and pages on Poshta',
  }
}

export default async function SearchPage({ searchParams: searchParamsPromise }: Args) {
  const searchParams = await searchParamsPromise
  const query = searchParams?.q || ''
  const page = parseInt(searchParams?.page || '1', 10)

  // Search in both posts and pages via Workers API
  const results = query
    ? await searchContent(query, ['posts', 'pages'], {
        next: { revalidate: 300 },
      })
    : { posts: { docs: [], totalDocs: 0, hasNextPage: false }, pages: { docs: [], totalDocs: 0, hasNextPage: false } }

  const posts = results.posts || { docs: [], totalDocs: 0, hasNextPage: false }
  const pages = results.pages || { docs: [], totalDocs: 0, hasNextPage: false }
  const totalResults = (posts.totalDocs || 0) + (pages.totalDocs || 0)

  return (
    <article className="pt-16 pb-24">
      <div className="container max-w-4xl mx-auto">
        {/* Search Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Search</h1>
          <p className="text-lg text-muted-foreground">
            {query ? `Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query}"` : 'Enter a search query to find posts and pages'}
          </p>
        </header>

        {/* Search Input Form */}
        <div className="mb-12">
          <form action="/search" method="get" className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search posts and pages..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Results */}
        {totalResults > 0 ? (
          <div className="space-y-8">
            {/* Posts Results */}
            {posts.docs && posts.docs.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 pb-2 border-b">Posts ({posts.totalDocs})</h2>
                <div className="space-y-4">
                  {posts.docs.map((post: any) => (
                    <article
                      key={post.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
                    >
                      <a href={`/posts/${post.slug || post.id}`} className="group">
                        <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                          {post.title || 'Untitled'}
                        </h3>
                        {post.description && (
                          <p className="text-gray-600 mt-2 line-clamp-2">{post.description}</p>
                        )}
                        {post.publishedDate && (
                          <time className="text-sm text-gray-500 mt-3 block">
                            {new Date(post.publishedDate).toLocaleDateString()}
                          </time>
                        )}
                      </a>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Pages Results */}
            {pages.docs && pages.docs.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4 pb-2 border-b">Pages ({pages.totalDocs})</h2>
                <div className="space-y-4">
                  {pages.docs.map((page: any) => (
                    <article
                      key={page.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
                    >
                      <a href={`/${page.slug || page.id}`} className="group">
                        <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                          {page.title || 'Untitled'}
                        </h3>
                        {page.description && (
                          <p className="text-gray-600 mt-2 line-clamp-2">{page.description}</p>
                        )}
                      </a>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : query ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-500 mb-4">No results found for "{query}"</p>
            <p className="text-gray-400">Try a different search term</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-gray-500">Enter a search term above to get started</p>
          </div>
        )}
      </div>
    </article>
  )
}
