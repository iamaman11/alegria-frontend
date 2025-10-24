/**
 * POST /api/r2/cleanup
 * Cleans up R2 bucket by prefix
 *
 * Body: { prefix: string, force?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const bucket = env.NEXT_INC_CACHE_R2_BUCKET

    if (!bucket) {
      return NextResponse.json(
        { error: 'R2 bucket not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { prefix, force } = body

    if (!prefix) {
      return NextResponse.json({ error: 'prefix is required' }, { status: 400 })
    }

    if (!force) {
      return NextResponse.json(
        { error: 'Set force: true to confirm deletion' },
        { status: 400 }
      )
    }

    console.log(`[r2/cleanup] Deleting objects with prefix: ${prefix}`)

    let deleted = 0
    let cursor: string | undefined

    do {
      const list = await bucket.list({ prefix, cursor, limit: 1000 })

      for (const obj of list.objects) {
        await bucket.delete(obj.key)
        deleted++
      }

      cursor = list.cursor
    } while (cursor)

    return NextResponse.json({
      status: 'ok',
      prefix,
      deletedCount: deleted,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[r2/cleanup] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
