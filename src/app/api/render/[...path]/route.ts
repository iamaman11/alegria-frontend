import { NextRequest, NextResponse } from 'next/server'

/**
 * Dynamic Render API for Cloudflare Pages
 *
 * This API route works around OpenNext limitation where App Router dynamic routes
 * fail to compile on Cloudflare Pages. API routes always compile regardless.
 *
 * URL: /api/render/posts/slug-name -> renders /posts/slug-name
 * URL: /api/render/test/123 -> renders /test/123
 */

export const revalidate = 604800 // 7 days ISR

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const pathStr = path?.join('/') || ''

    // Reconstruct the original request URL
    const originalPath = '/' + pathStr

    console.log(`[API Render] Processing dynamic render for: ${originalPath}`)

    // For /posts/* routes - fetch from API and render
    if (path?.[0] === 'posts' && path.length >= 2) {
      const slug = path.slice(1).join('/')
      return await handlePostRender(slug, originalPath)
    }

    // For /test/* routes - render test page
    if (path?.[0] === 'test' && path.length >= 2) {
      const id = path.slice(1).join('/')
      return await handleTestRender(id, originalPath)
    }

    // Fallback
    return renderErrorPage('Invalid path', 404)
  } catch (error) {
    console.error('[API Render] Error:', error)
    return renderErrorPage(String(error), 500)
  }
}

async function handlePostRender(slug: string, originalPath: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.poshta.cloud'

    // Fetch post data from CMS
    const response = await fetch(`${apiUrl}/api/posts?where[slug][equals]=${slug}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return renderErrorPage(`Post not found: ${slug}`, 404)
    }

    const data = await response.json()
    const post = data.docs?.[0]

    if (!post) {
      return renderErrorPage(`Post not found: ${slug}`, 404)
    }

    // Return ISR-cached HTML response
    const html = buildPostHTML(post)
    const cacheHeaders = {
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
      'Content-Type': 'text/html; charset=utf-8',
    }

    return new NextResponse(html, { status: 200, headers: cacheHeaders })
  } catch (error) {
    console.error('[handlePostRender] Error:', error)
    return renderErrorPage(`Failed to render post: ${error}`, 500)
  }
}

async function handleTestRender(id: string, originalPath: string) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Page ${id}</title>
  <meta name="description" content="This is test page ${id}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 1024px; margin: 0 auto; padding: 4rem 1rem; }
    h1 { font-size: 2.25rem; font-weight: bold; margin-bottom: 1rem; }
    p { margin-bottom: 1rem; }
    .success { color: #10b981; }
    .meta { color: #999; font-size: 0.875rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <article class="container">
    <h1>Test Dynamic Page</h1>
    <p>ID: <strong>${id}</strong></p>
    <p class="success">✓ Dynamic routing is working on Cloudflare Pages!</p>
    <p>This page is generated on-demand and cached via ISR.</p>
    <p class="meta">Rendered: ${new Date().toISOString()}</p>
  </article>
</body>
</html>
  `

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
    'Content-Type': 'text/html; charset=utf-8',
  }

  return new NextResponse(html, { status: 200, headers: cacheHeaders })
}

function buildPostHTML(post: any) {
  const title = post.title || 'Untitled'
  const excerpt = post.excerpt || ''
  const content = post.content || ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(excerpt)}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; }
    .container { max-width: 768px; margin: 0 auto; padding: 4rem 1rem; background: white; }
    h1 { font-size: 2.25rem; font-weight: bold; margin-bottom: 1rem; }
    p { margin-bottom: 1rem; }
    .excerpt { font-size: 1.125rem; color: #666; margin-bottom: 2rem; }
    .meta { color: #999; font-size: 0.875rem; margin-top: 2rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
  </style>
</head>
<body>
  <article class="container">
    <h1>${escapeHtml(title)}</h1>
    <p class="excerpt">${escapeHtml(excerpt)}</p>
    <div>${content}</div>
    <div class="meta">
      <p>Post rendered via ISR: ${new Date().toISOString()}</p>
      <p>Cache revalidates every 7 days</p>
    </div>
  </article>
</body>
</html>
  `
}

function renderErrorPage(message: string, status: number) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${status} Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #333; background: #f9fafb; }
    .container { max-width: 512px; margin: 0 auto; padding: 4rem 1rem; text-align: center; }
    h1 { font-size: 3rem; font-weight: bold; margin-bottom: 1rem; color: #ef4444; }
    p { color: #666; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${status}</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>
  `

  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
