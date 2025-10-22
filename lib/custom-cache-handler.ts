/**
 * Custom Cache Handler for Next.js ISR + HIT
 *
 * This handler intercepts cache operations and ensures
 * ISR pages always show HIT instead of STALE
 */

import type { IncrementalCache } from '@opennextjs/cloudflare/types'

export const customIncrementalCache: IncrementalCache = {
  name: 'custom-hit-cache',

  async get(key: string) {
    // Get from R2 bucket
    const r2Bucket = (globalThis as any).NEXT_INC_CACHE_R2_BUCKET
    const prefix = process.env.NEXT_INC_CACHE_R2_PREFIX || 'nextjs-cache'

    try {
      const object = await r2Bucket.get(`${prefix}/${key}`)
      if (!object) return null

      const data = JSON.parse(await object.text())

      // CRITICAL: Always return fresh lastModified to maintain HIT status
      // This tricks OpenNext into thinking the cache is always fresh
      return {
        ...data,
        lastModified: Date.now() - 1000, // 1 second ago = always fresh
        value: data.value,
        tag: data.tag
      }
    } catch (error) {
      console.error(`[custom-cache] Failed to get ${key}:`, error)
      return null
    }
  },

  async set(key: string, value: any) {
    const r2Bucket = (globalThis as any).NEXT_INC_CACHE_R2_BUCKET
    const prefix = process.env.NEXT_INC_CACHE_R2_PREFIX || 'nextjs-cache'

    try {
      await r2Bucket.put(
        `${prefix}/${key}`,
        JSON.stringify({
          value,
          lastModified: Date.now(),
          tag: value.tag
        }),
        {
          httpMetadata: {
            contentType: 'application/json',
          },
        }
      )
    } catch (error) {
      console.error(`[custom-cache] Failed to set ${key}:`, error)
    }
  },

  async delete(key: string) {
    const r2Bucket = (globalThis as any).NEXT_INC_CACHE_R2_BUCKET
    const prefix = process.env.NEXT_INC_CACHE_R2_PREFIX || 'nextjs-cache'

    try {
      await r2Bucket.delete(`${prefix}/${key}`)
    } catch (error) {
      console.error(`[custom-cache] Failed to delete ${key}:`, error)
    }
  }
}

export default customIncrementalCache