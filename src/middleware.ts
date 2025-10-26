import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // Static assets - cache for 1 year (immutable)
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.match(/\.(ico|svg|png|jpg|jpeg|gif|webp|avif)$/i)
  ) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return response
  }

  // Sitemaps - cache for 1 hour with SWR
  if (pathname.endsWith('.xml')) {
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return response
  }

  // Security headers only
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')

  // Dynamic pages (including ISR): Next.js + OpenNext manage caching
  // revalidate value from route handlers controls Cache-Control headers
  // Do NOT override headers - let Next.js runtime set them based on revalidate
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Note: OpenNext handles these internally, but we add headers for CDN
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}