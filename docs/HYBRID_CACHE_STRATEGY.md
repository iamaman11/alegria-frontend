# Гибридная стратегия кэширования для Alegria

## Оптимальная конфигурация для разных типов страниц

### 1. Homepage (/) - Критически важная
```typescript
// src/app/(frontend)/page.tsx
export const revalidate = false  // Только webhook
export const dynamicParams = true
```
**Почему:** Главная страница должна всегда показывать HIT и обновляться мгновенно через webhook.

### 2. Динамические страницы ([slug]) - Баланс
```typescript
// src/app/(frontend)/[slug]/page.tsx
export const revalidate = 86400  // 24 часа (вместо 7 дней)
export const dynamicParams = true
```
**Почему:**
- Новые страницы генерируются on-demand ✅
- HIT сохраняется 24 часа (вместо 10 минут для постов)
- Webhook обновляет мгновенно при изменениях
- Автообновление раз в сутки как fallback

### 3. Посты (posts/[slug]) - Частое обновление
```typescript
// src/app/(frontend)/posts/[slug]/page.tsx
export const revalidate = 3600  // 1 час (вместо 10 минут)
export const dynamicParams = true
```
**Почему:** Блог обновляется чаще, но 1 час достаточно для HIT.

### 4. Листинг постов (posts) - Самое частое
```typescript
// src/app/(frontend)/posts/page.tsx
export const revalidate = 1800  // 30 минут (вместо 5)
export const dynamicParams = true
```
**Почему:** Список должен быть относительно свежим.

### 5. Поиск (search) - Всегда динамический
```typescript
// src/app/(frontend)/search/page.tsx
export const dynamic = 'force-dynamic'  // Без кэша
```
**Почему:** Результаты поиска должны быть актуальными.

## Преимущества гибридного подхода

1. **On-demand generation работает везде** благодаря `dynamicParams = true`
2. **Больше HIT, меньше STALE** за счет увеличенных revalidate периодов
3. **Webhook как основной механизм** обновления
4. **Time-based как fallback** на случай если webhook не сработал
5. **Разная стратегия для разного контента**

## Webhook реализация в Workers API

```typescript
// workers/src/cache-invalidation.ts
export async function handleCacheInvalidation(slug: string, type: 'page' | 'post') {
  // 1. Очистить R2 cache
  await env.R2_BUCKET.delete(`nextjs-cache/routes/${slug}.rsc`)
  await env.R2_BUCKET.delete(`nextjs-cache/routes/${slug}.html`)

  // 2. Очистить Cloudflare CDN
  await purgeCache([
    `https://poshta.cloud/${slug}`,
    `https://poshta.cloud/posts/${slug}`,
  ])

  // 3. Опционально: pre-warm новый кэш
  if (env.PRE_WARM_CACHE === 'true') {
    await fetch(`https://poshta.cloud/${slug}`, {
      headers: { 'x-prerender-bypass': env.PRERENDER_TOKEN }
    })
  }
}
```

## Тестирование

После применения изменений:

```bash
# Homepage должна показывать HIT всегда
curl -I https://poshta.cloud/ | grep x-nextjs-cache
# Ожидаем: x-nextjs-cache: HIT

# Динамические страницы - HIT первые 24 часа
curl -I https://poshta.cloud/about | grep x-nextjs-cache
# Ожидаем: x-nextjs-cache: HIT (если меньше 24ч с генерации)

# Новая страница из CMS - генерируется on-demand
curl -I https://poshta.cloud/новая-страница | grep x-nextjs-cache
# Ожидаем: x-nextjs-cache: MISS (первый раз), затем HIT
```

## Итог

Эта стратегия обеспечивает:
- ✅ On-demand generation для новых страниц из CMS
- ✅ Больше HIT статусов (за счет увеличенных периодов)
- ✅ Мгновенное обновление через webhook
- ✅ Fallback через time-based revalidation
- ✅ Оптимальный баланс между свежестью и производительностью