import type { Metadata } from 'next'

// Test page with 1-minute revalidation
export const revalidate = 60
export const dynamicParams = true

export async function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: 'test-slug' },
  ]
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Test Page ${id}`,
    description: `This is test page ${id}`,
  }
}

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <article className="pt-16 pb-16">
      <div className="container">
        <h1 className="text-4xl font-bold mb-4">Test Dynamic Page</h1>
        <p className="text-xl mb-4">ID: {id}</p>
        <p>If you see this page, dynamic routing is working on Cloudflare Pages!</p>
        <p className="mt-4 text-sm text-gray-600">
          Timestamp: {new Date().toISOString()}
        </p>
      </div>
    </article>
  )
}
