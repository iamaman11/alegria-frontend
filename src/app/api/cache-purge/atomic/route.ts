/**
 * POST /api/cache-purge/atomic
 * Expert atomic cache purge: CDN + R2 + D1 synchronized
 *
 * Body: {
 *   tags: string[]
 * }
 *
 * Environment variables (injected by GitHub Actions from Secrets):
 * - CLOUDFLARE_API_TOKEN: from process.env
 * - CLOUDFLARE_ZONE_ID: from process.env
 *
 * Flow:
 * 1. Query D1: find all cache_keys for these tags
 * 2. DELETE R2 cache files (parallel)
 * 3. Cloudflare API: purge_cache by tags (parallel)
 * 4. DELETE D1 mappings (only if R2 succeeded)
 * 5. Return: all deleted counts + duration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const db = env.NEXT_TAG_CACHE_D1
    const bucket = env.NEXT_INC_CACHE_R2_BUCKET

    if (!db || !bucket) {
      return NextResponse.json(
        { error: 'D1 or R2 not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { tags = [] } = body

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: 'tags array required and must not be empty' },
        { status: 400 }
      )
    }

    // Read from environment variables (set by GitHub Secrets + CI/CD)
    const cloudflare_api_token = process.env.CLOUDFLARE_API_TOKEN
    const cloudflare_zone_id = process.env.CLOUDFLARE_ZONE_ID

    if (!cloudflare_api_token || !cloudflare_zone_id) {
      console.error('[cache-purge/atomic] Missing Cloudflare credentials in environment')
      return NextResponse.json(
        { error: 'Cloudflare credentials not configured' },
        { status: 500 }
      )
    }

    console.log(`[cache-purge/atomic] Starting atomic purge for tags: ${tags.join(', ')}`)

    const startTime = Date.now()

    // STEP 1: Find all cache_keys for these tags in D1
    const tagPlaceholders = tags.map(() => '?').join(',')
    const queryResult = await db
      .prepare(
        `SELECT DISTINCT cache_key FROM cache_tags WHERE tag IN (${tagPlaceholders})`
      )
      .bind(...tags)
      .all()

    const cache_keys = queryResult.results?.map((row) => row.cache_key as string) || []
    console.log(`[cache-purge/atomic] Found ${cache_keys.length} cache keys for tags`)

    if (cache_keys.length === 0) {
      return NextResponse.json({
        status: 'ok',
        message: 'No cache entries found for these tags',
        tags,
        deleted_r2: 0,
        deleted_d1: 0,
        cloudflare_purged: false,
        timestamp: new Date().toISOString(),
      })
    }

    // STEP 2 & 3: Parallel - DELETE R2 + Cloudflare API purge
    const [r2Result, cfResult] = await Promise.all([
      // Delete from R2
      (async () => {
        let deleted = 0
        for (const cache_key of cache_keys) {
          try {
            await bucket.delete(cache_key)
            deleted++
          } catch (e) {
            console.error(`[cache-purge/atomic] Failed to delete R2 key: ${cache_key}`, e)
          }
        }
        return deleted
      })(),

      // Purge Cloudflare CDN by tags
      (async () => {
        try {
          const cfResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${cloudflare_zone_id}/purge_cache`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${cloudflare_api_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ tags }),
            }
          )

          const cfData = await cfResponse.json() as any
          if (cfResponse.ok && cfData.success) {
            console.log(`[cache-purge/atomic] Cloudflare purged ${tags.length} tags`)
            return true
          } else {
            console.error('[cache-purge/atomic] Cloudflare purge failed:', cfData)
            return false
          }
        } catch (error) {
          console.error('[cache-purge/atomic] Cloudflare API error:', error)
          return false
        }
      })(),
    ])

    const r2_deleted = r2Result
    const cloudflare_purged = cfResult

    // STEP 4: DELETE D1 mappings (only if R2 was successful)
    let d1_deleted = 0
    if (r2_deleted > 0) {
      const deletePlaceholders = tags.map(() => '?').join(',')
      const deleteResult = await db
        .prepare(`DELETE FROM cache_tags WHERE tag IN (${deletePlaceholders})`)
        .bind(...tags)
        .run()
      d1_deleted = deleteResult.meta?.changes || 0
    }

    const duration = Date.now() - startTime

    console.log(
      `[cache-purge/atomic] SUCCESS - R2: ${r2_deleted}, D1: ${d1_deleted}, CF: ${cloudflare_purged}, duration: ${duration}ms`
    )

    return NextResponse.json({
      status: 'ok',
      tags,
      cache_keys_found: cache_keys.length,
      deleted_r2: r2_deleted,
      deleted_d1: d1_deleted,
      cloudflare_purged,
      duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[cache-purge/atomic] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
