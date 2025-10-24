/**
 * POST /api/cache-tags/register
 * Register a cache key for a tag for tag-based invalidation
 *
 * Body: { tag: string, cache_key: string }
 *
 * CRITICAL: Must execute fresh every time
 * - Called during ISR regeneration to register new cache entries
 * - No caching - this is a stateful operation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// Disable caching - always execute fresh
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const db = env.NEXT_TAG_CACHE_D1

    if (!db) {
      return NextResponse.json(
        { error: 'D1 database not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { tag, cache_key } = body

    if (!tag || !cache_key) {
      return NextResponse.json(
        { error: 'tag and cache_key are required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Insert or update tag-cache_key mapping
    // ON CONFLICT works because PRIMARY KEY (tag, cache_key) is defined in migration
    const result = await db
      .prepare(
        `INSERT INTO cache_tags (tag, cache_key, created_at)
         VALUES (?, ?, ?)
         ON CONFLICT(tag, cache_key) DO UPDATE SET created_at = ?`
      )
      .bind(tag, cache_key, now, now)
      .run()

    if (!result.success) {
      throw new Error(`Failed to insert: ${result.error || 'unknown error'}`)
    }

    console.log(`[cache-tags/register] Registered tag="${tag}" cache_key="${cache_key}"`)

    return NextResponse.json({
      status: 'ok',
      tag,
      cache_key,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[cache-tags/register] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
