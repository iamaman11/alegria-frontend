// Cloudflare Pages Functions: Expert Routing for Next.js ISR
// This function handles ALL requests to provide optimized routing

interface EventContext {
  request: Request
  next: (request?: Request) => Promise<Response>
  env: {
    ASSETS: {
      fetch: (request: Request) => Promise<Response>
    }
  }
  params: {
    path?: string[]
  }
}

export async function onRequest(context: EventContext): Promise<Response> {
  const { request, next } = context
  const url = new URL(request.url)
  const path = url.pathname

  // 1. Static assets - serve from CDN, don't rewrite
  // Next.js build output, static files, images, fonts
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/assets/') ||
    path.startsWith('/static/') ||
    path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot)$/i)
  ) {
    // Pass through to CDN - fastest path
    return next()
  }

  // 2. API routes - pass to Next.js
  // Note: /api/cache-purge is handled by Pages Function at functions/api/cache-purge.ts
  // Cloudflare Pages routing will prioritize that specific function over this catch-all
  if (path.startsWith('/api/')) {
    return next()
  }

  // 3. Sitemap routes - pass through
  if (path.endsWith('-sitemap.xml') || path === '/sitemap.xml' || path === '/robots.txt') {
    return next()
  }

  // 4. Dynamic routes - rewrite to /index.html for Next.js SSR/ISR
  // This allows Next.js to handle dynamic [slug] routes with ISR
  if (!path.endsWith('.html') && path !== '/') {
    // Rewrite to index.html internally (not a redirect)
    const indexUrl = new URL('/', request.url)

    // Preserve original path in custom header for debugging
    const headers = new Headers(request.headers)
    headers.set('x-original-pathname', path)

    const newRequest = new Request(indexUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: request.redirect,
    })

    return next(newRequest)
  }

  // 5. Homepage and other .html files - standard Next.js handling
  return next()
}

// Configuration for Cloudflare Pages Functions
export const config = {
  // Match all routes
  path: '/*',
}
