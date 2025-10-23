// ============================================
// API CLIENT for Payload CMS via Workers
// ============================================
// Architecture: Frontend -> Workers API -> Payload CMS (Vercel)
// Workers provide caching layer (KV + D1) for optimal performance

import type { Post, Page, Category, Media, User } from '@/payload-types'
import { logger } from './logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.poshta.cloud';

// ============================================
// TYPE DEFINITIONS from Payload Collections
// ============================================

 
export type { Post, Page, Category, Media, User } from '@/payload-types'

export interface Redirect {
  id: string | number;
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
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const maxRetries = 3;
  const baseDelay = 500; // ms

  try {
    // Explicit timeout for edge runtime
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Alegria-Frontend/1.0 (ISR)',
        ...options.headers,
      },
      // For ISR: enable Next.js caching with appropriate revalidation
      next: options.next || {
        revalidate: 300, // Default 5 minutes, can be overridden per endpoint
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isRetryable =
      errorMsg.includes('fetch') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('ECONNREFUSED') ||
      errorMsg.includes('ENOTFOUND');

    // Retry logic for transient errors
    if (isRetryable && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // exponential backoff
      logger.warn(
        `[API] Retry attempt ${retryCount + 1}/${maxRetries} after ${delay}ms: ${endpoint}`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchAPI<T>(endpoint, options, retryCount + 1);
    }

    logger.error(`[API Error] ${endpoint} (retries exhausted):`, errorMsg);
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
    {
      ...options,
      next: {
        tags: ['posts-listing', 'collection-posts', `posts-page-${page}`],
        revalidate: 1800, // 30 minutes
        ...options?.next,
      },
    }
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
      {
        ...options,
        next: {
          tags: [`post-${slug}`, 'collection-posts'],
          revalidate: 3600, // 1 hour
          ...options?.next,
        },
      }
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
    {
      ...options,
      next: {
        tags: [`category-${categorySlug}`, 'posts-listing', 'collection-posts'],
        revalidate: 1800, // 30 minutes
        ...options?.next,
      },
    }
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
      logger.log(`[getAllPostSlugs] Fetched page ${page - 1}: ${response.docs.length} posts, total: ${allSlugs.length}`);
    } catch (error) {
      logger.warn(
        `[getAllPostSlugs] Failed to fetch page ${page}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Break on error to avoid infinite loops, but keep accumulated slugs
      break;
    }
  }

  logger.log(`[getAllPostSlugs] Successfully fetched ${allSlugs.length} total posts`);
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
    {
      ...options,
      next: {
        tags: ['pages-listing', 'collection-pages'],
        revalidate: 86400, // 24 hours
        ...options?.next,
      },
    }
  );
}

export async function getPageBySlug(
  slug: string,
  draft: boolean = false,
  options?: RequestInit
): Promise<Page | null> {
  const startTime = Date.now();
  try {
    const draftParam = draft ? '&draft=true' : '';
    const endpoint = `/api/pages/${slug}?depth=2${draftParam}`;
    const fullUrl = `${API_URL}${endpoint}`;

    logger.log(`[getPageBySlug] ========== START ==========`);
    logger.log(`[getPageBySlug] Slug: ${slug}`);
    logger.log(`[getPageBySlug] Full URL: ${fullUrl}`);
    logger.log(`[getPageBySlug] Environment: ${typeof window === 'undefined' ? 'server' : 'browser'}`);
    logger.log(`[getPageBySlug] API_URL: ${API_URL}`);

    const page = await fetchAPI<Page>(endpoint, {
      ...options,
      next: {
        tags: [`page-${slug}`, 'collection-pages'],
        revalidate: 86400, // 24 hours
        ...options?.next,
      },
    });

    const duration = Date.now() - startTime;
    logger.log(`[getPageBySlug] SUCCESS in ${duration}ms: "${slug}" -> "${page?.title || 'N/A'}"`);
    logger.log(`[getPageBySlug] ========== END ==========`);
    return page;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.constructor.name : typeof error;
    const isNetworkError = errorMsg.includes('fetch') || errorMsg.includes('network');
    const isCorsError = errorMsg.includes('CORS') || errorMsg.includes('cors');
    const isTimeoutError = errorMsg.includes('timeout') || errorMsg.includes('Timeout');

    logger.error(`[getPageBySlug] ========== FAILURE ==========`);
    logger.error(`[getPageBySlug] Slug: ${slug}`);
    logger.error(`[getPageBySlug] Duration: ${duration}ms`);
    logger.error(`[getPageBySlug] Error Type: ${errorType}`);
    logger.error(`[getPageBySlug] Error Message: ${errorMsg}`);
    logger.error(`[getPageBySlug] Is Network Error: ${isNetworkError}`);
    logger.error(`[getPageBySlug] Is CORS Error: ${isCorsError}`);
    logger.error(`[getPageBySlug] Is Timeout Error: ${isTimeoutError}`);

    if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 5);
      logger.error(`[getPageBySlug] Stack Trace:`);
      stackLines.forEach((line, i) => {
        logger.error(`[getPageBySlug]   ${i}: ${line.trim()}`);
      });
    }

    logger.error(`[getPageBySlug] ========== END (FAILED) ==========`);
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
      logger.log(`[getAllPageSlugs] Fetched page ${page - 1}: ${response.docs.length} pages, total: ${allSlugs.length}`);
    } catch (error) {
      logger.warn(
        `[getAllPageSlugs] Failed to fetch page ${page}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Break on error to avoid infinite loops, but keep accumulated slugs
      break;
    }
  }

  logger.log(`[getAllPageSlugs] Successfully fetched ${allSlugs.length} total pages`);
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
    {
      ...options,
      next: {
        tags: ['categories-listing', 'collection-categories'],
        revalidate: 86400, // 24 hours
        ...options?.next,
      },
    }
  );
}

export async function getCategoryBySlug(
  slug: string,
  options?: RequestInit
): Promise<Category | null> {
  try {
    return await fetchAPI<Category>(`/api/categories/${slug}`, {
      ...options,
      next: {
        tags: [`category-${slug}`, 'collection-categories'],
        revalidate: 86400, // 24 hours
        ...options?.next,
      },
    });
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
      {
        ...options,
        next: {
          tags: ['redirects-listing', 'collection-redirects'],
          revalidate: 3600, // 1 hour
          ...options?.next,
        },
      }
    );
    return response.docs;
  } catch (error) {
    logger.error('[Redirects API Error]', error);
    return [];
  }
}

// ============================================
// MEDIA API
// ============================================

export async function getMediaById(
  id: string | number,
  options?: RequestInit
): Promise<Media | null> {
  try {
    return await fetchAPI<Media>(`/api/media/${id}`, {
      ...options,
      next: {
        tags: [`media-${id}`, 'collection-media'],
        revalidate: 86400, // 24 hours - media rarely changes
        ...options?.next,
      },
    });
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
  id: string | number;
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
  id: string | number;
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
  return fetchAPI<HeaderGlobal>('/api/globals/header?depth=1', {
    ...options,
    next: {
      tags: ['global-header'],
      revalidate: 3600, // 1 hour
      ...options?.next,
    },
  });
}

export async function getFooter(options?: RequestInit): Promise<FooterGlobal> {
  return fetchAPI<FooterGlobal>('/api/globals/footer?depth=1', {
    ...options,
    next: {
      tags: ['global-footer'],
      revalidate: 3600, // 1 hour
      ...options?.next,
    },
  });
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
  return media.url || undefined;
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

export async function getSiteSettings(): Promise<any> {
  const url = `${API_URL}/api/globals/site-settings`

  try {
    const response = await fetch(url, {
      next: { tags: ['global_site-settings'] },
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    return response.json()
  } catch (error) {
    logger.error('[getSiteSettings] Failed:', error)
    return null
  }
}
