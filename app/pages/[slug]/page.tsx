'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import styles from './page.module.css'

interface Block {
  blockType: string
  blockName?: string
  blockId?: string
  // Heading block
  headingText?: string
  headingLevel?: string
  // Text block
  textContent?: any
  // Rich text block
  richContent?: any
  // Features block
  featuresTitle?: string
  features?: Array<{
    icon?: string
    title: string
    description?: string
  }>
  // Tabs block
  tabs?: Array<{
    label: string
    content: any
  }>
  // Form block
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

    case 'tabs':
      return (
        <TabsComponent tabs={block.tabs || []} />
      )

    case 'form':
      return (
        <FormComponent
          title={block.formTitle}
          description={block.formDescription}
          fields={block.formFields || []}
          submitLabel={block.formSubmitLabel || 'Submit'}
        />
      )

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

// Tabs component
function TabsComponent({ tabs }: { tabs: Array<{ label: string; content: any }> }) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className={styles.tabsBlock}>
      <div className={styles.tabsHeader}>
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={`${styles.tabButton} ${
              activeTab === idx ? styles.active : ''
            }`}
            onClick={() => setActiveTab(idx)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {tabs[activeTab] && renderRichText(tabs[activeTab].content)}
      </div>
    </div>
  )
}

// Form component
function FormComponent({
  title,
  description,
  fields,
  submitLabel,
}: {
  title?: string
  description?: string
  fields: any[]
  submitLabel: string
}) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({})
    }, 2000)
  }

  return (
    <div className={styles.formBlock}>
      {title && <h2>{title}</h2>}
      {description && <p className={styles.formDescription}>{description}</p>}

      <form onSubmit={handleSubmit} className={styles.form}>
        {submitted && (
          <div className={styles.successMessage}>
            Thank you! Your message has been sent.
          </div>
        )}

        {fields.map((field) => (
          <div key={field.fieldName} className={styles.formField}>
            <label htmlFor={field.fieldName}>{field.fieldLabel}</label>
            {field.fieldType === 'textarea' ? (
              <textarea
                id={field.fieldName}
                name={field.fieldName}
                value={formData[field.fieldName] || ''}
                onChange={handleChange}
                placeholder={field.placeholder}
                required={field.required}
                rows={4}
              />
            ) : (
              <input
                id={field.fieldName}
                type={field.fieldType}
                name={field.fieldName}
                value={formData[field.fieldName] || ''}
                onChange={handleChange}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
          </div>
        ))}

        <button type="submit" className={styles.submitButton}>
          {submitLabel}
        </button>
      </form>
    </div>
  )
}

// Main page component
export default function PageView({
  params,
}: {
  params: { slug: string }
}) {
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPage() {
      try {
        // Validate and construct API URL with fallbacks
        const getApiUrl = (): string => {
          // Primary: use NEXT_PUBLIC_API_URL
          const primaryUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
          if (primaryUrl && isValidUrl(primaryUrl)) {
            return primaryUrl
          }

          // Fallback 1: try Workers API on current domain
          if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin
            if (isValidUrl(currentOrigin)) {
              return currentOrigin
            }
          }

          // Fallback 2: use default Workers API
          return 'https://api.poshta.cloud'
        }

        const isValidUrl = (url: string): boolean => {
          if (!url) return false
          try {
            new URL(url)
            return true
          } catch {
            return false
          }
        }

        const apiUrl = getApiUrl()
        const endpoint = `${apiUrl}/api/pages/${encodeURIComponent(params.slug)}`

        // Log for debugging
        console.log('[PageView] Fetching from:', endpoint)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

        const res = await fetch(endpoint, {
          signal: controller.signal,
          next: { revalidate: 60 }, // ISR - revalidate every 60 seconds
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          // Provide helpful error messages
          if (res.status === 404) {
            setError('Page not found')
            setLoading(false)
            return
          }
          throw new Error(`API error: ${res.status} ${res.statusText}`)
        }

        const data = await res.json()

        // Workers returns single page directly, not wrapped in docs array
        const foundPage = data.docs?.[0] || data

        if (!foundPage || !foundPage.id) {
          setError('Page data is invalid or missing')
          setLoading(false)
          return
        }

        setPage(foundPage)
        console.log('[PageView] Page loaded successfully:', foundPage.title)
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.error('[PageView] Request timeout')
            setError('Page load timeout - the server is not responding')
          } else {
            console.error('[PageView] Error fetching page:', err.message)
            setError(err.message)
          }
        } else {
          console.error('[PageView] Unknown error:', err)
          setError('An unexpected error occurred')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPage()
  }, [params.slug])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}>Loading...</div>
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className={styles.errorContainer}>
        <h1>Page not found</h1>
        <p>{error || 'The page you are looking for does not exist.'}</p>
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
            <div key={`${block.blockId || idx}`} className={styles.block}>
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
