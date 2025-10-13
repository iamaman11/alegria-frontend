import { getPostBySlug, getPageBySlug, type Post, type Page } from '@/lib/api'
import { unstable_cache } from 'next/cache'

type Collection = 'posts' | 'pages'

async function getDocument(
  collection: Collection,
  slug: string,
  depth = 0
): Promise<Post | Page | null> {
  if (collection === 'posts') {
    return await getPostBySlug(slug, false)
  }
  if (collection === 'pages') {
    return await getPageBySlug(slug, false)
  }
  return null
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedDocument = (collection: Collection, slug: string) =>
  unstable_cache(async () => getDocument(collection, slug), [collection, slug], {
    tags: [`${collection}_${slug}`],
  })
