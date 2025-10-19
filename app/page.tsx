import { Metadata } from 'next'

// Revalidate every 60 seconds (ISR)
export const revalidate = 60
export const dynamicParams = true

export const metadata: Metadata = {
  title: 'Poshta - Content Management',
  description: 'Welcome to Poshta - Your content management platform',
}

async function getHomePage() {
  try {
    const apiUrl = 'https://api.poshta.cloud'
    const endpoint = `${apiUrl}/api/pages/home`

    const res = await fetch(endpoint, {
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      console.error('[HomePage] API error:', res.status, res.statusText)
      return null
    }

    const data = await res.json()
    return data.docs?.[0] || data
  } catch (err) {
    console.error('[HomePage] Error fetching page:', err)
    return null
  }
}

interface Block {
  blockType: string
  blockName?: string
  blockId?: string
  headingText?: string
  headingLevel?: string
  textContent?: any
  richContent?: any
  featuresTitle?: string
  features?: Array<{
    icon?: string
    title: string
    description?: string
  }>
  tabs?: Array<{
    label: string
    content: any
  }>
  formTitle?: string
  formDescription?: string
  formFields?: Array<{
    fieldName: string
    fieldLabel: string
    fieldType: string
    required: boolean
    placeholder?: string
  }>
  formSubmitLabel?: string
}

interface Page {
  id: string
  title: string
  slug: string
  description?: string
  layout: Block[]
  _status: string
}

export default async function HomePage() {
  const page = await getHomePage()

  if (!page) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Welcome to Poshta</h1>
        <p>Home page is loading. Please check back soon.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1>{page.title}</h1>
        {page.description && <p style={{ color: '#666' }}>{page.description}</p>}
      </header>

      <main>
        {page.layout && page.layout.length > 0 ? (
          page.layout.map((block: Block, idx: number) => (
            <div key={`${block.blockId || idx}`} style={{ marginBottom: '2rem' }}>
              {block.blockType === 'heading' && (
                <h2>{block.headingText}</h2>
              )}
              {block.blockType === 'text' && (
                <p>{JSON.stringify(block.textContent)}</p>
              )}
              {block.blockType === 'features' && (
                <div>
                  {block.featuresTitle && <h3>{block.featuresTitle}</h3>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    {block.features?.map((feature, i) => (
                      <div key={i} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
                        <h4>{feature.title}</h4>
                        {feature.description && <p>{feature.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p>No content available for this page.</p>
        )}
      </main>
    </div>
  )
}
