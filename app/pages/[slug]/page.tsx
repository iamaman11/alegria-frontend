import React from 'react'
import { Metadata } from 'next'
import styles from './page.module.css'
import { getPageBySlug } from '@/lib/api'

// ФАЗА 3: Hybrid ISR approach
// - PRIMARY: Webhook-based cache invalidation (on-demand, 1-3 seconds)
// - FALLBACK: Time-based revalidation (7 days as safety net)
// - dynamicParams=true: New pages generate on-demand without rebuild
export const revalidate = 604800 // 7 days fallback
export const dynamicParams = true

interface Block {
  id?: string
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

async function getPage(slug: string): Promise<Page | null> {
  try {
    // Use lib/api with depth=2 to get full data including blocks and media
    return await getPageBySlug(slug, false, {
      next: { revalidate: 60 }, // Revalidate cache every 60 seconds
    })
  } catch (err) {
    console.error('[PageView] Error fetching page:', err)
    return null
  }
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const page = await getPage(params.slug)

  if (!page) {
    return {
      title: 'Page not found',
      description: 'The page you are looking for does not exist.',
    }
  }

  return {
    title: page.title || 'Poshta',
    description: page.description || 'Poshta - Content Management Platform',
    openGraph: {
      title: page.title,
      description: page.description || '',
      url: `https://poshta.cloud/pages/${params.slug}`,
      type: 'website',
    },
  }
}

// Component to render block based on type
function BlockRenderer({ block }: { block: Block }) {
  const HeadingTag = (block.headingLevel || 'h2') as any

  switch (block.blockType) {
    case 'heading':
      return (
        <div className={styles.headingBlock}>
          <HeadingTag>{block.headingText}</HeadingTag>
        </div>
      )

    case 'text':
      return (
        <div className={styles.textBlock}>
          {block.textContent && renderRichText(block.textContent)}
        </div>
      )

    case 'richtext':
      return (
        <div className={styles.richtextBlock}>
          {block.richContent && renderRichText(block.richContent)}
        </div>
      )

    case 'features':
      return (
        <div className={styles.featuresBlock}>
          {block.featuresTitle && <h2>{block.featuresTitle}</h2>}
          <div className={styles.featuresGrid}>
            {block.features?.map((feature, idx) => (
              <div key={idx} className={styles.featureItem}>
                {feature.icon && (
                  <div className={styles.featureIcon}>{feature.icon}</div>
                )}
                <h3>{feature.title}</h3>
                {feature.description && <p>{feature.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )

    case 'content':
    default:
      return null
  }
}

// Render rich text content
function renderRichText(content: any): React.ReactNode {
  if (!content) return null

  if (content.root?.children) {
    return content.root.children.map((node: any, idx: number) => {
      switch (node.type) {
        case 'heading':
          const HeadingTag = (node.tag || 'h2') as any
          return (
            <HeadingTag key={idx} className={styles.richHeading}>
              {node.children?.[0]?.text}
            </HeadingTag>
          )
        case 'paragraph':
          return (
            <p key={idx} className={styles.richParagraph}>
              {node.children?.[0]?.text}
            </p>
          )
        case 'list':
          const ListTag = node.tag === 'ol' ? 'ol' : 'ul'
          return (
            <ListTag key={idx} className={styles.richList}>
              {node.children?.map((item: any, i: number) => (
                <li key={i}>{item.children?.[0]?.children?.[0]?.text}</li>
              ))}
            </ListTag>
          )
        case 'quote':
          return (
            <blockquote key={idx} className={styles.richQuote}>
              {node.children?.[0]?.text}
            </blockquote>
          )
        default:
          return null
      }
    })
  }

  return <p>{JSON.stringify(content)}</p>
}

// Main page component - Server Component (not Client Component)
export default async function PageView({
  params,
}: {
  params: { slug: string }
}) {
  const page = await getPage(params.slug)

  if (!page) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>404 - Page not found</h1>
        <p>The page you are looking for does not exist.</p>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>{page.title}</h1>
        {page.description && <p className={styles.description}>{page.description}</p>}
      </header>

      <main className={styles.pageContent}>
        {page.layout && page.layout.length > 0 ? (
          page.layout.map((block, idx) => (
            <div key={`${block.id || block.blockId || idx}`} className={styles.block}>
              <BlockRenderer block={block} />
            </div>
          ))
        ) : (
          <p className={styles.noContent}>No content available for this page.</p>
        )}
      </main>
    </div>
  )
}
