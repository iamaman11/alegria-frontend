/**
 * Next.js API Route: Cache Purge Handler
 *
 * This route handles cache invalidation for:
 * - Local development (can skip R2/D1 operations)
 * - Production on Cloudflare Pages (has R2/D1 bindings via getCloudflareContext)
 *
 * On Cloudflare Pages:
 * - Uses getCloudflareContext() to access R2 and D1 bindings
 * - Deletes cache from R2 incremental cache bucket
 * - Clears D1 tag cache for on-demand revalidation
 * - Purges Cloudflare CDN cache
 *
 * On local dev:
 * - getCloudflareContext() is mocked by @opennextjs/cloudflare
 * - Still handles CDN purge via Cloudflare API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

interface PurgeRequest {
  key: string
  tags?: string[]
  paths?: string[]
}

export async function POST(request: NextRequest) {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    )
  }

  try {
    // Validate webhook secret for security
    const secret = request.headers.get('x-webhook-secret')
    const expectedSecret = process.env.WEBHOOK_SECRET

    if (!expectedSecret) {
      console.error('[cache-purge] WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'WEBHOOK_SECRET not configured' },
        { status: 500 }
      )
    }

    if (secret !== expectedSecret) {
      console.error('[cache-purge] Invalid webhook secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = (await request.json()) as PurgeRequest
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
    // STEP: Get Cloudflare context (R2/D1 bindings)
    // ============================================
    let cfContext: any = null
    try {
      cfContext = await getCloudflareContext({ async: true })
      console.log('[cache-purge] Cloudflare context obtained for R2/D1 access')
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn('[cache-purge] getCloudflareContext failed (expected on non-Cloudflare):', msg)
    }

    // ============================================
    // STEP: Delete from R2 Incremental Cache
    // ============================================
    if (cfContext?.env?.NEXT_INC_CACHE_R2_BUCKET) {
      try {
        const r2 = cfContext.env.NEXT_INC_CACHE_R2_BUCKET
        const prefix = process.env.NEXT_INC_CACHE_R2_PREFIX || 'nextjs-cache'
        const r2Key = `${prefix}/${key}`

        await r2.delete(r2Key)
        results.r2_deleted = true
        console.log('[cache-purge] R2 cache deleted:', r2Key)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('[cache-purge] R2 deletion failed:', msg)
        results.errors.push(`R2 deletion error: ${msg}`)
      }
    } else {
      console.log('[cache-purge] R2 binding not available (expected on local dev)')
    }

    // ============================================
    // STEP: Clear D1 Tag Cache
    // ============================================
    if (cfContext?.env?.NEXT_TAG_CACHE_D1) {
      try {
        const d1 = cfContext.env.NEXT_TAG_CACHE_D1
        const tagList = tags.length > 0 ? tags : ['all']

        // Clear D1 entries for these tags
        for (const tag of tagList) {
          const sql = 'DELETE FROM tags WHERE tag = ?'
          await d1.prepare(sql).bind(tag).run()
        }

        results.d1_cleared = true
        console.log('[cache-purge] D1 tags cleared:', tagList)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('[cache-purge] D1 clearing failed:', msg)
        results.errors.push(`D1 clear error: ${msg}`)
      }
    } else {
      console.log('[cache-purge] D1 binding not available (expected on local dev)')
    }

    // ============================================
    // STEP: Purge Cloudflare CDN Cache
    // ============================================
    if (paths && paths.length > 0) {
      try {
        const cfToken = process.env.CLOUDFLARE_API_TOKEN
        const cfZoneId = process.env.CLOUDFLARE_ZONE_ID

        if (!cfToken || !cfZoneId) {
          console.warn('[cache-purge] Cloudflare credentials not configured')
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
            console.log('[cache-purge] Cloudflare CDN purged:', purgeUrls)
          } else {
            const errorData = await purgeResponse.text()
            results.errors.push(`Cloudflare purge failed: ${errorData}`)
            console.error('[cache-purge] Cloudflare purge failed:', errorData)
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('[cache-purge] Cloudflare purge error:', msg)
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
        message: `Cache purge request for key: ${key}`,
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
    console.error('[cache-purge] Unhandled error:', msg)

    return NextResponse.json(
      { error: 'Internal server error', details: msg },
      { status: 500 }
    )
  }
}
