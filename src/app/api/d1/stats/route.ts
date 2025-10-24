/**
 * GET /api/d1/stats
 * Returns D1 database statistics
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

    const tables = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()

    const tableCount = tables.results?.length || 0

    let sizeBytes = 0
    try {
      const sizeResult = await db
        .prepare(
          'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()'
        )
        .first()
      sizeBytes = (sizeResult?.size as number) || 0
    } catch (e) {
      // Size query might fail
    }

    return NextResponse.json({
      status: 'ok',
      tableCount,
      sizeBytes,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[d1/stats] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
