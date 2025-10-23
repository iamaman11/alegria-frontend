/**
 * Cloudflare Pages Function: Cache Purge Handler
 *
 * This function handles R2 and D1 cache invalidation for ISR
 * Called by Workers webhook when content updates occur
 *
 * Advantages over Next.js API route:
 * - Has direct access to R2 and D1 bindings via env
 * - Executes in Pages environment where bindings are available
 * - No additional Workers cost
 * - Lower latency (local to Pages)
 *
 * Bindings available through env:
 * - env.NEXT_INC_CACHE_R2_BUCKET: R2 bucket for ISR cache
 * - env.NEXT_TAG_CACHE_D1: D1 database for tag tracking
 */

interface EventContext {
  request: Request
  env: Record<string, any>
}

interface PurgeRequest {
  key: string
  tags?: string[]
  paths?: string[]
}

export async function onRequest(context: EventContext): Promise<Response> {
  const { request, env } = context

  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Validate webhook secret for security
    const secret = request.headers.get('x-webhook-secret')
    const expectedSecret = env.WEBHOOK_SECRET

    if (!expectedSecret) {
      console.error('[cache-purge] WEBHOOK_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'WEBHOOK_SECRET not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (secret !== expectedSecret) {
      console.error('[cache-purge] Invalid webhook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = (await request.json()) as PurgeRequest
    const { key, tags = [], paths = [] } = body

    if (!key) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: key' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
    // Pages Function has direct access to R2 via env binding
    try {
      const r2Bucket = env.NEXT_INC_CACHE_R2_BUCKET
      const prefix = env.NEXT_INC_CACHE_R2_PREFIX || 'nextjs-cache'

      if (r2Bucket && typeof r2Bucket === 'object' && typeof r2Bucket.delete === 'function') {
        // Try multiple key formats as ISR cache may use different patterns
        const r2Keys = [
          `${prefix}/${key}`,
          `${prefix}/${key}.body`,
          `${prefix}/${key}.meta`,
          key // fallback to raw key
        ]

        let deleted = false
        for (const r2Key of r2Keys) {
          try {
            await r2Bucket.delete(r2Key)
            deleted = true
            console.log(`[cache-purge] R2 deleted: ${r2Key}`)
            break
          } catch (e) {
            // Try next key format
          }
        }

        results.r2_deleted = deleted
      } else {
        console.warn('[cache-purge] R2 binding not available')
        results.errors.push('R2 binding not available')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[cache-purge] R2 deletion error:', msg)
      results.errors.push(`R2 deletion error: ${msg}`)
    }

    // ============================================
    // STEP 2: Clear D1 Tag Cache
    // ============================================
    // Pages Function has direct access to D1 via env binding
    try {
      const d1Database = env.NEXT_TAG_CACHE_D1

      if (d1Database && tags.length > 0) {
        let clearedCount = 0
        for (const tag of tags) {
          try {
            const deleteQuery = `
              DELETE FROM cache_tags
              WHERE tags LIKE ?
            `

            const result = await d1Database
              .prepare(deleteQuery)
              .bind(`%${tag}%`)
              .run()

            if (result && typeof result === 'object') {
              clearedCount++
              console.log(`[cache-purge] D1 cleared tag: ${tag}`, result)
            }
          } catch (e) {
            // Table may not exist yet, skip
            console.debug(`[cache-purge] D1 tag clear (may be empty): ${tag}`)
          }
        }

        results.d1_cleared = clearedCount > 0
      } else {
        if (!d1Database) {
          console.warn('[cache-purge] D1 binding not available')
          results.errors.push('D1 binding not available')
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[cache-purge] D1 clearing error:', msg)
      results.errors.push(`D1 clearing error: ${msg}`)
    }

    // ============================================
    // STEP 3: Purge Cloudflare CDN Cache
    // ============================================
    if (paths && paths.length > 0) {
      try {
        const cfToken = env.CLOUDFLARE_API_TOKEN
        const cfZoneId = env.CLOUDFLARE_ZONE_ID

        if (!cfToken || !cfZoneId) {
          console.warn('[cache-purge] Cloudflare credentials not configured')
        } else {
          const purgeUrls = paths.map(p => {
            const baseUrl = env.NEXT_PUBLIC_SITE_URL || 'https://poshta.cloud'
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

    return new Response(
      JSON.stringify({
        success: allSuccess,
        message: `Cache purged for key: ${key}`,
        results
      }),
      {
        status: allSuccess ? 200 : 207,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[cache-purge] Unhandled error:', msg)

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: msg }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )
  }
}

// Configuration for Cloudflare Pages Function
export const config = {
  path: '/api/cache-purge'
}
