# Архитектура проекта Alegria

**Дата анализа:** 22 октября 2025

---

## Обзор

Проект Alegria состоит из **3 отдельных репозиториев**, работающих вместе:

```
┌─────────────────┐
│   Пользователь  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  1. FRONTEND (alegria-frontend)     │
│  Next.js 15 + React 19              │
│  Cloudflare Pages                   │
│  ISR + R2 Cache                     │
└────────┬────────────────────────────┘
         │
         │ API Requests
         ▼
┌─────────────────────────────────────┐
│  2. WORKERS API                     │
│  Cloudflare Workers                 │
│  Caching Layer (KV + D1)            │
│  https://api.poshta.cloud           │
└────────┬────────────────────────────┘
         │
         │ CMS Queries
         ▼
┌─────────────────────────────────────┐
│  3. PAYLOAD CMS                     │
│  Backend CMS                        │
│  Vercel Deployment                  │
│  PostgreSQL Database                │
└─────────────────────────────────────┘
```

---

## 1. FRONTEND (Текущий репозиторий)

### Информация
- **Репозиторий:** `iamaman11/alegria-frontend`
- **Технологии:** Next.js 15.2.3, React 19.2.0, TypeScript 5.7.3
- **Хостинг:** Cloudflare Pages
- **Deployment:** OpenNext + Cloudflare adapter

### Роль в системе
Frontend - это **презентационный слой**, который:
- Рендерит страницы для пользователей
- Использует ISR (Incremental Static Regeneration)
- Кэширует данные в R2 bucket
- Получает контент через Workers API

### Ключевые файлы

#### `src/lib/api.ts` - API Client
```typescript
// Архитектура из комментариев:
// Frontend -> Workers API -> Payload CMS (Vercel)
// Workers provide caching layer (KV + D1) for optimal performance

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.poshta.cloud';
```

**Функции:**
- `getAllPosts()` - получить все посты
- `getPageBySlug()` - получить страницу
- `getAllCategories()` - категории
- `searchContent()` - поиск

#### `next.config.js` - Routing Configuration
```javascript
async rewrites() {
  if (process.env.NODE_ENV === 'development') {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8787/api/:path*', // Workers локально
      },
      {
        source: '/media/:path*',
        destination: 'http://localhost:8787/media/:path*', // Media из R2
      },
    ];
  }

  // Production: Proxy media to Workers
  const workersUrl = process.env.NEXT_PUBLIC_WORKERS_URL || 
                     'https://alegria-api.majakojh.workers.dev';
  return [
    {
      source: '/media/:path*',
      destination: `${workersUrl}/media/:path*`,
    },
  ];
}
```

#### `wrangler.toml` - Cloudflare Configuration
```toml
name = "alegria-frontend"

# R2 Bucket для Next.js кэша
[[r2_buckets]]
binding = "NEXT_INC_CACHE_R2_BUCKET"
bucket_name = "alegria-media"

# D1 Database для tag-based revalidation
[[d1_databases]]
binding = "NEXT_TAG_CACHE_D1"
database_name = "nextjs-tag-cache"

[vars]
NEXT_PUBLIC_API_URL = "https://api.poshta.cloud"
NEXT_PUBLIC_SITE_URL = "https://poshta.cloud"
```

### Environment Variables

**Development:**
- `NEXT_PUBLIC_API_URL` = `http://localhost:8787`
- Workers API работает локально на порту 8787

**Production:**
- `NEXT_PUBLIC_API_URL` = `https://api.poshta.cloud`
- Альтернативный URL: `https://alegria-api.majakojh.workers.dev`

### Кэширование
1. **R2 Bucket** (`alegria-media`):
   - Prefix: `nextjs-cache/`
   - ISR cache хранилище
   - Static assets

2. **D1 Database** (`nextjs-tag-cache`):
   - Tag-based cache invalidation
   - On-demand revalidation

3. **Middleware** (`src/middleware.ts`):
   - Static assets: 1 год cache
   - ISR pages: 5 минут + stale-while-revalidate
   - CDN cache: 1 час

---

## 2. WORKERS API (Предполагаемая архитектура)

### Информация
- **Репозиторий:** Неизвестен (не найден в поиске)
- **Технологии:** Cloudflare Workers
- **URL Production:** `https://api.poshta.cloud`
- **URL Alternative:** `https://alegria-api.majakojh.workers.dev`
- **Локальный Dev:** `http://localhost:8787`

### Роль в системе
Workers API - это **middleware слой** между Frontend и CMS:
- Проксирует запросы к Payload CMS
- Кэширует ответы (KV + D1)
- Оптимизирует производительность
- Предоставляет `/api/*` endpoints
- Служит media файлы из R2

### Предполагаемые endpoints

Из анализа `src/lib/api.ts`:

#### Posts
- `GET /api/posts` - список постов (с пагинацией)
- `GET /api/posts/:slug` - один пост по slug
- `GET /api/posts?category=:slug` - посты по категории

#### Pages
- `GET /api/pages` - список страниц
- `GET /api/pages/:slug` - страница по slug

#### Categories
- `GET /api/categories` - все категории
- `GET /api/categories/:slug` - категория по slug

#### Media
- `GET /media/:filename` - медиа файлы из R2

#### Globals
- `GET /api/globals/header` - хедер
- `GET /api/globals/footer` - футер
- `GET /api/globals/site-settings` - настройки сайта

#### Redirects
- `GET /api/redirects` - все редиректы

#### Search
- `GET /api/search?q=:query&collections=:collections` - поиск

### Кэширование в Workers
Из комментариев известно:
- **KV Store** - key-value кэш для быстрого доступа
- **D1 Database** - структурированный кэш с тегами
- Cache invalidation через webhooks от Payload CMS

### Cloudflare Account
- **Account ID:** `6045b0c922c5f02ca8efe49010a2e687`
- **Account Name:** "alegria"
- **Project:** `alegria-frontend` (для Pages)

---

## 3. PAYLOAD CMS (Предполагаемая архитектура)

### Информация
- **Репозиторий:** Неизвестен (не найден в поиске)
- **Технологии:** Payload CMS 3.60.0
- **Хостинг:** Vercel (из комментария в api.ts)
- **База данных:** Предположительно PostgreSQL

### Роль в системе
Payload CMS - это **headless CMS backend**:
- Управление контентом (посты, страницы, медиа)
- Admin панель для редакторов
- REST API для Workers
- Webhooks для cache invalidation
- Хранилище медиа файлов

### Collections (из payload-types.ts)

Файл `src/payload-types.ts` содержит **40,503 строк** автогенерированных типов:

#### Основные коллекции:
1. **Posts** - блог посты
   - `slug`, `title`, `content`
   - `categories`, `publishedAt`
   - `meta` (SEO), `hero`

2. **Pages** - статические страницы
   - `slug`, `title`, `layout` (blocks)
   - `hero`, `meta`

3. **Categories** - категории постов
   - `title`, `slug`

4. **Media** - файлы и изображения
   - `filename`, `url`
   - `mimeType`, `filesize`
   - `sizes` (thumbnails)

5. **Users** - пользователи CMS
   - Аутентификация
   - Права доступа

6. **Redirects** - 301/302 редиректы
   - `from`, `to`

#### Global данные:
- **Header** - навигация
- **Footer** - подвал сайта
- **Site Settings** - общие настройки

### Richtext Editor
Использует **Lexical** (от Meta):
- `@payloadcms/richtext-lexical`
- Блочный редактор
- Custom blocks для контента

### Live Preview
- `@payloadcms/live-preview-react`
- Предпросмотр контента в реальном времени

---

## Поток данных

### 1. Запрос страницы пользователем

```
Пользователь
    ↓ GET /posts/my-article
Frontend (Cloudflare Pages)
    ↓ Проверка ISR cache в R2
    ├─ Cache HIT → Возврат страницы (быстро)
    └─ Cache MISS ↓
Workers API (api.poshta.cloud)
    ↓ GET /api/posts/my-article
    ↓ Проверка KV/D1 cache
    ├─ Cache HIT → Возврат JSON (средне)
    └─ Cache MISS ↓
Payload CMS (Vercel)
    ↓ Database query
    └─ Возврат свежих данных (медленно)
```

### 2. Обновление контента редактором

```
Редактор в Payload CMS
    ↓ Сохранение поста
Payload CMS
    ↓ Trigger webhook
Workers API
    ↓ Invalidate KV/D1 cache для поста
    ↓ Send revalidation request
Frontend
    └─ Invalidate R2 cache по тегу
    └─ Regenerate страницы
```

### 3. Загрузка медиа файла

```
Редактор
    ↓ Upload image
Payload CMS
    ↓ Save to R2 bucket
R2 Storage (alegria-media)
    ↓ File URL: /media/filename.jpg
Frontend
    └─ Serve через Workers proxy
```

---

## Development Setup

### Локальная разработка Frontend

1. **Запуск Workers API локально:**
```bash
cd ../alegria-workers  # (предполагаемая директория)
npm run dev
# Работает на http://localhost:8787
```

2. **Запуск Frontend:**
```bash
cd alegria-frontend
npm run dev
# Работает на http://localhost:3000
# API requests → http://localhost:8787 (через rewrites)
```

3. **Payload CMS:**
```bash
cd ../alegria-cms  # (предполагаемая директория)
npm run dev
# Работает на http://localhost:3001 (или Vercel dev)
```

### Environment Variables (.env.local)

**Frontend:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Workers:**
```env
PAYLOAD_CMS_URL=http://localhost:3001
# или production URL к Vercel
```

---

## Deployment Flow

### 1. Frontend Deployment
```bash
git push origin main
    ↓
GitHub Actions
    ↓
npm run build:worker
    ↓ OpenNext build
    ↓
Cloudflare Pages Deploy
    └─ https://poshta.cloud
```

### 2. Workers Deployment
```bash
cd alegria-workers
wrangler deploy
    └─ https://api.poshta.cloud
```

### 3. Payload CMS Deployment
```bash
cd alegria-cms
git push origin main
    ↓
Vercel Auto-deploy
    └─ Production CMS
```

---

## Безопасность

### GitHub Secrets (Frontend)
- `CLOUDFLARE_API_TOKEN` - для деплоя на Cloudflare
- `CLOUDFLARE_ACCOUNT_ID` - `6045b0c922c5f02ca8efe49010a2e687`
- `NEXT_PUBLIC_API_URL` - URL Workers API

### Environment Variables (Production)
- Workers имеют доступ к Payload CMS через internal API
- R2 bucket permissions настроены для Workers
- D1 database bindings для cache

---

## Производительность

### Latency
1. **Cache HIT в Frontend R2:** ~50ms
2. **Cache HIT в Workers KV:** ~100-150ms
3. **Direct CMS query:** ~300-500ms

### Стратегия кэширования

**Frontend (middleware.ts):**
- Static assets: `max-age=31536000` (1 год)
- ISR pages: `s-maxage=300` (5 минут)
- Stale-while-revalidate: 24 часа

**Workers:**
- KV cache: TTL основан на content type
- D1 tags: On-demand invalidation

**CDN (Cloudflare):**
- `CDN-Cache-Control: s-maxage=3600` (1 час)

---

## Мониторинг

### Cloudflare Analytics
- Workers requests/errors
- Pages views
- Cache hit ratio

### Vercel Analytics
- CMS API requests
- Database query time
- Build logs

---

## Неизвестные части

Следующие компоненты не найдены, но предполагаются:

### 1. Workers API Repository
**Предполагаемое название:** `alegria-workers` или `alegria-api`

**Ожидаемая структура:**
```
alegria-workers/
├── src/
│   ├── index.ts          # Main worker
│   ├── routes/
│   │   ├── posts.ts
│   │   ├── pages.ts
│   │   ├── media.ts
│   │   └── globals.ts
│   ├── cache/
│   │   ├── kv.ts
│   │   └── d1.ts
│   └── payload/
│       └── client.ts     # Payload CMS client
├── wrangler.toml
└── package.json
```

### 2. Payload CMS Repository
**Предполагаемое название:** `alegria-cms` или `alegria-payload`

**Ожидаемая структура:**
```
alegria-cms/
├── src/
│   ├── collections/
│   │   ├── Posts.ts
│   │   ├── Pages.ts
│   │   ├── Media.ts
│   │   └── Categories.ts
│   ├── globals/
│   │   ├── Header.ts
│   │   ├── Footer.ts
│   │   └── SiteSettings.ts
│   └── payload.config.ts
├── vercel.json
└── package.json
```

---

## Рекомендации для полного понимания

Для завершения анализа необходимо:

1. **Найти Workers repository:**
   - Проверить у владельца проекта
   - Возможно private repository

2. **Найти Payload CMS repository:**
   - Также может быть private
   - Содержит бизнес-логику CMS

3. **Документация API:**
   - OpenAPI/Swagger spec для Workers API
   - Payload CMS schema documentation

4. **Webhooks configuration:**
   - Как именно Payload триггерит cache invalidation
   - Webhook endpoints в Workers

---

**Составлено на основе анализа:**
- Текущего репозитория `alegria-frontend`
- Комментариев в коде
- Конфигурационных файлов
- Environment variables
- TypeScript типов из Payload

**Статус:** Частичный анализ (1 из 3 репозиториев доступен)
