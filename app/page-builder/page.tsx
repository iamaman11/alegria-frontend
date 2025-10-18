'use client'

import React, { useState, useCallback, useMemo } from 'react'
import styles from './page-builder.module.css'

// Types for page builder
interface ContentBlock {
  id: string
  type: 'heading' | 'text' | 'image' | 'form' | 'tabs' | 'features'
  content: Record<string, any>
  order: number
}

interface Page {
  id: string
  title: string
  slug: string
  blocks: ContentBlock[]
  published: boolean
}

// Sample block templates
const BLOCK_TEMPLATES = {
  heading: {
    type: 'heading',
    content: {
      text: 'New Section',
      level: 'h2'
    }
  },
  text: {
    type: 'text',
    content: {
      text: 'Enter your content here...'
    }
  },
  features: {
    type: 'features',
    content: {
      title: 'Features',
      items: [
        { title: 'Feature 1', description: 'Description...' },
        { title: 'Feature 2', description: 'Description...' },
        { title: 'Feature 3', description: 'Description...' }
      ]
    }
  },
  tabs: {
    type: 'tabs',
    content: {
      tabs: [
        { label: 'Tab 1', content: 'Content 1' },
        { label: 'Tab 2', content: 'Content 2' }
      ]
    }
  },
  form: {
    type: 'form',
    content: {
      title: 'Contact Form',
      fields: [
        { name: 'email', type: 'email', label: 'Email' },
        { name: 'message', type: 'textarea', label: 'Message' }
      ]
    }
  }
}

// Editor component for individual block
function BlockEditor({
  block,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}: {
  block: ContentBlock
  onUpdate: (block: ContentBlock) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className={styles.blockEditor}>
      <div className={styles.blockHeader}>
        <span className={styles.blockType}>{block.type.toUpperCase()}</span>
        <div className={styles.blockActions}>
          <button
            onClick={() => onMoveUp(block.id)}
            disabled={!canMoveUp}
            title="Move up"
            className={styles.iconButton}
          >
            ↑
          </button>
          <button
            onClick={() => onMoveDown(block.id)}
            disabled={!canMoveDown}
            title="Move down"
            className={styles.iconButton}
          >
            ↓
          </button>
          <button
            onClick={() => onDelete(block.id)}
            title="Delete"
            className={`${styles.iconButton} ${styles.danger}`}
          >
            ✕
          </button>
        </div>
      </div>

      <div className={styles.blockContent}>
        {block.type === 'heading' && (
          <>
            <label>
              <span>Heading Text</span>
              <input
                type="text"
                value={block.content.text || ''}
                onChange={(e) =>
                  onUpdate({
                    ...block,
                    content: { ...block.content, text: e.target.value }
                  })
                }
                placeholder="Enter heading text"
              />
            </label>
            <label>
              <span>Level</span>
              <select
                value={block.content.level || 'h2'}
                onChange={(e) =>
                  onUpdate({
                    ...block,
                    content: { ...block.content, level: e.target.value }
                  })
                }
              >
                <option value="h1">H1</option>
                <option value="h2">H2</option>
                <option value="h3">H3</option>
              </select>
            </label>
          </>
        )}

        {block.type === 'text' && (
          <label>
            <span>Text Content</span>
            <textarea
              value={block.content.text || ''}
              onChange={(e) =>
                onUpdate({
                  ...block,
                  content: { ...block.content, text: e.target.value }
                })
              }
              placeholder="Enter text content"
              rows={4}
            />
          </label>
        )}

        {block.type === 'features' && (
          <>
            <label>
              <span>Section Title</span>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) =>
                  onUpdate({
                    ...block,
                    content: { ...block.content, title: e.target.value }
                  })
                }
              />
            </label>
            <div className={styles.featuresList}>
              {block.content.items?.map((item: any, idx: number) => (
                <div key={idx} className={styles.featureItem}>
                  <input
                    type="text"
                    placeholder="Feature title"
                    value={item.title || ''}
                    onChange={(e) => {
                      const items = [...block.content.items]
                      items[idx].title = e.target.value
                      onUpdate({
                        ...block,
                        content: { ...block.content, items }
                      })
                    }}
                  />
                  <textarea
                    placeholder="Feature description"
                    value={item.description || ''}
                    onChange={(e) => {
                      const items = [...block.content.items]
                      items[idx].description = e.target.value
                      onUpdate({
                        ...block,
                        content: { ...block.content, items }
                      })
                    }}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {block.type === 'tabs' && (
          <div className={styles.tabsList}>
            {block.content.tabs?.map((tab: any, idx: number) => (
              <div key={idx} className={styles.tabItem}>
                <input
                  type="text"
                  placeholder="Tab label"
                  value={tab.label || ''}
                  onChange={(e) => {
                    const tabs = [...block.content.tabs]
                    tabs[idx].label = e.target.value
                    onUpdate({
                      ...block,
                      content: { ...block.content, tabs }
                    })
                  }}
                />
                <textarea
                  placeholder="Tab content"
                  value={tab.content || ''}
                  onChange={(e) => {
                    const tabs = [...block.content.tabs]
                    tabs[idx].content = e.target.value
                    onUpdate({
                      ...block,
                      content: { ...block.content, tabs }
                    })
                  }}
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Preview component
function BlockPreview({ block }: { block: ContentBlock }) {
  const HeadingTag = (block.content.level || 'h2') as any

  return (
    <div className={styles.blockPreview}>
      {block.type === 'heading' && (
        <HeadingTag className={styles.previewHeading}>
          {block.content.text || 'Heading'}
        </HeadingTag>
      )}

      {block.type === 'text' && (
        <p className={styles.previewText}>{block.content.text}</p>
      )}

      {block.type === 'features' && (
        <div className={styles.previewFeatures}>
          {block.content.title && (
            <h3 className={styles.previewFeaturesTitle}>{block.content.title}</h3>
          )}
          <div className={styles.featureGrid}>
            {block.content.items?.map((item: any, idx: number) => (
              <div key={idx} className={styles.featureCard}>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {block.type === 'tabs' && (
        <div className={styles.previewTabs}>
          <div className={styles.tabsHeader}>
            {block.content.tabs?.map((tab: any, idx: number) => (
              <button key={idx} className={styles.tabButton}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className={styles.tabsContent}>
            {block.content.tabs?.[0]?.content}
          </div>
        </div>
      )}

      {block.type === 'form' && (
        <form className={styles.previewForm}>
          <h3>{block.content.title}</h3>
          {block.content.fields?.map((field: any, idx: number) => (
            <div key={idx} className={styles.formField}>
              <label>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea placeholder={field.label} />
              ) : (
                <input type={field.type} placeholder={field.label} />
              )}
            </div>
          ))}
          <button type="submit" className={styles.submitButton}>
            Submit
          </button>
        </form>
      )}
    </div>
  )
}

// Main page builder component
export default function PageBuilder() {
  const [page, setPage] = useState<Page>({
    id: 'page-1',
    title: 'My Page',
    slug: 'my-page',
    blocks: [
      {
        id: 'block-1',
        ...BLOCK_TEMPLATES.heading,
        content: { text: 'Welcome to Page Builder', level: 'h1' },
        order: 0
      },
      {
        id: 'block-2',
        ...BLOCK_TEMPLATES.text,
        content: { text: 'Create and manage your pages with an interactive interface.' },
        order: 1
      }
    ],
    published: false
  })

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  const selectedBlock = useMemo(
    () => page.blocks.find((b) => b.id === selectedBlockId),
    [page.blocks, selectedBlockId]
  )

  const handleAddBlock = useCallback(
    (blockType: keyof typeof BLOCK_TEMPLATES) => {
      const template = BLOCK_TEMPLATES[blockType]
      const newBlock: ContentBlock = {
        id: `block-${Date.now()}`,
        ...template,
        order: page.blocks.length
      }
      setPage((prev) => ({
        ...prev,
        blocks: [...prev.blocks, newBlock]
      }))
      setSelectedBlockId(newBlock.id)
    },
    [page.blocks.length]
  )

  const handleUpdateBlock = useCallback((updatedBlock: ContentBlock) => {
    setPage((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === updatedBlock.id ? updatedBlock : b
      )
    }))
  }, [])

  const handleDeleteBlock = useCallback((blockId: string) => {
    setPage((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== blockId).map((b, idx) => ({
        ...b,
        order: idx
      }))
    }))
    setSelectedBlockId(null)
  }, [])

  const handleMoveBlock = useCallback(
    (blockId: string, direction: 'up' | 'down') => {
      const idx = page.blocks.findIndex((b) => b.id === blockId)
      if (
        (direction === 'up' && idx > 0) ||
        (direction === 'down' && idx < page.blocks.length - 1)
      ) {
        const newBlocks = [...page.blocks]
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        ;[newBlocks[idx], newBlocks[swapIdx]] = [
          newBlocks[swapIdx],
          newBlocks[idx]
        ]
        setPage((prev) => ({
          ...prev,
          blocks: newBlocks
        }))
      }
    },
    [page.blocks]
  )

  const handlePublish = useCallback(async () => {
    try {
      // TODO: Implement API call to save page to Payload CMS
      console.log('Publishing page:', page)
      alert('Page published successfully!')
    } catch (error) {
      console.error('Failed to publish:', error)
      alert('Failed to publish page')
    }
  }, [page])

  const blockIdx = page.blocks.findIndex((b) => b.id === selectedBlockId)

  return (
    <div className={styles.pageBuilder}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Page Builder</h1>
          <div className={styles.pageInfo}>
            <input
              type="text"
              value={page.title}
              onChange={(e) =>
                setPage((prev) => ({ ...prev, title: e.target.value }))
              }
              className={styles.pageTitle}
              placeholder="Page title"
            />
            <input
              type="text"
              value={page.slug}
              onChange={(e) =>
                setPage((prev) => ({ ...prev, slug: e.target.value }))
              }
              className={styles.pageSlug}
              placeholder="page-slug"
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.toggleButton}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button className={styles.publishButton} onClick={handlePublish}>
            Publish
          </button>
        </div>
      </header>

      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3>Add Blocks</h3>
            <div className={styles.blockTemplates}>
              {Object.entries(BLOCK_TEMPLATES).map(([key]) => (
                <button
                  key={key}
                  className={styles.templateButton}
                  onClick={() =>
                    handleAddBlock(key as keyof typeof BLOCK_TEMPLATES)
                  }
                >
                  + {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <h3>Blocks ({page.blocks.length})</h3>
            <div className={styles.blocksList}>
              {page.blocks.map((block, idx) => (
                <button
                  key={block.id}
                  className={`${styles.blockItem} ${
                    selectedBlockId === block.id ? styles.active : ''
                  }`}
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  <span className={styles.blockType}>{block.type}</span>
                  <span className={styles.blockOrder}>{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className={styles.mainContent}>
          {selectedBlock ? (
            <div className={styles.editorContainer}>
              <BlockEditor
                block={selectedBlock}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
                onMoveUp={() => handleMoveBlock(selectedBlock.id, 'up')}
                onMoveDown={() => handleMoveBlock(selectedBlock.id, 'down')}
                canMoveUp={blockIdx > 0}
                canMoveDown={blockIdx < page.blocks.length - 1}
              />
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>Select a block to edit or add a new one</p>
            </div>
          )}
        </main>

        {showPreview && (
          <aside className={styles.preview}>
            <h3>Preview</h3>
            <div className={styles.previewContent}>
              <h1 className={styles.previewPageTitle}>{page.title}</h1>
              {page.blocks.map((block) => (
                <BlockPreview key={block.id} block={block} />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
