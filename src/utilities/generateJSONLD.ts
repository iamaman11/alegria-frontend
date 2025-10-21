import type { Page, Post } from '../payload-types'

export function generatePageJSONLD(page: any) {
  if (!page) return null

  const url = page.slug ? `https://poshta.cloud/${page.slug}` : 'https://poshta.cloud'

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title || 'Untitled',
    url,
    ...(page.meta?.description && { description: page.meta.description }),
    ...(page.meta?.image &&
      typeof page.meta.image === 'object' &&
      'url' in page.meta.image && {
        image: {
          '@type': 'ImageObject',
          url: page.meta.image.url,
          ...(page.meta.image.width && { width: page.meta.image.width }),
          ...(page.meta.image.height && { height: page.meta.image.height }),
        },
      }),
  }
}

export function generatePostJSONLD(post: any) {
  if (!post) return null

  const url = post.slug ? `https://poshta.cloud/posts/${post.slug}` : 'https://poshta.cloud'

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title || 'Untitled',
    url,
    ...(post.meta?.description && { description: post.meta.description }),
    ...(post.publishedAt && { datePublished: post.publishedAt }),
    ...(post.updatedAt && { dateModified: post.updatedAt }),
    ...(post.meta?.image &&
      typeof post.meta.image === 'object' &&
      'url' in post.meta.image && {
        image: {
          '@type': 'ImageObject',
          url: post.meta.image.url,
          ...(post.meta.image.width && { width: post.meta.image.width }),
          ...(post.meta.image.height && { height: post.meta.image.height }),
        },
      }),
    publisher: {
      '@type': 'Organization',
      name: 'Payload Website Template',
      logo: {
        '@type': 'ImageObject',
        url: 'https://poshta.cloud/website-template-OG.webp',
      },
    },
  }
}


export function generateBreadcrumbsJSONLD(page: any) {
  if (!page) return null

  const customBreadcrumbs = (page as any)?.meta?.breadcrumbs
  if (customBreadcrumbs && Array.isArray(customBreadcrumbs) && customBreadcrumbs.length > 0) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: customBreadcrumbs.map((crumb: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.label,
        item: 'https://poshta.cloud' + crumb.url,
      })),
    }
  }

  const slug = page.slug || ''
  if (!slug) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://poshta.cloud',
        },
      ],
    }
  }

  const slugParts = slug.split('/').filter(Boolean)
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://poshta.cloud',
    },
  ]

  slugParts.forEach((part: string, index: number) => {
    const pathParts = slugParts.slice(0, index + 1)
    const url = 'https://poshta.cloud/' + pathParts.join('/')
    const name = part.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    items.push({
      '@type': 'ListItem',
      position: index + 2,
      name,
      item: url,
    })
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

export function generateOrganizationJSONLD(settings: any) {
  if (!settings?.organization) return null

  const org = settings.organization

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name || 'Poshta Cloud',
    url: org.url || 'https://poshta.cloud',
    ...(org.logo &&
      typeof org.logo === 'object' &&
      'url' in org.logo && {
        logo: {
          '@type': 'ImageObject',
          url: org.logo.url,
        },
      }),
    ...(org.description && { description: org.description }),
    ...(org.socialLinks &&
      Array.isArray(org.socialLinks) &&
      org.socialLinks.length > 0 && {
        sameAs: org.socialLinks.map((link: any) => link.url),
      }),
  }
}
