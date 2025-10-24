/**
 * GET /api/d1/tags/list
 * Lists cached tags and their entry counts
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

    const result = await db
      .prepare(
        `
        SELECT tag, COUNT(*) as count
        FROM cache_tags
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 100
      `
      )
      .all()

    const tags: Record<string, number> = {}
    let totalCount = 0

    if (result.results) {
      for (const row of result.results) {
        const tag = row.tag as string
        const count = (row.count as number) || 0
        tags[tag] = count
        totalCount += count
      }
    }

    return NextResponse.json({
      status: 'ok',
      tags,
      totalCount,
      uniqueTagCount: Object.keys(tags).length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[d1/tags/list] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
