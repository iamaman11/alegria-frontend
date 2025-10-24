/**
 * POST /api/cache-purge-tags
 * Purge cache by tags - deletes from R2 and D1
 *
 * Body: { tags: string[], force: boolean }
 *
 * Flow:
 * 1. Find all cache_keys for given tags in D1
 * 2. Delete those cache_keys from R2
 * 3. Delete tag-cache_key mappings from D1
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const db = env.NEXT_TAG_CACHE_D1
    const bucket = env.NEXT_INC_CACHE_R2_BUCKET

    if (!db) {
      return NextResponse.json(
        { error: 'D1 database not configured' },
        { status: 500 }
      )
    }

    if (!bucket) {
      return NextResponse.json(
        { error: 'R2 bucket not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { tags = [], force } = body

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: 'tags array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!force) {
      return NextResponse.json(
        { error: 'Set force: true to confirm deletion' },
        { status: 400 }
      )
    }

    console.log(`[cache-purge-tags] Starting purge for tags: ${tags.join(', ')}`)

    // Step 1: Find all cache_keys for these tags in D1
    const tagPlaceholders = tags.map(() => '?').join(',')
    const queryResult = await db
      .prepare(
        `SELECT DISTINCT cache_key FROM cache_tags WHERE tag IN (${tagPlaceholders})`
      )
      .bind(...tags)
      .all()

    const cache_keys = queryResult.results?.map((row) => row.cache_key as string) || []

    if (cache_keys.length === 0) {
      return NextResponse.json({
        status: 'ok',
        message: 'No cache entries found for these tags',
        tags,
        deleted_from_r2: 0,
        deleted_from_d1: 0,
        timestamp: new Date().toISOString(),
      })
    }

    // Step 2: Delete from R2
    let r2_deleted_count = 0
    for (const cache_key of cache_keys) {
      try {
        await bucket.delete(cache_key)
        r2_deleted_count++
      } catch (e) {
        console.error(`[cache-purge-tags] Failed to delete R2 key: ${cache_key}`, e)
      }
    }

    // Step 3: Delete from D1 - remove cache_tag mappings for these tags
    const deleteTagPlaceholders = tags.map(() => '?').join(',')
    await db
      .prepare(`DELETE FROM cache_tags WHERE tag IN (${deleteTagPlaceholders})`)
      .bind(...tags)
      .run()

    const deleteResult = await db
      .prepare(`DELETE FROM cache_tags WHERE tag IN (${deleteTagPlaceholders})`)
      .bind(...tags)
      .run()

    const d1_deleted_count = deleteResult.meta?.changes || 0

    console.log(
      `[cache-purge-tags] Purged ${r2_deleted_count} from R2, ${d1_deleted_count} from D1 for tags: ${tags.join(', ')}`
    )

    return NextResponse.json({
      status: 'ok',
      tags,
      cache_keys_found: cache_keys.length,
      deleted_from_r2: r2_deleted_count,
      deleted_from_d1: d1_deleted_count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[cache-purge-tags] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
