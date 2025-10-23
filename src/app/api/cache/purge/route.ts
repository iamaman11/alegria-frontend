import { NextResponse, NextRequest } from 'next/server'

// NOTE: This endpoint handles cache purging for R2 incremental cache
// Called by Workers webhook handler to synchronize cache across all layers
// Required bindings: NEXT_INC_CACHE_R2_BUCKET, NEXT_TAG_CACHE_D1
// Environment variables: WEBHOOK_SECRET, CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN

interface PurgeRequest {
  key: string
  tags?: string[]
  paths?: string[]
}

/**
 * POST /api/cache/purge
 * Deletes R2 incremental cache and clears D1 tag cache
 *
 * Security: Requires x-webhook-secret header matching WEBHOOK_SECRET
 *
 * Request body:
 * {
 *   key: "page:slug:depth=2:draft=false",  // R2 cache key to delete
 *   tags: ["page-slug"],                    // D1 tags to invalidate
 *   paths: ["/slug"]                        // Paths to purge from CDN
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Verify webhook secret
    const secret = request.headers.get('x-webhook-secret')
    const expectedSecret = process.env.WEBHOOK_SECRET

    if (!expectedSecret) {
      console.error('[cache/purge] WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'WEBHOOK_SECRET not configured' },
        { status: 500 }
      )
    }

    if (secret !== expectedSecret) {
      console.error('[cache/purge] Invalid webhook secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as PurgeRequest
    const { key, tags = [], paths = [] } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Missing required field: key' },
        { status: 400 }
      )
    }

    const results = {
      r2_deleted: false,
      d1_cleared: false,
      cloudflare_purged: false,
      errors: [] as string[]
    }

    // ============================================
    // STEP 1: Delete R2 Incremental Cache
    // ============================================
    // Layer 2: R2 holds pre-rendered ISR HTML
    // When deleted, OpenNext will regenerate on next request

    try {
      // On Cloudflare Pages with OpenNext, R2 binding is exposed via globalThis
      const r2Bucket = (globalThis as any).NEXT_INC_CACHE_R2_BUCKET

      if (r2Bucket && typeof r2Bucket === 'object' && typeof r2Bucket.delete === 'function') {
        // R2 API expects bucket path operations
        // OpenNext stores incremental cache with pattern: <prefix>/<cache-key>
        const prefix = process.env.NEXT_INC_CACHE_R2_PREFIX || 'nextjs-cache'

        // Build the full R2 key path
        const r2Keys = [
          `${prefix}/${key}`,
          `${prefix}/${key}.body`,
          `${prefix}/${key}.meta`,
          // Fallback to raw key if prefix approach fails
          key,
        ]

        let deleted = false
        for (const r2Key of r2Keys) {
          try {
            await r2Bucket.delete(r2Key)
            deleted = true
            console.log(`[cache/purge] R2 deleted: ${r2Key}`)
            break  // Successfully deleted, no need to try other keys
          } catch (e) {
            const err = e instanceof Error ? e.message : String(e)
            console.debug(`[cache/purge] R2 key not found or delete failed: ${r2Key} (${err})`)
            // Try next key format
          }
        }

        results.r2_deleted = deleted
      } else {
        console.warn('[cache/purge] R2 binding (NEXT_INC_CACHE_R2_BUCKET) not available on globalThis')
        results.errors.push('R2 binding not available - Pages may not be running on Cloudflare with proper bindings')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[cache/purge] R2 deletion error:', msg)
      results.errors.push(`R2 deletion error: ${msg}`)
    }

    // ============================================
    // STEP 2: Clear D1 Tag Cache
    // ============================================
    // Layer 3: D1 holds invalidation tracking
    // Delete records for these tags to force regeneration on next request

    try {
      // On Cloudflare Pages, D1 binding is exposed via globalThis
      const d1Database = (globalThis as any).NEXT_TAG_CACHE_D1

      if (d1Database && tags.length > 0) {
        // D1 schema (created by OpenNext):
        // CREATE TABLE cache_tags (key TEXT PRIMARY KEY, tags TEXT)
        // Each entry: key = cache key, tags = space-separated tag list

        let clearedCount = 0
        for (const tag of tags) {
          try {
            // Delete all entries that contain this specific tag
            // Using LIKE for pattern matching on the tags column
            const deleteQuery = `
              DELETE FROM cache_tags
              WHERE tags LIKE ?
            `

            const result = await d1Database
              .prepare(deleteQuery)
              .bind(`%${tag}%`)
              .run()

            // D1 returns success: true if query executed
            if (result && typeof result === 'object') {
              clearedCount++
              console.log(`[cache/purge] D1 cleared tag: ${tag}`, result)
            }
          } catch (e) {
            // Table might not exist yet (first ISR page access)
            // or tag might not have entries - both are acceptable
            const err = e instanceof Error ? e.message : String(e)
            console.debug(`[cache/purge] D1 tag clear (may be empty): ${tag} - ${err}`)
          }
        }

        results.d1_cleared = clearedCount > 0
      } else {
        if (!d1Database) {
          console.warn('[cache/purge] D1 binding (NEXT_TAG_CACHE_D1) not available on globalThis')
          results.errors.push('D1 binding not available - tag cache clearing skipped')
        }
        // tags.length === 0 is OK, just means no tags to clear
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[cache/purge] D1 clearing error:', msg)
      results.errors.push(`D1 clearing error: ${msg}`)
    }

    // ============================================
    // STEP 3: Purge Cloudflare CDN Cache
    // ============================================
    // Layer 0: Cloudflare CDN edge servers
    // Purge specific URLs to remove cached HTML from CDN

    if (paths && paths.length > 0) {
      try {
        const cfToken = process.env.CLOUDFLARE_API_TOKEN
        const cfZoneId = process.env.CLOUDFLARE_ZONE_ID

        if (!cfToken || !cfZoneId) {
          console.warn('[cache/purge] Cloudflare credentials not configured')
        } else {
          const purgeUrls = paths.map(p => {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poshta.cloud'
            return `${baseUrl}${p}`
          })

          const purgeResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${cfToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                files: purgeUrls,
                tags: tags
              })
            }
          )

          if (purgeResponse.ok) {
            results.cloudflare_purged = true
            console.log('[cache/purge] Cloudflare CDN purged:', purgeUrls)
          } else {
            const errorData = await purgeResponse.text()
            results.errors.push(`Cloudflare purge failed: ${errorData}`)
            console.error('[cache/purge] Cloudflare purge failed:', errorData)
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('[cache/purge] Cloudflare purge error:', msg)
        results.errors.push(`Cloudflare purge error: ${msg}`)
      }
    }

    // ============================================
    // Summary
    // ============================================

    const allSuccess = results.r2_deleted || results.d1_cleared || results.cloudflare_purged

    return NextResponse.json(
      {
        success: allSuccess,
        message: `Cache purged for key: ${key}`,
        results
      },
      {
        status: allSuccess ? 200 : 207,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[cache/purge] Unhandled error:', msg)

    return NextResponse.json(
      { error: 'Internal server error', details: msg },
      { status: 500, headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } }
    )
  }
}
