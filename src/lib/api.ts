// ============================================
// API CLIENT for Payload CMS via Workers
// ============================================
// Architecture: Frontend -> Workers API -> Payload CMS (Vercel)
// Workers provide caching layer (KV + D1) for optimal performance

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.poshta.cloud';

// ============================================
// TYPE DEFINITIONS from Payload Collections
// ============================================

export interface Post {
  id: string;
  title: string;
  slug: string;
  heroImage?: Media;
  content: any; // Lexical JSON
  relatedPosts?: Post[];
  categories?: Category[];
  meta?: {
    title?: string;
    description?: string;
    image?: Media;
  };
  publishedAt?: string;
  authors?: User[];
  populatedAuthors?: Array<{
    id: string;
    name: string;
  }>;
  _status?: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  hero?: {
    type: 'highImpact' | 'mediumImpact' | 'lowImpact' | 'none';
    richText?: any;
    links?: Array<{
      link: {
        type: 'reference' | 'custom';
        label: string;
        url?: string;
        reference?: {
          relationTo: string;
          value: string | Page | Post;
        };
      };
    }>;
    media?: Media;
  };
  layout?: Array<{
    blockType: string;
    [key: string]: any;
  }>;
  meta?: {
    title?: string;
    description?: string;
    image?: Media;
  };
  publishedAt?: string;
  _status?: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  title: string;
  slug?: string;
  parent?: Category | string;
  breadcrumbs?: Array<{
    doc: Category | string;
    url: string;
    label: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  alt?: string;
  caption?: any; // Lexical JSON
  url?: string;
  thumbnailURL?: string;
  filename?: string;
  mimeType?: string;
  filesize?: number;
  width?: number;
  height?: number;
  focalX?: number;
  focalY?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name?: string;
  roles?: Array<'admin' | 'user'>;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Redirect {
  id: string;
  from: string;
  to: {
    type: 'reference' | 'custom';
    url?: string;
    reference?: {
      relationTo: 'pages' | 'posts';
      value: string | Page | Post;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

// ============================================
// FETCH HELPER
// ============================================

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      // For ISR: enable Next.js caching with appropriate revalidation
      // Different endpoints can have different cache times
      // Workers API provides additional caching layer
      next: options.next || {
        revalidate: 300, // Default 5 minutes, can be overridden per endpoint
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

// ============================================
// POSTS API
// ============================================

export async function getAllPosts(
  page: number = 1,
  limit: number = 12,
  options?: RequestInit
): Promise<PaginatedResponse<Post>> {
  return fetchAPI<PaginatedResponse<Post>>(
    `/api/posts?page=${page}&limit=${limit}&depth=1`,
    options
  );
}

export async function getPostBySlug(
  slug: string,
  draft: boolean = false,
  options?: RequestInit
): Promise<Post | null> {
  try {
    const draftParam = draft ? '&draft=true' : '';
    return await fetchAPI<Post>(
      `/api/posts/${slug}?depth=2${draftParam}`,
      options
    );
  } catch (error) {
    return null;
  }
}

export async function getPostsByCategory(
  categorySlug: string,
  page: number = 1,
  limit: number = 12,
  options?: RequestInit
): Promise<PaginatedResponse<Post>> {
  return fetchAPI<PaginatedResponse<Post>>(
    `/api/posts?category=${categorySlug}&page=${page}&limit=${limit}&depth=1`,
    options
  );
}

export async function getAllPostSlugs(): Promise<string[]> {
  const allSlugs: string[] = [];
  let hasMore = true;
  let page = 1;
  const maxPages = 100; // Safety limit to prevent infinite loops

  while (hasMore && page <= maxPages) {
    try {
      const response = await fetchAPI<PaginatedResponse<Post>>(
        `/api/posts?page=${page}&limit=100&depth=0`
      );

      allSlugs.push(...response.docs.map(p => p.slug));
      hasMore = response.hasNextPage ?? false;
      page++;

      // Log progress for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getAllPostSlugs] Fetched page ${page - 1}: ${response.docs.length} posts, total: ${allSlugs.length}`);
      }
    } catch (error) {
      console.warn(
        `[getAllPostSlugs] Failed to fetch page ${page}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Break on error to avoid infinite loops, but keep accumulated slugs
      break;
    }
  }

  console.log(`[getAllPostSlugs] Successfully fetched ${allSlugs.length} total posts`);
  return allSlugs;
}

// ============================================
// PAGES API
// ============================================

export async function getAllPages(
  limit: number = 100,
  options?: RequestInit
): Promise<PaginatedResponse<Page>> {
  return fetchAPI<PaginatedResponse<Page>>(
    `/api/pages?limit=${limit}&depth=1`,
    options
  );
}

export async function getPageBySlug(
  slug: string,
  draft: boolean = false,
  options?: RequestInit
): Promise<Page | null> {
  try {
    const draftParam = draft ? '&draft=true' : '';
    const page = await fetchAPI<Page>(
      `/api/pages/${slug}?depth=2${draftParam}`,
      options
    );
    console.log(`[getPageBySlug] Successfully fetched page "${slug}":`, page?.title || 'N/A');
    return page;
  } catch (error) {
    console.error(`[getPageBySlug] Failed to fetch page "${slug}":`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

export async function getAllPageSlugs(): Promise<string[]> {
  const allSlugs: string[] = [];
  let hasMore = true;
  let page = 1;
  const maxPages = 100; // Safety limit to prevent infinite loops

  while (hasMore && page <= maxPages) {
    try {
      const response = await fetchAPI<PaginatedResponse<Page>>(
        `/api/pages?page=${page}&limit=100&depth=0`
      );

      allSlugs.push(...response.docs.map(p => p.slug));
      hasMore = response.hasNextPage ?? false;
      page++;

      // Log progress for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getAllPageSlugs] Fetched page ${page - 1}: ${response.docs.length} pages, total: ${allSlugs.length}`);
      }
    } catch (error) {
      console.warn(
        `[getAllPageSlugs] Failed to fetch page ${page}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Break on error to avoid infinite loops, but keep accumulated slugs
      break;
    }
  }

  console.log(`[getAllPageSlugs] Successfully fetched ${allSlugs.length} total pages`);
  return allSlugs;
}

// ============================================
// CATEGORIES API
// ============================================

export async function getAllCategories(
  options?: RequestInit
): Promise<PaginatedResponse<Category>> {
  return fetchAPI<PaginatedResponse<Category>>(
    '/api/categories?limit=100',
    options
  );
}

export async function getCategoryBySlug(
  slug: string,
  options?: RequestInit
): Promise<Category | null> {
  try {
    return await fetchAPI<Category>(`/api/categories/${slug}`, options);
  } catch (error) {
    return null;
  }
}

// ============================================
// REDIRECTS API
// ============================================

export async function getAllRedirects(
  options?: RequestInit
): Promise<Redirect[]> {
  try {
    const response = await fetchAPI<PaginatedResponse<Redirect>>(
      '/api/redirects?limit=0',
      options
    );
    return response.docs;
  } catch (error) {
    console.error('[Redirects API Error]', error);
    return [];
  }
}

// ============================================
// MEDIA API
// ============================================

export async function getMediaById(
  id: string,
  options?: RequestInit
): Promise<Media | null> {
  try {
    return await fetchAPI<Media>(`/api/media/${id}`, options);
  } catch (error) {
    return null;
  }
}

// ============================================
// SEARCH API
// ============================================

export async function searchContent(
  query: string,
  collections: string[] = ['posts', 'pages'],
  options?: RequestInit
): Promise<{
  posts?: PaginatedResponse<Post>;
  pages?: PaginatedResponse<Page>;
}> {
  const collectionsParam = collections.join(',');
  return fetchAPI(
    `/api/search?q=${encodeURIComponent(query)}&collections=${collectionsParam}`,
    options
  );
}

// ============================================
// GLOBALS API (Header, Footer)
// ============================================

export interface HeaderGlobal {
  id: string;
  navItems?: Array<{
    link: {
      type: 'reference' | 'custom';
      label: string;
      url?: string;
      reference?: {
        relationTo: string;
        value: string | Page;
      };
    };
  }>;
}

export interface FooterGlobal {
  id: string;
  navItems?: Array<{
    link: {
      type: 'reference' | 'custom';
      label: string;
      url?: string;
      reference?: {
        relationTo: string;
        value: string | Page;
      };
    };
  }>;
}

export async function getHeader(options?: RequestInit): Promise<HeaderGlobal> {
  return fetchAPI<HeaderGlobal>('/api/globals/header?depth=1', options);
}

export async function getFooter(options?: RequestInit): Promise<FooterGlobal> {
  return fetchAPI<FooterGlobal>('/api/globals/footer?depth=1', options);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Revalidate cache on-demand (for webhooks)
 */
export async function revalidateCache(
  collection: string,
  slug: string,
  secret: string
): Promise<boolean> {
  try {
    await fetch(`${API_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify({
        collection,
        slug,
      }),
    });
    return true;
  } catch (error) {
    console.error('[Revalidate Error]', error);
    return false;
  }
}

/**
 * Get full URL for media
 */
export function getMediaURL(media?: Media | string): string | undefined {
  if (!media) return undefined;
  if (typeof media === 'string') return media;
  return media.url;
}

/**
 * Get image srcset for responsive images
 */
export function getImageSrcSet(media: Media): string | undefined {
  if (!media.url) return undefined;

  const sizes = [320, 640, 768, 1024, 1280, 1536];
  return sizes
    .map(size => `${media.url}?w=${size} ${size}w`)
    .join(', ');
}

/**
 * Check if post/page is published
 */
export function isPublished(doc: Post | Page): boolean {
  return doc._status === 'published';
}

/**
 * Format date for display
 */
export function formatDate(dateString: string, locale: string = 'ru-RU'): string {
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
