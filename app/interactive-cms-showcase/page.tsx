'use client'

import React, { useState, useMemo } from 'react'
import styles from './showcase.module.css'

// Types
interface UseCase {
  id: string
  title: string
  description: string
  icon: string
  features: string[]
  color: string
}

interface Testimonial {
  author: string
  company: string
  text: string
  image: string
}

// Data
const USE_CASES: UseCase[] = [
  {
    id: 'headless-cms',
    title: 'Headless CMS',
    description: 'Decouple your content from presentation and build omnichannel experiences',
    icon: '📰',
    features: [
      'Content versioning',
      'Multi-language support',
      'API-first architecture',
      'Custom content models'
    ],
    color: '#667eea'
  },
  {
    id: 'digital-assets',
    title: 'Digital Asset Management',
    description: 'Centralize and manage all your media files in one place',
    icon: '🖼️',
    features: [
      'Auto image optimization',
      'Batch uploads',
      'Asset organization',
      'CDN integration'
    ],
    color: '#764ba2'
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce Platform',
    description: 'Power your online store with flexible product management',
    icon: '🛍️',
    features: [
      'Product catalogs',
      'Inventory management',
      'Order tracking',
      'Payment integration'
    ],
    color: '#f093fb'
  },
  {
    id: 'app-builder',
    title: 'Enterprise App Builder',
    description: 'Build complex applications without traditional backend setup',
    icon: '⚙️',
    features: [
      'Custom workflows',
      'User management',
      'Data relationships',
      'API endpoints'
    ],
    color: '#4facfe'
  }
]

const TESTIMONIALS: Testimonial[] = [
  {
    author: 'Sarah Johnson',
    company: 'TechStart Inc',
    text: 'Payload has completely transformed how we manage content. The API-first approach is exactly what our team needed.',
    image: '👩‍💼'
  },
  {
    author: 'Michael Chen',
    company: 'Digital Agency Pro',
    text: 'The ease of customization is unmatched. We can build client solutions 3x faster than with traditional CMS platforms.',
    image: '👨‍💻'
  },
  {
    author: 'Emma Rodriguez',
    company: 'Global Retail Co',
    text: 'Best decision we made. The multi-tenant capabilities alone have saved us thousands in infrastructure costs.',
    image: '👩‍🔬'
  }
]

// Feature comparison data
const FEATURES_COMPARISON = [
  { name: 'API-First', payload: true, wordpress: false, contentful: true, sanity: true },
  { name: 'Self-Hosted', payload: true, wordpress: true, contentful: false, sanity: false },
  { name: 'Open Source', payload: true, wordpress: true, contentful: false, sanity: false },
  { name: 'Headless', payload: true, wordpress: false, contentful: true, sanity: true },
  { name: 'Multi-Tenancy', payload: true, wordpress: false, contentful: false, sanity: false },
  { name: 'Custom Fields', payload: true, wordpress: true, contentful: true, sanity: true }
]

// Tab component with smooth animations
function TabPanel({
  tabs,
  activeTab,
  onTabChange
}: {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>
  activeTab: string
  onTabChange: (tabId: string) => void
}) {
  return (
    <div className={styles.tabContainer}>
      <div className={styles.tabsHeader}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${
              activeTab === tab.id ? styles.active : ''
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  )
}

// Feature card component
function FeatureCard({
  useCase,
  onClick
}: {
  useCase: UseCase
  onClick: () => void
}) {
  return (
    <div
      className={styles.featureCard}
      onClick={onClick}
      style={{ '--card-color': useCase.color } as any}
    >
      <div className={styles.cardIcon}>{useCase.icon}</div>
      <h3>{useCase.title}</h3>
      <p>{useCase.description}</p>
      <ul className={styles.featureList}>
        {useCase.features.slice(0, 2).map((feature, idx) => (
          <li key={idx}>✓ {feature}</li>
        ))}
      </ul>
      <button className={styles.learnMore}>Learn More →</button>
    </div>
  )
}

// Testimonial card
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className={styles.testimonialCard}>
      <div className={styles.testimonialImage}>{testimonial.image}</div>
      <p className={styles.testimonialText}>"{testimonial.text}"</p>
      <div className={styles.testimonialAuthor}>
        <strong>{testimonial.author}</strong>
        <span>{testimonial.company}</span>
      </div>
    </div>
  )
}

// Contact form with validation
function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', company: '', message: '' })
    }, 2000)
  }

  return (
    <form className={styles.contactForm} onSubmit={handleSubmit}>
      {submitted && (
        <div className={styles.successMessage}>
          Thank you! We'll be in touch soon.
        </div>
      )}
      <div className={styles.formGroup}>
        <label>Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your name"
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your@email.com"
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label>Company</label>
        <input
          type="text"
          name="company"
          value={formData.company}
          onChange={handleChange}
          placeholder="Your company"
        />
      </div>
      <div className={styles.formGroup}>
        <label>Message</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Tell us about your needs..."
          rows={4}
          required
        />
      </div>
      <button type="submit" className={styles.submitButton}>
        Send Message
      </button>
    </form>
  )
}

// Modal component
function Modal({
  isOpen,
  onClose,
  title,
  children
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

// Main showcase component
export default function InteractiveCMSShowcase() {
  const [activeTab, setActiveTab] = useState('usecases')
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [testimonialIndex, setTestimonialIndex] = useState(0)

  const tabs = [
    {
      id: 'usecases',
      label: 'Use Cases',
      content: (
        <div className={styles.useCasesGrid}>
          {USE_CASES.map((useCase) => (
            <FeatureCard
              key={useCase.id}
              useCase={useCase}
              onClick={() => setSelectedUseCase(useCase)}
            />
          ))}
        </div>
      )
    },
    {
      id: 'testimonials',
      label: 'Testimonials',
      content: (
        <div className={styles.testimonialsSection}>
          <div className={styles.testimonialSlider}>
            {TESTIMONIALS.map((testimonial, idx) => (
              <div
                key={idx}
                className={`${styles.testimonialSlide} ${
                  idx === testimonialIndex ? styles.active : ''
                }`}
              >
                <TestimonialCard testimonial={testimonial} />
              </div>
            ))}
          </div>
          <div className={styles.sliderControls}>
            <button
              onClick={() =>
                setTestimonialIndex(
                  (prev) =>
                    (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length
                )
              }
              className={styles.sliderButton}
            >
              ← Previous
            </button>
            <span className={styles.sliderIndicator}>
              {testimonialIndex + 1} / {TESTIMONIALS.length}
            </span>
            <button
              onClick={() =>
                setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length)
              }
              className={styles.sliderButton}
            >
              Next →
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'comparison',
      label: 'CMS Comparison',
      content: (
        <div className={styles.comparisonTable}>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Payload</th>
                <th>WordPress</th>
                <th>Contentful</th>
                <th>Sanity</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES_COMPARISON.map((row) => (
                <tr key={row.name}>
                  <td className={styles.featureName}>{row.name}</td>
                  <td>
                    {row.payload ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.cross}>✗</span>
                    )}
                  </td>
                  <td>
                    {row.wordpress ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.cross}>✗</span>
                    )}
                  </td>
                  <td>
                    {row.contentful ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.cross}>✗</span>
                    )}
                  </td>
                  <td>
                    {row.sanity ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.cross}>✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  ]

  return (
    <div className={styles.showcase}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Payload CMS Interactive Showcase</h1>
          <p>
            Discover how Payload can power your next-generation content platform
          </p>
        </div>
        <button
          className={styles.ctaButton}
          onClick={() => setShowContactModal(true)}
        >
          Get Started
        </button>
      </header>

      {/* Hero section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h2>Build with the CMS You Control</h2>
          <div className={styles.heroFeatures}>
            <div className={styles.heroFeature}>
              <span className={styles.heroIcon}>🚀</span>
              <h3>API-First</h3>
              <p>Built for developers who want full control</p>
            </div>
            <div className={styles.heroFeature}>
              <span className={styles.heroIcon}>🔓</span>
              <h3>Open Source</h3>
              <p>Modify and extend exactly as you need</p>
            </div>
            <div className={styles.heroFeature}>
              <span className={styles.heroIcon}>⚡</span>
              <h3>Fast</h3>
              <p>Lightning-quick content delivery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main content with tabs */}
      <section className={styles.main}>
        <TabPanel
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </section>

      {/* Newsletter subscription */}
      <section className={styles.newsletter}>
        <h2>Stay Updated</h2>
        <p>Get the latest news about Payload and content management best practices</p>
        <div className={styles.newsletterForm}>
          <input type="email" placeholder="your@email.com" />
          <button className={styles.subscribeButton}>Subscribe</button>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <h2>Ready to transform your content infrastructure?</h2>
        <div className={styles.ctaButtons}>
          <button
            className={styles.primaryButton}
            onClick={() => setShowContactModal(true)}
          >
            Schedule a Demo
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => setShowComparisonModal(true)}
          >
            View Full Comparison
          </button>
        </div>
      </section>

      {/* Modals */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Get Started with Payload"
      >
        <ContactForm />
      </Modal>

      <Modal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        title="Full CMS Comparison"
      >
        <div className={styles.comparisonTable}>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Payload</th>
                <th>WordPress</th>
                <th>Contentful</th>
                <th>Sanity</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES_COMPARISON.map((row) => (
                <tr key={row.name}>
                  <td className={styles.featureName}>{row.name}</td>
                  <td>
                    {row.payload ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.cross}>✗</span>
                    )}
                  </td>
                  <td>
                    {row.wordpress ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.cross}>✗</span>
                    )}
                  </td>
                  <td>
                    {row.contentful ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.cross}>✗</span>
                    )}
                  </td>
                  <td>
                    {row.sanity ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.cross}>✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Detail modal for selected use case */}
      {selectedUseCase && (
        <Modal
          isOpen={!!selectedUseCase}
          onClose={() => setSelectedUseCase(null)}
          title={selectedUseCase.title}
        >
          <div className={styles.useCaseDetail}>
            <p className={styles.useCaseDescription}>
              {selectedUseCase.description}
            </p>
            <h3>Key Features</h3>
            <ul className={styles.detailFeatures}>
              {selectedUseCase.features.map((feature, idx) => (
                <li key={idx}>✓ {feature}</li>
              ))}
            </ul>
            <button
              className={styles.primaryButton}
              onClick={() => {
                setSelectedUseCase(null)
                setShowContactModal(true)
              }}
            >
              Get Started
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
