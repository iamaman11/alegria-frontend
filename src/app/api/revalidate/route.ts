/**
 * POST /api/revalidate
 *
 * On-demand revalidation endpoint for ISR pages (pages, posts)
 * Called by Workers webhook after CMS updates
 *
 * Body: { tag: string, collection: 'pages' | 'posts', slug: string }
 *
 * Flow:
 * 1. Receive webhook from Workers
 * 2. Call revalidateTag(tag) - Next.js built-in function
 * 3. Cloudflare Pages AUTOMATICALLY:
 *    - UPDATE D1 Tag Cache
 *    - DELETE R2 cached files
 *    - Purge CDN cache
 * 4. ISR regenerates in background when next request arrives
 *
 * CRITICAL: Must execute fresh every time (export const revalidate = 0)
 */

import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 0 // Always fresh - this is a stateful operation

export async function POST(request: NextRequest) {
  try {
    const { tag, collection, slug } = await request.json()

    // Validate webhook secret (optional but recommended)
    const secret = request.headers.get('x-webhook-secret')
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid webhook secret' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!tag || !collection || !slug) {
      return NextResponse.json(
        { error: 'tag, collection, and slug are required' },
        { status: 400 }
      )
    }

    // Log the revalidation request
    console.log(
      `[api/revalidate] Processing tag="${tag}" collection="${collection}" slug="${slug}"`
    )

    // CORE: Call Next.js built-in revalidateTag()
    // This is the original Cloudflare Pages approach
    // Cloudflare Pages automatically handles:
    // 1. UPDATE D1 Tag Cache (NEXT_TAG_CACHE_D1)
    // 2. DELETE R2 cached files
    // 3. Purge CDN cache by tag
    try {
      revalidateTag(tag)
      console.log(`[api/revalidate] Successfully called revalidateTag("${tag}")`)
    } catch (revalidateError) {
      // revalidateTag() can throw if D1 is unavailable
      // In that case, log but don't fail the entire request
      // Regional Cache will handle stale content gracefully
      const message =
        revalidateError instanceof Error
          ? revalidateError.message
          : 'Unknown error'
      console.warn(
        `[api/revalidate] revalidateTag("${tag}") warning: ${message}`
      )
      // Continue - don't throw
    }

    return NextResponse.json(
      {
        status: 'ok',
        tag,
        collection,
        slug,
        message: 'Revalidation triggered via revalidateTag()',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'private, no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api/revalidate] Error:', message)
    return NextResponse.json(
      { error: message, status: 'failed' },
      { status: 500 }
    )
  }
}
