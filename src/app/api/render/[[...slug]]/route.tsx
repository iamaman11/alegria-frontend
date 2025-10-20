import { NextRequest, NextResponse } from 'next/server'
import { getPageBySlug } from '@/lib/api'
import { homeStatic } from '@/endpoints/seed/home-static'
import { renderToString } from 'react-dom/server'
import React from 'react'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  try {
    const { slug } = await params
    const pageSlug = slug?.[0] || 'home'

    console.log(`[API Render] Rendering page: ${pageSlug}`)

    let page = await getPageBySlug(pageSlug, false)

    // Fallback for home
    if (!page && pageSlug === 'home') {
      page = homeStatic
    }

    if (!page) {
      return new NextResponse('Page not found', { status: 404 })
    }

    // Render React components to HTML
    const articleHTML = renderToString(
      React.createElement(
        'article',
        { className: 'pt-16 pb-24' },
        React.createElement(RenderHero, { ...page.hero }),
        React.createElement(RenderBlocks, { blocks: page.layout })
      )
    )

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${page.title || pageSlug}</title>
  <meta name="description" content="${page.meta?.description || ''}" />
  <meta property="og:title" content="${page.title || pageSlug}" />
  <meta property="og:description" content="${page.meta?.description || ''}" />
  <meta property="og:type" content="website" />
  <link rel="stylesheet" href="/_next/static/css/global.css" />
</head>
<body>
  <div id="__next">
    ${articleHTML}
  </div>
  <script src="/_next/static/chunks/main.js" defer></script>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
        'x-opennext': '1',
        'x-nextjs-prerender': '1',
      },
    })
  } catch (error) {
    console.error(`[API Render] Error:`, error)
    return new NextResponse(
      `<!DOCTYPE html>
<html><head><title>Error</title></head>
<body><h1>Internal Server Error</h1><p>${error instanceof Error ? error.message : 'Unknown error'}</p></body>
</html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}
