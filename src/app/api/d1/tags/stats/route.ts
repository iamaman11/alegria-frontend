/**
 * GET /api/d1/tags/stats
 * Returns tag cache statistics
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

    const countResult = await db
      .prepare('SELECT COUNT(*) as count FROM cache_tags')
      .first()

    const entryCount = (countResult?.count as number) || 0

    let sizeBytes = 0
    try {
      const sizeResult = await db
        .prepare(
          'SELECT SUM(LENGTH(tag) + LENGTH(cache_key)) as size FROM cache_tags'
        )
        .first()
      sizeBytes = (sizeResult?.size as number) || 0
    } catch (e) {
      // Table might not exist
    }

    const oldestResult = await db
      .prepare('SELECT created_at FROM cache_tags ORDER BY created_at ASC LIMIT 1')
      .first()

    const newestResult = await db
      .prepare('SELECT created_at FROM cache_tags ORDER BY created_at DESC LIMIT 1')
      .first()

    return NextResponse.json({
      status: 'ok',
      entryCount,
      sizeBytes,
      oldestEntry: oldestResult?.created_at || null,
      newestEntry: newestResult?.created_at || null,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[d1/tags/stats] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
