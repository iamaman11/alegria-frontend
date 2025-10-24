/**
 * POST /api/d1/cleanup
 * Cleans up D1 stale cache entries
 *
 * Body: { olderThanHours?: 24, force?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const db = env.NEXT_TAG_CACHE_D1

    if (!db) {
      return NextResponse.json(
        { error: 'D1 database not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { olderThanHours = 24, force } = body

    if (!force) {
      return NextResponse.json(
        { error: 'Set force: true to confirm deletion' },
        { status: 400 }
      )
    }

    const hoursAgo = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    const cutoffTime = hoursAgo.toISOString()

    console.log(`[d1/cleanup] Deleting entries older than ${cutoffTime}`)

    const deleteResult = await db
      .prepare('DELETE FROM cache_tags WHERE created_at < ?')
      .bind(cutoffTime)
      .run()

    const deletedCount = deleteResult.meta?.changes || 0

    return NextResponse.json({
      status: 'ok',
      olderThanHours,
      deletedCount,
      cutoffTime,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[d1/cleanup] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
