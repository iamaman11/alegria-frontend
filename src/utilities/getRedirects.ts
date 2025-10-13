import { getAllRedirects } from '@/lib/api'
import { unstable_cache } from 'next/cache'

export async function getRedirects() {
  const redirects = await getAllRedirects()
  return redirects
}

/**
 * Returns a unstable_cache function mapped with the cache tag for 'redirects'.
 *
 * Cache all redirects together to avoid multiple fetches.
 */
export const getCachedRedirects = () =>
  unstable_cache(async () => getRedirects(), ['redirects'], {
    tags: ['redirects'],
  })
