import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Get pathname
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

  // Sitemap files - cache for 1 hour
  if (pathname.endsWith('.xml')) {
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return response
  }

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')

  // All caching for pages and API routes is handled by public/_headers
  // Middleware only handles security and specific asset types
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