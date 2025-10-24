/**
 * GET /api/r2/list?prefix=...&limit=100
 * Lists R2 objects by prefix
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

    const prefix = request.nextUrl.searchParams.get('prefix') || ''
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '100'),
      1000
    )

    const list = await bucket.list({ prefix, limit })
    let totalSize = 0

    const files = list.objects.map(obj => ({
      key: obj.key,
      size: obj.size || 0,
      uploaded: obj.uploaded?.toISOString(),
      etag: obj.etag,
    }))

    for (const file of files) {
      totalSize += file.size
    }

    return NextResponse.json({
      status: 'ok',
      prefix,
      fileCount: files.length,
      totalSize,
      files,
      hasMore: !list.truncated === false,
      cursor: list.cursor,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[r2/list] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
