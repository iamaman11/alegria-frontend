import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

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

  // API routes - differentiated caching strategy
  if (pathname.startsWith('/api/')) {
    // Management APIs: never cache (cache manipulation endpoints)
    const managementApis = [
      '/api/cache-purge',
      '/api/cache-tags',
    ]
    const isManagementApi = managementApis.some(api => pathname.startsWith(api))

    if (isManagementApi) {
      // Never cache cache management endpoints
      response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
      return response
    }

    // Monitoring APIs: allow moderate caching (health checks, stats)
    // These endpoints provide status information and benefit from 1-hour CDN cache
    const monitoringApis = [
      '/api/health',
      '/api/stats',
      '/api/d1/stats',
      '/api/r2/stats',
    ]
    const isMonitoringApi = monitoringApis.some(api => pathname.startsWith(api))

    if (isMonitoringApi) {
      // Allow route handler's explicit Cache-Control to take precedence
      // Route handler sets: public, s-maxage=3600, stale-while-revalidate=86400
      if (!response.headers.get('Cache-Control')) {
        response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
      }
      return response
    }

    // Other APIs: default to no cache (conservative)
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0')
    return response
  }

  // ISR pages - caching handled by public/_headers (s-maxage=3600)
  // Middleware sets default for routes not in _headers
  if (!response.headers.get('Cache-Control')) {
    response.headers.set(
      'Cache-Control',
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