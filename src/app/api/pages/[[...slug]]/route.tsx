import { NextRequest, NextResponse } from 'next/server'
import { getPageBySlug } from '@/lib/api'
import { homeStatic } from '@/endpoints/seed/home-static'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await params
  const pageSlug = slug?.[0] || 'home'

  try {
    let page = await getPageBySlug(pageSlug, false)

    // Fallback for home
    if (!page && pageSlug === 'home') {
      page = homeStatic
    }

    if (!page) {
      return NextResponse.json(
        {
          error: 'Page not found',
          page: pageSlug
        },
        { status: 404 }
      )
    }

    return NextResponse.json(page, {
      headers: {
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
      },
    })
  } catch (error) {
    console.error(`[API] Error fetching page "${pageSlug}":`, error)
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    )
  }
}
