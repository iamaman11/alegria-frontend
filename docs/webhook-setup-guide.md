# Руководство по настройке Webhook Integration

**Дата:** 23 октября 2025
**Цель:** Настроить автоматическую инвалидацию кэша при изменениях в Payload CMS

---

## 🎯 Что это даёт

После настройки webhooks:
- ✅ Homepage обновляется **мгновенно** (вместо никогда)
- ✅ Посты обновляются **мгновенно** (вместо 1 часа)
- ✅ Страницы обновляются **мгновенно** (вместо 24 часов)
- ✅ Инвалидация кэша на всех 4 уровнях (CDN + Regional + R2 + D1)

---

## 📋 Требования

### 1. Frontend (Next.js) ✅
- ✅ `/api/revalidate` endpoint создан
- ✅ Cache tags добавлены во все API функции
- ⚠️ **ТРЕБУЕТСЯ:** Добавить `REVALIDATE_SECRET` в Cloudflare

### 2. Payload CMS (Backend)
- Доступ к `payload.config.ts`
- Права на изменение hooks

### 3. Cloudflare (опционально для CDN purge)
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_API_TOKEN` с правами Cache Purge

---

## 🔧 Шаг 1: Настройка Frontend (Cloudflare Pages)

### 1.1 Сгенерировать secret

На локальной машине или в терминале:
```bash
openssl rand -base64 32
```

Пример вывода:
```
dGhpc2lzYXNlY3VyZXNlY3JldGtleWZvcndlYmhvb2tzMTIz
```

### 1.2 Добавить в Cloudflare Pages

**Cloudflare Dashboard:**
1. Перейдите: `Workers & Pages` → `alegria-frontend` → `Settings` → `Environment variables`
2. Добавьте переменную:
   ```
   Name: REVALIDATE_SECRET
   Value: <ваш сгенерированный secret>
   Environment: Production (и Preview если нужно)
   ```
3. Нажмите **Save**

**ИЛИ через wrangler.toml (НЕ РЕКОМЕНДУЕТСЯ - секрет в git!):**
```toml
# wrangler.toml
[vars]
# ⚠️ ВНИМАНИЕ: Не коммитить secrets в git!
# Используйте Cloudflare Dashboard для секретов
# REVALIDATE_SECRET = "your-secret-here"
```

### 1.3 Опционально: Добавить Cloudflare CDN purge credentials

Для автоматической очистки CDN Edge Cache:

1. **Получить Zone ID:**
   - Cloudflare Dashboard → Ваш домен (poshta.cloud) → Overview → правая панель → Zone ID
   - Пример: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

2. **Создать API Token:**
   - Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - Template: **Edit zone DNS**
   - Permissions: **Zone → Cache Purge → Purge**
   - Zone Resources: **Include → Specific zone → poshta.cloud**
   - Continue → Create Token
   - Скопируйте токен (показывается один раз!)

3. **Добавить в Cloudflare Pages:**
   ```
   CLOUDFLARE_ZONE_ID=<ваш zone id>
   CLOUDFLARE_API_TOKEN=<ваш api token>
   NEXT_PUBLIC_SITE_URL=https://poshta.cloud
   ```

---

## 🔧 Шаг 2: Настройка Payload CMS

### 2.1 Добавить webhook hook в payload.config.ts

Откройте `payload.config.ts` (или где находится конфигурация Payload):

```typescript
import { buildConfig } from 'payload/config'

export default buildConfig({
  // ... существующая конфигурация

  collections: [
    {
      slug: 'posts',
      // ... существующие настройки

      hooks: {
        afterChange: [
          async ({ doc, req, operation, previousDoc }) => {
            // Webhook для Frontend revalidation
            await revalidateFrontend({
              collection: 'posts',
              slug: doc.slug,
              operation,
            })
          },
        ],
        afterDelete: [
          async ({ doc, req }) => {
            // Revalidate при удалении
            await revalidateFrontend({
              collection: 'posts',
              slug: doc.slug,
              operation: 'delete',
            })
          },
        ],
      },
    },

    {
      slug: 'pages',
      // ... существующие настройки

      hooks: {
        afterChange: [
          async ({ doc, req, operation, previousDoc }) => {
            await revalidateFrontend({
              collection: 'pages',
              slug: doc.slug,
              operation,
            })
          },
        ],
        afterDelete: [
          async ({ doc, req }) => {
            await revalidateFrontend({
              collection: 'pages',
              slug: doc.slug,
              operation: 'delete',
            })
          },
        ],
      },
    },

    {
      slug: 'categories',
      // ... существующие настройки

      hooks: {
        afterChange: [
          async ({ doc, req, operation }) => {
            await revalidateFrontend({
              collection: 'categories',
              slug: doc.slug,
              operation,
            })
          },
        ],
      },
    },
  ],

  globals: [
    {
      slug: 'header',
      // ... существующие настройки

      hooks: {
        afterChange: [
          async ({ doc, req }) => {
            await revalidateFrontend({
              tag: 'global-header',
            })
          },
        ],
      },
    },

    {
      slug: 'footer',
      // ... существующие настройки

      hooks: {
        afterChange: [
          async ({ doc, req }) => {
            await revalidateFrontend({
              tag: 'global-footer',
            })
          },
        ],
      },
    },

    {
      slug: 'site-settings',
      // ... существующие настройки

      hooks: {
        afterChange: [
          async ({ doc, req }) => {
            await revalidateFrontend({
              tag: 'global_site-settings',
              paths: ['/'], // Homepage uses site settings
            })
          },
        ],
      },
    },
  ],
})

// ============================================
// HELPER FUNCTION: Revalidate Frontend
// ============================================

interface RevalidateOptions {
  collection?: string
  slug?: string
  tag?: string
  tags?: string[]
  paths?: string[]
  operation?: 'create' | 'update' | 'delete'
}

async function revalidateFrontend(options: RevalidateOptions): Promise<void> {
  const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poshta.cloud'
  const revalidateSecret = process.env.REVALIDATE_SECRET

  if (!revalidateSecret) {
    console.error('[Webhook] REVALIDATE_SECRET not configured - skipping revalidation')
    return
  }

  try {
    const body: any = {}

    // Collection + slug revalidation
    if (options.collection && options.slug) {
      body.collection = options.collection
      body.slug = options.slug
    }

    // Tag revalidation
    if (options.tag) {
      body.tag = options.tag
    }

    if (options.tags) {
      body.tags = options.tags
    }

    // Path revalidation
    if (options.paths) {
      body.paths = options.paths
    }

    console.log('[Webhook] Revalidating frontend:', body)

    const response = await fetch(`${frontendUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': revalidateSecret,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Webhook] Revalidation failed (${response.status}):`, errorText)
      return
    }

    const result = await response.json()
    console.log('[Webhook] Revalidation successful:', result)

  } catch (error) {
    console.error('[Webhook] Revalidation error:', error)
  }
}
```

### 2.2 Добавить REVALIDATE_SECRET в Payload CMS environment

В зависимости от хостинга Payload CMS:

**Vercel:**
```bash
vercel env add REVALIDATE_SECRET
# Вставьте тот же secret что и в Cloudflare
```

**Docker / Self-hosted:**
```bash
# .env или docker-compose.yml
REVALIDATE_SECRET=dGhpc2lzYXNlY3VyZXNlY3JldGtleWZvcndlYmhvb2tzMTIz
NEXT_PUBLIC_SITE_URL=https://poshta.cloud
```

**Важно:** Secret должен быть **одинаковым** в Frontend и Payload CMS!

---

## 🧪 Шаг 3: Тестирование

### 3.1 Проверить endpoint вручную

```bash
curl -X POST https://poshta.cloud/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: YOUR_SECRET_HERE" \
  -d '{"collection":"posts","slug":"test-post"}'
```

**Ожидаемый ответ (200 OK):**
```json
{
  "revalidated": true,
  "timestamp": "2025-10-23T12:34:56.789Z",
  "duration": "45ms",
  "tags": ["post-test-post", "collection-posts"],
  "paths": ["/posts/test-post", "/", "/posts"],
  "cloudflarePurged": ["/posts/test-post", "/", "/posts"]
}
```

**Ошибка: Invalid secret (401):**
```json
{
  "error": "Unauthorized",
  "code": "INVALID_SECRET"
}
```

### 3.2 Проверить через Payload CMS

1. Зайдите в Payload CMS Admin: `https://your-payload-url.com/admin`
2. Откройте любой пост
3. Измените заголовок
4. Нажмите **Save**
5. Проверьте логи Payload CMS (должен быть вызов webhook)
6. Проверьте сайт: `https://poshta.cloud/posts/your-post` (должен показать новый заголовок)

### 3.3 Проверить cache headers

```bash
curl -I https://poshta.cloud/posts/test-post | grep -i cache
```

**До revalidation:**
```
x-nextjs-cache: HIT
age: 1800
```

**Сразу после revalidation:**
```
x-nextjs-cache: STALE
age: 0
```

**После следующего запроса:**
```
x-nextjs-cache: HIT
age: 1
```

---

## 🎭 Сценарии использования

### Сценарий 1: Редактор обновляет пост

```
1. Редактор изменяет пост "hello-world" в Payload CMS (10:00:00)
2. Payload CMS → afterChange hook срабатывает (10:00:01)
3. Webhook POST /api/revalidate {"collection":"posts","slug":"hello-world"} (10:00:02)
4. Frontend инвалидирует:
   - Tags: post-hello-world, collection-posts
   - Paths: /posts/hello-world, /, /posts
5. Cloudflare CDN purge для тех же paths (10:00:03)
6. Пользователь заходит на /posts/hello-world (10:00:05)
7. Next.js видит STALE cache → запрос в Payload CMS → новая версия (10:00:06)
8. Новая версия кэшируется (10:00:07)
9. Следующие пользователи видят новую версию из кэша (HIT)
```

**Время обновления:** ~5 секунд (вместо 30 минут!)

### Сценарий 2: Создание нового поста

```
1. Редактор создаёт пост "new-article" (10:00:00)
2. Webhook → revalidate (10:00:01)
3. Homepage инвалидируется (показывает последние посты)
4. Posts listing инвалидируется
5. Пользователь заходит на / → видит новый пост в списке (10:00:05)
```

### Сценарий 3: Удаление поста

```
1. Редактор удаляет пост "old-post" (10:00:00)
2. Webhook → afterDelete hook → revalidate (10:00:01)
3. Cache инвалидируется
4. Пользователь заходит на /posts/old-post (10:00:05)
5. Next.js запрашивает из CMS → 404 → показывает Not Found
```

### Сценарий 4: Изменение Header (Global)

```
1. Редактор меняет меню в Header (10:00:00)
2. Webhook → revalidate tag: global-header (10:00:01)
3. ВСЕ страницы с Header инвалидируются (кэш помечен STALE)
4. При следующем запросе любой страницы → Header обновляется
```

---

## 🐛 Troubleshooting

### Проблема 1: Webhook не вызывается

**Симптомы:**
- Контент обновляется в CMS, но сайт не обновляется
- Нет логов в Payload CMS

**Решение:**
```typescript
// Проверьте что hook добавлен в payload.config.ts
hooks: {
  afterChange: [
    async ({ doc }) => {
      console.log('[DEBUG] afterChange hook triggered for:', doc.slug)
      await revalidateFrontend({ collection: 'posts', slug: doc.slug })
    }
  ]
}
```

### Проблема 2: 401 Unauthorized

**Симптомы:**
```
[Webhook] Revalidation failed (401): Unauthorized
```

**Решение:**
1. Проверьте что `REVALIDATE_SECRET` одинаковый в Frontend и Payload
2. Проверьте что переменная добавлена в Cloudflare Pages Settings
3. Redeploy после добавления переменной

```bash
# Проверить что secret установлен (в Payload CMS)
console.log('REVALIDATE_SECRET:', process.env.REVALIDATE_SECRET ? 'SET' : 'NOT SET')
```

### Проблема 3: Webhook вызывается, но кэш не обновляется

**Симптомы:**
- Логи показывают успешный webhook
- Сайт всё равно показывает старый контент

**Возможные причины:**

1. **Regional Cache bypass (30 минут задержка):**
   ```typescript
   // open-next.config.ts
   bypassTagCacheOnCacheHit: true  // ← ЭТО БЛОКИРУЕТ WEBHOOK!
   ```

   **Решение:** Изменить на `false` (trade-off: +2-5ms TTFB)

2. **CDN Edge Cache не purged:**
   - Проверьте что `CLOUDFLARE_ZONE_ID` и `CLOUDFLARE_API_TOKEN` настроены
   - Проверьте логи: должно быть `cloudflarePurged: [...]`

3. **Browser cache:**
   - Откройте DevTools → Network → Disable cache
   - Или Ctrl+Shift+R (hard refresh)

### Проблема 4: Слишком частые revalidation

**Симптомы:**
- Каждое изменение → revalidate → API перегружен

**Решение: Debounce webhook**

```typescript
// payload.config.ts
const revalidateDebounce = new Map<string, NodeJS.Timeout>()

async function revalidateFrontendDebounced(options: RevalidateOptions, delay = 5000) {
  const key = `${options.collection}-${options.slug}`

  // Clear existing timer
  if (revalidateDebounce.has(key)) {
    clearTimeout(revalidateDebounce.get(key)!)
  }

  // Set new timer
  const timeout = setTimeout(() => {
    revalidateFrontend(options)
    revalidateDebounce.delete(key)
  }, delay)

  revalidateDebounce.set(key, timeout)
}

// Использование:
hooks: {
  afterChange: [
    async ({ doc }) => {
      // Вызов webhook через 5 секунд после последнего изменения
      await revalidateFrontendDebounced({ collection: 'posts', slug: doc.slug })
    }
  ]
}
```

---

## 📊 Мониторинг

### Логи в Cloudflare Pages

```bash
# Cloudflare Dashboard → Workers & Pages → alegria-frontend → Logs
# Ищите:
[Revalidate] Tag: post-my-slug
[Revalidate] Success in 45ms
[Revalidate] Cloudflare CDN purged: ["/posts/my-slug"]
```

### Логи в Payload CMS

```bash
# Смотрите логи вашего Payload CMS хостинга
# Vercel: https://vercel.com/your-team/your-project/logs
# Self-hosted: docker logs payload-cms

[Webhook] Revalidating frontend: { collection: 'posts', slug: 'my-slug' }
[Webhook] Revalidation successful: { revalidated: true, duration: '45ms' }
```

### Метрики

Добавьте счётчики в `/api/revalidate/route.ts`:

```typescript
// Простой in-memory счётчик (для production используйте D1 или Analytics Engine)
let revalidateCount = 0
let lastRevalidate = new Date()

export async function POST(request: NextRequest) {
  revalidateCount++
  lastRevalidate = new Date()

  // ... остальной код

  return NextResponse.json({
    ...response,
    stats: {
      totalRevalidations: revalidateCount,
      lastRevalidate: lastRevalidate.toISOString(),
    }
  })
}
```

---

## ✅ Чеклист готовности

Перед запуском в production:

- [ ] `REVALIDATE_SECRET` добавлен в Cloudflare Pages
- [ ] `REVALIDATE_SECRET` добавлен в Payload CMS
- [ ] Secrets одинаковые в обоих местах
- [ ] Webhook hooks добавлены в `payload.config.ts`
- [ ] Payload CMS redeploy после изменений
- [ ] Frontend redeploy после добавления переменных
- [ ] Тестовый webhook вручную (curl) → 200 OK
- [ ] Тестовое изменение в CMS → сайт обновляется
- [ ] `CLOUDFLARE_ZONE_ID` и `CLOUDFLARE_API_TOKEN` настроены (опционально)
- [ ] CDN purge работает (проверить логи)
- [ ] Мониторинг настроен

---

## 🚀 Следующие шаги

После успешной настройки:

1. **Оптимизировать Regional Cache:**
   ```typescript
   // open-next.config.ts
   bypassTagCacheOnCacheHit: false  // Включить проверку тегов
   mode: "short-lived"              // 1 минута (вместо 30)
   ```

2. **Добавить rate limiting:**
   - Ограничить количество webhook calls (например, через Cloudflare Rate Limiting)

3. **Настроить alerts:**
   - Cloudflare Workers Analytics для отслеживания revalidation requests
   - Sentry или другой error tracker для ошибок webhook

4. **Документировать для команды:**
   - Объяснить редакторам что изменения теперь видны мгновенно
   - Объяснить что не нужно "подождать 30 минут"

---

**Автор:** Claude Code
**Версия:** 1.0
**Дата:** 23 октября 2025
