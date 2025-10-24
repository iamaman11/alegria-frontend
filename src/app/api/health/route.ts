import { NextResponse } from 'next/server'

// NOTE: Do NOT use edge runtime with OpenNext on Cloudflare Pages
// Edge runtime blocks dynamic route compilation for [slug] patterns
// Use default Node.js runtime instead

// Health check is informational only - safe to cache for monitoring
export const revalidate = 3600  // Cache for 1 hour

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'undefined',
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'undefined',
      },
      runtime: 'cloudflare-pages',
      message: 'Health check endpoint for debugging OpenNext routing'
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      }
    }
  )
}