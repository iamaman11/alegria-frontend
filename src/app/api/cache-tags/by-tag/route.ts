/**
 * GET /api/cache-tags/by-tag?tag=homepage
 * Get all cache keys for a specific tag
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

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

    const searchParams = request.nextUrl.searchParams
    const tag = searchParams.get('tag')

    if (!tag) {
      return NextResponse.json(
        { error: 'tag query parameter is required' },
        { status: 400 }
      )
    }

    const result = await db
      .prepare('SELECT DISTINCT cache_key FROM cache_tags WHERE tag = ?')
      .bind(tag)
      .all()

    const cache_keys = result.results?.map((row) => row.cache_key as string) || []

    return NextResponse.json({
      status: 'ok',
      tag,
      cache_keys,
      count: cache_keys.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[cache-tags/by-tag] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
