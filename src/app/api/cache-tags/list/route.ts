/**
 * GET /api/cache-tags/list
 * Get all registered cache tags and their statistics
 *
 * CRITICAL: Must return fresh data (no caching)
 * - Used by monitoring/debugging tools
 * - Used by Workers to understand current cache state
 * - Stale data would be misleading for diagnostics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Disable caching - always return fresh data
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const db = env.NEXT_TAG_CACHE_D1

    if (!db) {
      return NextResponse.json(
        { error: 'D1 database not configured' },
        { status: 500 }
      )
    }

    // Get all unique tags and their cache key counts
    const result = await db
      .prepare(
        `SELECT
          tag,
          COUNT(DISTINCT cache_key) as key_count,
          MAX(created_at) as last_updated
         FROM cache_tags
         GROUP BY tag
         ORDER BY last_updated DESC`
      )
      .all()

    const tags: Record<string, number> = {}
    let totalCount = 0

    result.results?.forEach((row: any) => {
      tags[row.tag] = row.key_count
      totalCount += row.key_count
    })

    return NextResponse.json(
      {
        status: 'ok',
        tags,
        totalCount,
        uniqueTagCount: Object.keys(tags).length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[cache-tags/list] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
