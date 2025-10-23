/**
 * Next.js API Route: Cache Purge Handler
 *
 * This route handles cache invalidation for development and as a fallback
 * Note: On Cloudflare Pages, /functions/api/cache-purge.ts is used instead
 *       which has direct R2 and D1 binding access.
 *
 * On local dev:
 * - Can mock R2/D1 operations or skip them
 * - Still handles CDN purge via Cloudflare API
 *
 * Bindings available on Cloudflare Pages via context.env
 * But NOT available here (Node.js runtime doesn't have them)
 */

import { NextRequest, NextResponse } from 'next/server'

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
    // NOTE: R2 and D1 operations skipped on Node.js
    // They only work on Cloudflare Pages Functions
    // ============================================
    console.log('[cache-purge] Running on Node.js (development mode)')
    results.errors.push('R2/D1 operations only available on Cloudflare Pages')

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
