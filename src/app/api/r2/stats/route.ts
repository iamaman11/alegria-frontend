/**
 * GET /api/r2/stats
 * Returns R2 bucket statistics
 *
 * Uses getCloudflareContext() to access R2 bindings directly
 * Works on Cloudflare Pages with proper node_compat compatibility
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const bucket = env.NEXT_INC_CACHE_R2_BUCKET

    if (!bucket) {
      return NextResponse.json(
        { error: 'R2 bucket not configured' },
        { status: 500 }
      )
    }

    // List all objects to calculate stats
    let totalSize = 0
    let fileCount = 0
    let cursor: string | undefined

    do {
      const list = await bucket.list({ cursor, limit: 1000 })
      fileCount += list.objects.length

      for (const obj of list.objects) {
        totalSize += obj.size || 0
      }

      cursor = list.cursor
    } while (cursor)

    return NextResponse.json({
      status: 'ok',
      fileCount,
      totalSize,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[r2/stats] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
