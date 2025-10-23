import { revalidateTag, revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Revalidate API Endpoint for Webhook Integration
 *
 * This endpoint allows Payload CMS to invalidate Next.js cache on content updates.
 * Supports both tag-based and path-based revalidation.
 *
 * Authentication: x-revalidate-secret header
 *
 * Usage:
 * POST /api/revalidate
 * Headers: { "x-revalidate-secret": "YOUR_SECRET" }
 * Body: { "tag": "post-slug" } OR { "path": "/posts/slug" } OR { "collection": "posts", "slug": "my-post" }
 */

interface RevalidateRequest {
  tag?: string
  tags?: string[]
  path?: string
  paths?: string[]
  collection?: string
  slug?: string
  purgeCloudflare?: boolean
}

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Authenticate request
    const secret = request.headers.get('x-revalidate-secret')
    const expectedSecret = process.env.REVALIDATE_SECRET

    if (!expectedSecret) {
      console.error('[Revalidate] REVALIDATE_SECRET not configured')
      return NextResponse.json(
        { error: 'Server configuration error', code: 'NO_SECRET_CONFIGURED' },
        { status: 500 }
      )
    }

    if (secret !== expectedSecret) {
      console.warn('[Revalidate] Invalid secret attempt')
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_SECRET' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body: RevalidateRequest = await request.json()
    const { tag, tags, path, paths, collection, slug, purgeCloudflare = true } = body

    const revalidatedTags: string[] = []
    const revalidatedPaths: string[] = []
    const cloudflarePurged: string[] = []

    // 3. Revalidate by tag(s)
    if (tag) {
      revalidateTag(tag)
      revalidatedTags.push(tag)
      console.log(`[Revalidate] Tag: ${tag}`)
    }

    if (tags && Array.isArray(tags)) {
      for (const t of tags) {
        revalidateTag(t)
        revalidatedTags.push(t)
      }
      console.log(`[Revalidate] Tags: ${tags.join(', ')}`)
    }

    // 4. Revalidate by path(s)
    if (path) {
      revalidatePath(path)
      revalidatedPaths.push(path)
      console.log(`[Revalidate] Path: ${path}`)
    }

    if (paths && Array.isArray(paths)) {
      for (const p of paths) {
        revalidatePath(p)
        revalidatedPaths.push(p)
      }
      console.log(`[Revalidate] Paths: ${paths.join(', ')}`)
    }

    // 5. Revalidate by collection + slug (smart revalidation)
    if (collection && slug) {
      const collectionPaths: string[] = []
      const collectionTags: string[] = []

      // Individual item tag and path
      const itemTag = `${collection}-${slug}`
      const itemPath = `/${collection}/${slug}`

      revalidateTag(itemTag)
      revalidatePath(itemPath)
      collectionTags.push(itemTag)
      collectionPaths.push(itemPath)

      // Collection-wide tags
      const collectionTag = `collection-${collection}`
      revalidateTag(collectionTag)
      collectionTags.push(collectionTag)

      // Special handling for posts
      if (collection === 'posts') {
        // Revalidate homepage (shows latest posts)
        revalidatePath('/')
        collectionPaths.push('/')

        // Revalidate posts listing
        revalidatePath('/posts')
        collectionPaths.push('/posts')

        // Revalidate posts listing tag
        revalidateTag('posts-listing')
        collectionTags.push('posts-listing')
      }

      // Special handling for pages
      if (collection === 'pages') {
        // Pages might be top-level routes
        revalidatePath(`/${slug}`)
        collectionPaths.push(`/${slug}`)
      }

      revalidatedTags.push(...collectionTags)
      revalidatedPaths.push(...collectionPaths)

      console.log(`[Revalidate] Collection: ${collection}, Slug: ${slug}`)
      console.log(`[Revalidate] Auto-revalidated tags: ${collectionTags.join(', ')}`)
      console.log(`[Revalidate] Auto-revalidated paths: ${collectionPaths.join(', ')}`)
    }

    // 6. Purge Cloudflare CDN (optional)
    if (purgeCloudflare && revalidatedPaths.length > 0) {
      const purgeResult = await purgeCloudflareCache(revalidatedPaths)
      if (purgeResult.success) {
        cloudflarePurged.push(...revalidatedPaths)
      }
    }

    // 7. Return success response
    const duration = Date.now() - startTime
    const response = {
      revalidated: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      tags: revalidatedTags,
      paths: revalidatedPaths,
      cloudflarePurged: cloudflarePurged.length > 0 ? cloudflarePurged : undefined,
    }

    console.log(`[Revalidate] Success in ${duration}ms:`, response)
    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Revalidate] Error:', error)
    return NextResponse.json(
      {
        error: 'Revalidation failed',
        details: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      },
      { status: 500 }
    )
  }
}

/**
 * Purge Cloudflare CDN cache for specific URLs
 */
async function purgeCloudflareCache(paths: string[]): Promise<{ success: boolean, error?: string }> {
  const zone = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poshta.cloud'

  if (!zone || !token) {
    console.warn('[Revalidate] Cloudflare credentials missing - skipping CDN purge')
    return { success: false, error: 'Missing credentials' }
  }

  try {
    const urls = paths.map(p => {
      // Ensure path starts with /
      const cleanPath = p.startsWith('/') ? p : `/${p}`
      return `${siteUrl}${cleanPath}`
    })

    console.log(`[Revalidate] Purging Cloudflare CDN: ${urls.join(', ')}`)

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Revalidate] Cloudflare purge failed:', errorText)
      return { success: false, error: errorText }
    }

    const result = await response.json()
    console.log('[Revalidate] Cloudflare CDN purged successfully:', urls)
    return { success: true }

  } catch (error) {
    console.error('[Revalidate] Cloudflare purge error:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * GET handler for testing
 */
export async function GET() {
  return NextResponse.json({
    message: 'Revalidate API endpoint',
    usage: 'POST with x-revalidate-secret header',
    methods: ['POST'],
    bodyExamples: [
      { tag: 'post-my-slug' },
      { tags: ['post-slug-1', 'post-slug-2'] },
      { path: '/posts/my-slug' },
      { paths: ['/', '/posts'] },
      { collection: 'posts', slug: 'my-post' },
      { collection: 'pages', slug: 'about' },
    ],
  })
}
