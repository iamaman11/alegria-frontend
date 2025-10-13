import { getHeader, getFooter, type HeaderGlobal, type FooterGlobal } from '@/lib/api'
import { unstable_cache } from 'next/cache'

type Global = 'header' | 'footer'

async function getGlobal(
  slug: Global,
  depth = 0
): Promise<HeaderGlobal | FooterGlobal | null> {
  if (slug === 'header') {
    return await getHeader()
  }
  if (slug === 'footer') {
    return await getFooter()
  }
  return null
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedGlobal = (slug: Global, depth = 0) =>
  unstable_cache(async () => getGlobal(slug, depth), [slug], {
    tags: [`global_${slug}`],
  })
