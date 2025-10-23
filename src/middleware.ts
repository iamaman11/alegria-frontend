import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // DEBUG: Expose environment variables for diagnosis
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'UNDEFINED'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'UNDEFINED'
  response.headers.set('X-Debug-API-URL', apiUrl)
  response.headers.set('X-Debug-Site-URL', siteUrl)
  response.headers.set('X-Debug-Node-Env', process.env.NODE_ENV || 'unknown')
  response.headers.set('X-Debug-Runtime', 'cloudflare-pages-middleware')
  response.headers.set('X-Debug-Path', request.nextUrl.pathname)
  console.log(`[Middleware] API_URL=${apiUrl}, SITE_URL=${siteUrl}, NODE_ENV=${process.env.NODE_ENV}, Path=${request.nextUrl.pathname}`)

  // Get pathname
  const pathname = request.nextUrl.pathname

  // Dynamic pages are now handled by OpenNext with proper KV bindings
  // No middleware rewrite needed - routes compile correctly with bindings
  // Just pass through for standard Next.js routing

  // Static assets - cache for 1 year
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

  // API routes - no cache
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  }

  // ISR pages - enhanced caching strategy
  // Default: 5 minutes CDN cache with 24 hours stale-while-revalidate
  if (!response.headers.get('Cache-Control')) {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=86400, stale-if-error=604800'
    )
  }

  // Add CDN-Cache-Control header for Cloudflare
  // This allows longer CDN caching while keeping ISR at 60 seconds
  if (!pathname.startsWith('/api/')) {
    response.headers.set(
      'CDN-Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    )
  }

  // Add performance hints
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')

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