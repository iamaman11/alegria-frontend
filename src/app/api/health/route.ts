import { NextResponse } from 'next/server'

export const runtime = 'edge' // Use edge runtime for Cloudflare

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'undefined',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'undefined',
    },
    runtime: 'cloudflare-pages',
    message: 'Health check endpoint for debugging OpenNext routing'
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  })
}