# Экспертная проверка 4-Tier кэш архитектуры

**Дата:** 22 октября 2025
**Проверено:** Конфигурация всех 4 уровней кэширования

---

## ✅ ЧТО НАСТРОЕНО ПРАВИЛЬНО

### Level 0: Cloudflare CDN ✅
**Файл:** `src/middleware.ts`

- ✅ Статические ассеты: `max-age=31536000, immutable` (1 год)
- ✅ Sitemap: `s-maxage=3600, stale-while-revalidate=86400` (1 час + 24 часа SWR)
- ✅ API routes: `no-store, no-cache, must-revalidate`
- ✅ ISR pages: `s-maxage=300, stale-while-revalidate=86400` (5 минут + 24 часа SWR)
- ✅ CDN-Cache-Control: `s-maxage=3600` (1 час для CDN)
- ✅ Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy

**Вывод:** Middleware настроен экспертно ✅

---

### Level 1: Regional Cache ✅
**Файл:** `open-next.config.ts`

```typescript
incrementalCache: withRegionalCache(r2IncrementalCache, {
  mode: "long-lived",  // ✅ 30 минут in-memory
  bypassTagCacheOnCacheHit: true,  // ⚠️ ПРОБЛЕМА (см. ниже)
})
```

- ✅ Regional Cache активирован
- ✅ Mode: "long-lived" (30 минут)
- ✅ Wrapper над R2 для максимальной производительности
- ⚠️ **bypassTagCacheOnCacheHit: true** - задержка webhook до 30 минут

**Вывод:** Технически настроен правильно, но есть trade-off ⚠️

---

### Level 2: R2 Object Storage ✅
**Файл:** `wrangler.toml`

```toml
[[r2_buckets]]
binding = "NEXT_INC_CACHE_R2_BUCKET"
bucket_name = "alegria-media"

[vars]
NEXT_INC_CACHE_R2_PREFIX = "nextjs-cache"
```

- ✅ R2 bucket binding настроен
- ✅ Prefix для разделения cache от media
- ✅ TTL: 7 дней (по умолчанию от OpenNext)

**Вывод:** Настроено экспертно ✅

---

### Level 3: D1 Tag Cache ✅
**Файл:** `wrangler.toml`, `open-next.config.ts`

```toml
[[d1_databases]]
binding = "NEXT_TAG_CACHE_D1"
database_name = "nextjs-tag-cache"
database_id = "6c75b795-e0a7-4fe0-8653-6b35082b1e44"
```

```typescript
tagCache: d1NextTagCache,
```

- ✅ D1 database binding настроен
- ✅ Tag Cache handler подключен
- ✅ Database ID корректный

**Вывод:** Настроено экспертно ✅

---

### Revalidate периоды на страницах ✅

| Страница | Revalidate | Комментарий |
|----------|-----------|-------------|
| `/` (Homepage) | `false` | ✅ SSG only, требует webhook |
| `/[slug]` (Dynamic pages) | `86400` (24h) | ✅ Оптимально для редко изменяемых страниц |
| `/posts` (Listing) | `1800` (30m) | ✅ Баланс между свежестью и HIT ratio |
| `/posts/[slug]` | `3600` (1h) | ✅ Хороший баланс |
| `/posts/page/[pageNumber]` | `300` (5m) | ✅ Pagination - нужна свежесть |
| `/search` | `force-dynamic` | ✅ SSR для search - правильно |

**Вывод:** Периоды настроены экспертно ✅

---

## ❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 🚨 ПРОБЛЕМА #1: Отсутствует Revalidate API Endpoint

**Статус:** ❌ КРИТИЧНО

**Что отсутствует:**
- Нет `/api/revalidate/route.ts`
- Webhooks от Payload CMS не могут инвалидировать кэш
- Homepage с `revalidate=false` НИКОГДА не обновится без webhooks

**Пример недостающего endpoint:**
```typescript
// src/app/api/revalidate/route.ts
import { revalidateTag, revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')

  // Validate secret
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { tag, path, collection, slug } = body

    // Revalidate by tag
    if (tag) {
      revalidateTag(tag)
      return NextResponse.json({
        revalidated: true,
        type: 'tag',
        tag
      })
    }

    // Revalidate by path
    if (path) {
      revalidatePath(path)
      return NextResponse.json({
        revalidated: true,
        type: 'path',
        path
      })
    }

    // Revalidate by collection + slug
    if (collection && slug) {
      revalidateTag(`${collection}-${slug}`)
      revalidatePath(`/${collection}/${slug}`)

      // Homepage для Posts
      if (collection === 'posts') {
        revalidatePath('/')
        revalidateTag('posts-listing')
      }

      return NextResponse.json({
        revalidated: true,
        collection,
        slug
      })
    }

    return NextResponse.json({
      error: 'Missing tag, path, or collection+slug'
    }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      error: 'Revalidation failed',
      details: String(error)
    }, { status: 500 })
  }
}
```

**Webhook URL для Payload CMS:**
```
POST https://poshta.cloud/api/revalidate
Headers:
  x-revalidate-secret: <REVALIDATE_SECRET>
Body:
  {
    "collection": "posts",
    "slug": "my-article"
  }
```

**Переменные окружения:**
```bash
# В wrangler.toml [vars] секции или Cloudflare Dashboard
REVALIDATE_SECRET = "your-secret-here-generate-via-openssl-rand-base64-32"
```

---

### 🚨 ПРОБЛЕМА #2: Недостаточно Cache Tags

**Статус:** ⚠️ ВАЖНО

**Текущее состояние:**
```typescript
// src/lib/api.ts - только 1 тег!
next: { tags: ['global_site-settings'] }
```

**Что отсутствует:**
- ❌ Теги для individual posts: `post-${slug}`
- ❌ Теги для individual pages: `page-${slug}`
- ❌ Теги для listings: `posts-listing`, `pages-listing`
- ❌ Теги для collections: `collection-posts`, `collection-pages`

**Рекомендация:**
```typescript
// Пример для lib/api.ts - функция getPostBySlug
export async function getPostBySlug(slug: string) {
  const response = await fetch(`${apiUrl}/api/posts?where[slug][equals]=${slug}`, {
    next: {
      tags: [
        `post-${slug}`,           // Individual post tag
        'collection-posts',        // All posts tag
        'posts-listing',           // Posts listing tag
      ],
      revalidate: 3600,           // Fallback TTL
    },
  })
  // ...
}

// Пример для getPosts (listing)
export async function getPosts(page = 1, limit = 10) {
  const response = await fetch(`${apiUrl}/api/posts?page=${page}&limit=${limit}`, {
    next: {
      tags: [
        'posts-listing',           // Listing tag
        'collection-posts',        // Collection tag
        `posts-page-${page}`,      // Page-specific tag
      ],
      revalidate: 1800,
    },
  })
  // ...
}

// Пример для getPages (dynamic pages)
export async function getPageBySlug(slug: string) {
  const response = await fetch(`${apiUrl}/api/pages?where[slug][equals]=${slug}`, {
    next: {
      tags: [
        `page-${slug}`,
        'collection-pages',
      ],
      revalidate: 86400,
    },
  })
  // ...
}
```

**Почему это важно:**
- Без тегов невозможно селективно инвалидировать кэш
- При обновлении поста будет инвалидирован весь кэш, а не только этот пост
- Нет возможности обновить homepage отдельно от listing

---

### ⚠️ ПРОБЛЕМА #3: bypassTagCacheOnCacheHit задерживает webhook

**Статус:** ⚠️ TRADE-OFF

**Текущая настройка:**
```typescript
bypassTagCacheOnCacheHit: true
```

**Что это означает:**
- ✅ **Плюс:** Экономит 2-5ms на каждый HIT (не проверяет D1 Tag Cache)
- ❌ **Минус:** При webhook invalidation Regional Cache НЕ обновляется
- ❌ **Результат:** Задержка до 30 минут для обновления контента

**Сценарий:**
```
1. Редактор обновляет пост в Payload CMS (10:00:00)
2. Webhook вызывает /api/revalidate (10:00:01)
3. D1 Tag Cache помечает тег как invalidated (10:00:02)
4. R2 Cache invalidated (10:00:02)
5. Regional Cache НЕ проверяет теги при HIT (из-за bypass)
6. Пользователи видят старую версию до 10:30:00 (30 минут TTL)
```

**Рекомендации:**

**Вариант A: Производительность > Свежесть (текущий)**
```typescript
bypassTagCacheOnCacheHit: true  // Keep as is
mode: "long-lived"              // 30 min
```
- Подходит для: Новостные сайты с редкими обновлениями
- TTFB: 18-25ms (самый быстрый)
- Задержка webhook: до 30 минут

**Вариант B: Баланс**
```typescript
bypassTagCacheOnCacheHit: false  // Check tags on HIT
mode: "short-lived"              // 1 min
```
- Подходит для: Блоги с умеренными обновлениями
- TTFB: 20-30ms (+2-5ms на проверку тегов)
- Задержка webhook: до 1 минуты

**Вариант C: Свежесть > Производительность**
```typescript
bypassTagCacheOnCacheHit: false
mode: "short-lived"
// И добавить в revalidate endpoint:
// Purge Cloudflare cache через API
```
- Подходит для: E-commerce, real-time контент
- TTFB: 25-35ms
- Задержка webhook: мгновенно (требует Cloudflare API token)

---

### ⚠️ ПРОБЛЕМА #4: CDN Edge Cache не обновляется по webhook

**Статус:** ⚠️ АРХИТЕКТУРНАЯ ПРОБЛЕМА

**Текущее состояние:**
- Level 0 (CDN) обновляется ТОЛЬКО при deploy
- Webhook инвалидирует Level 1, 2, 3 (Regional, R2, D1)
- Level 0 (CDN Edge) остаётся старым до следующего deploy

**Решение:**
Добавить в `/api/revalidate` purge Cloudflare CDN:

```typescript
// src/app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'

async function purgeCloudflareCache(paths: string[]) {
  const zone = process.env.CLOUDFLARE_ZONE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN

  if (!zone || !token) {
    console.warn('[Revalidate] Cloudflare credentials missing - skipping CDN purge')
    return
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: paths.map(p => `https://poshta.cloud${p}`),
        }),
      }
    )

    if (!response.ok) {
      console.error('[Revalidate] Cloudflare purge failed:', await response.text())
    } else {
      console.log('[Revalidate] Cloudflare CDN purged:', paths)
    }
  } catch (error) {
    console.error('[Revalidate] Cloudflare purge error:', error)
  }
}

export async function POST(request: NextRequest) {
  // ... authentication ...

  const { collection, slug, path } = await request.json()

  if (collection && slug) {
    const contentPath = `/${collection}/${slug}`

    // Revalidate Next.js cache (Level 1, 2, 3)
    revalidateTag(`${collection}-${slug}`)
    revalidatePath(contentPath)
    revalidatePath('/') // Homepage

    // Purge CDN (Level 0)
    await purgeCloudflareCache([
      contentPath,
      '/',
      `/${collection}`,
    ])

    return NextResponse.json({ revalidated: true })
  }

  // ...
}
```

**Переменные окружения:**
```bash
# В Cloudflare Dashboard > Workers & Pages > Settings > Variables
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_API_TOKEN=your-api-token  # Permissions: Zone.Cache Purge
```

**Получить credentials:**
1. Zone ID: Cloudflare Dashboard > Overview > API section
2. API Token: Cloudflare Dashboard > My Profile > API Tokens > Create Token
   - Template: "Edit zone DNS"
   - Permissions: Zone - Cache Purge - Purge
   - Zone Resources: Include - Specific zone - poshta.cloud

---

## 📋 РЕКОМЕНДУЕМЫЕ УЛУЧШЕНИЯ

### Приоритет 1: КРИТИЧНО 🚨

1. **Создать `/api/revalidate` endpoint**
   - Без этого Homepage НИКОГДА не обновится (revalidate=false)
   - Webhooks от Payload CMS не работают
   - Файл: `src/app/api/revalidate/route.ts`

2. **Добавить cache tags во все API вызовы**
   - Файл: `src/lib/api.ts`
   - Функции: `getPostBySlug`, `getPosts`, `getPageBySlug`, `getPages`, etc.
   - Теги: `post-${slug}`, `page-${slug}`, `posts-listing`, `collection-posts`

3. **Добавить переменную окружения REVALIDATE_SECRET**
   - Файл: `wrangler.toml` или Cloudflare Dashboard
   - Генерация: `openssl rand -base64 32`

### Приоритет 2: ВАЖНО ⚠️

4. **Добавить Cloudflare CDN purge в revalidate endpoint**
   - Без этого CDN Edge Cache не обновляется по webhook
   - Требует: CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN

5. **Решить trade-off: bypassTagCacheOnCacheHit**
   - Текущее: Производительность > Свежесть
   - Альтернатива: Свежесть > Производительность
   - Зависит от бизнес-требований

### Приоритет 3: ОПЦИОНАЛЬНО 💡

6. **Добавить мониторинг cache HIT ratio**
   - Cloudflare Analytics > Caching
   - Цель: >90% HIT ratio

7. **Добавить logging для revalidation events**
   - Логировать все webhook calls
   - Отслеживать время invalidation

8. **Создать dashboard для cache statistics**
   - Regional Cache HIT/MISS
   - R2 operations
   - D1 tag lookups

---

## 📊 ИТОГОВАЯ ОЦЕНКА

| Уровень | Статус | Оценка | Комментарий |
|---------|--------|--------|-------------|
| **Level 0: CDN** | ✅ | 9/10 | Headers настроены экспертно, но нет auto-purge по webhook |
| **Level 1: Regional** | ⚠️ | 7/10 | Настроен правильно, но bypass задерживает webhook на 30 мин |
| **Level 2: R2** | ✅ | 10/10 | Идеальная конфигурация |
| **Level 3: D1 Tag** | ✅ | 10/10 | Идеальная конфигурация |
| **Revalidate периоды** | ✅ | 10/10 | Оптимально настроены |
| **Revalidate endpoint** | ❌ | 0/10 | ОТСУТСТВУЕТ - критично! |
| **Cache tags** | ❌ | 2/10 | Только 1 тег из ~10 необходимых |

**Общая оценка:** 6.9/10

**Вердикт:**
- ✅ Инфраструктура 4-tier кэша настроена **технически правильно**
- ❌ **Webhooks НЕ РАБОТАЮТ** из-за отсутствия `/api/revalidate`
- ❌ **Homepage не обновляется** (revalidate=false без webhooks)
- ⚠️ Regional Cache bypass задерживает обновления на 30 минут

**Что нужно сделать СРОЧНО:**
1. Создать `/api/revalidate/route.ts`
2. Добавить cache tags в `src/lib/api.ts`
3. Настроить webhook в Payload CMS
4. Добавить Cloudflare CDN purge (опционально, но рекомендуется)

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

**Шаг 1: Имплементировать revalidate endpoint**
```bash
# Создать файл
touch src/app/api/revalidate/route.ts

# Добавить secret в переменные окружения
# Cloudflare Dashboard > Workers & Pages > alegria-frontend > Settings > Variables
REVALIDATE_SECRET=<generated-secret>
```

**Шаг 2: Обновить lib/api.ts с тегами**
```typescript
// Добавить теги во все fetch calls
next: { tags: [...], revalidate: ... }
```

**Шаг 3: Настроить webhook в Payload CMS**
```javascript
// payload.config.ts
hooks: {
  afterChange: [
    async ({ doc, req, operation }) => {
      if (operation === 'update' || operation === 'create') {
        await fetch('https://poshta.cloud/api/revalidate', {
          method: 'POST',
          headers: {
            'x-revalidate-secret': process.env.REVALIDATE_SECRET,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            collection: req.collection.config.slug,
            slug: doc.slug,
          }),
        })
      }
    }
  ]
}
```

**Шаг 4: Тестирование**
```bash
# 1. Обновить пост в Payload CMS
# 2. Проверить /api/revalidate logs
# 3. Проверить что страница обновилась
# 4. Проверить x-nextjs-cache headers (должно быть STALE, потом HIT)
```

---

**Автор:** Claude Code
**Дата создания:** 22 октября 2025
**Версия:** 1.0
