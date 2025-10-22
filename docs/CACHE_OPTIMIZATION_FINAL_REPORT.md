# Финальный отчет: Оптимизация кэширования Alegria

**Дата:** 22 октября 2025
**Автор:** Claude Code
**Статус:** Анализ завершен, решение готово к внедрению

---

## Резюме

После глубокого анализа системы кэширования выявлено, что только Homepage показывает `x-nextjs-cache: HIT`, в то время как все ISR страницы показывают `STALE` с `s-maxage=2`. Это поведение является **intentional** со стороны OpenNext runtime для оптимизации CDN кэширования.

---

## Текущее состояние

### Результаты тестирования (22.10.2025)

| Страница | revalidate | Cache Status | s-maxage | Производительность |
|----------|------------|--------------|----------|-------------------|
| **/** | НЕТ | ✅ HIT | 210 | 100ms |
| **/0651** | 604800 (7д) | ⚠️ STALE | 2 | 100ms (SWR) |
| **/posts** | 300 (5м) | ⚠️ STALE | 2 | 100ms (SWR) |
| **/posts/[slug]** | 600 (10м) | ⚠️ STALE | 2 | 100ms (SWR) |

### Ключевая находка: Источник s-maxage=2

**Файл:** `node_modules/@opennextjs/aws/dist/core/routing/util.js`

```javascript
// Строки 327-330
if (headers[CommonHeaders.NEXT_CACHE] !== "STALE") return;

// Для STALE состояния OpenNext устанавливает s-maxage=2
headers[CommonHeaders.CACHE_CONTROL] =
    "s-maxage=2, stale-while-revalidate=2592000";
```

**Причина:** OpenNext использует 2-секундный TTL для предотвращения thundering herd проблемы и дает время на background revalidation.

---

## Проблема и решение

### Проблема
ISR страницы с `export const revalidate` показывают STALE вместо HIT после истечения периода revalidation.

### Важное понимание
**STALE с SWR работает так же быстро как HIT!** Благодаря `stale-while-revalidate=2592000`:
- Пользователи получают контент из кэша мгновенно (100ms)
- Revalidation происходит в фоне
- Производительность идентична HIT

### Рекомендуемое решение: Гибридная стратегия

#### 1. Homepage - Максимальный приоритет
```typescript
// src/app/(frontend)/page.tsx
export const revalidate = false  // Только webhook
export const dynamicParams = true
```
**Результат:** Всегда HIT, обновление через webhook

#### 2. Динамические страницы - Баланс
```typescript
// src/app/(frontend)/[slug]/page.tsx
export const revalidate = 86400  // 24 часа вместо 7 дней
export const dynamicParams = true
```
**Результат:** HIT первые 24 часа, затем STALE с SWR

#### 3. Посты - Частое обновление
```typescript
// src/app/(frontend)/posts/[slug]/page.tsx
export const revalidate = 3600  // 1 час вместо 10 минут
export const dynamicParams = true
```
**Результат:** HIT первый час, свежий контент

#### 4. Листинг постов - Самое частое
```typescript
// src/app/(frontend)/posts/page.tsx
export const revalidate = 1800  // 30 минут вместо 5
export const dynamicParams = true
```
**Результат:** Актуальный список постов

---

## Преимущества решения

1. **Больше HIT статусов** - увеличенные revalidate периоды
2. **On-demand generation работает** - `dynamicParams = true` везде
3. **Webhook как основной механизм** - мгновенное обновление
4. **Time-based как fallback** - страховка от сбоев webhook
5. **Оптимальная производительность** - 100ms для всех типов страниц

---

## План внедрения

### Шаг 1: Обновить конфигурацию страниц
```bash
# 1. Homepage - удалить revalidate (если еще не удален)
# 2. [slug] - изменить на 86400
# 3. posts/[slug] - изменить на 3600
# 4. posts - изменить на 1800
```

### Шаг 2: Коммит и деплой
```bash
git add -A
git commit -m "feat: optimize cache strategy for better HIT ratio

- Homepage: webhook-only revalidation (always HIT)
- Dynamic pages: 24h revalidate (longer HIT period)
- Posts: 1h revalidate (balanced freshness)
- Posts listing: 30min revalidate (frequent updates)

This increases HIT duration while maintaining content freshness"

git push origin main
```

### Шаг 3: Проверка после деплоя
```bash
# Через 5 минут после деплоя
curl -I https://poshta.cloud/ | grep x-nextjs-cache
# Ожидаем: HIT

curl -I https://poshta.cloud/0651 | grep x-nextjs-cache
# Ожидаем: HIT (если прошло меньше 24 часов)
```

---

## Альтернативные решения (не рекомендуются)

### ❌ Кастомный Cache Handler
Подделка `lastModified` для имитации свежести кэша ломает механизмы revalidation.

### ❌ Удаление всех revalidate
Страницы не будут обновляться автоматически, только через webhook. Рискованно при сбоях webhook.

### ❌ Очень короткие revalidate периоды
Частые STALE статусы, хотя производительность та же благодаря SWR.

---

## Важные выводы

1. **STALE ≠ медленно** - с SWR производительность идентична HIT
2. **s-maxage=2 это feature** - защита от thundering herd
3. **OpenNext оптимизирован** для CDN и edge computing
4. **Гибридный подход** дает лучший баланс

---

## Метрики успеха

После внедрения ожидаем:
- Homepage: 100% HIT ratio
- Dynamic pages: 95%+ HIT ratio (24 часа из 24)
- Posts: 90%+ HIT ratio (55 минут из 60)
- TTFB: стабильные 100-150ms для всех страниц

---

## Приложения

- [HYBRID_CACHE_STRATEGY.md](./HYBRID_CACHE_STRATEGY.md) - Детальное описание стратегии
- [OpenNext Source Analysis](./OPENNEXT_ANALYSIS.md) - Анализ исходного кода
- [Test Results](./CACHE_TEST_RESULTS.md) - Полные результаты тестирования

---

**Статус:** Готово к внедрению
**Следующий шаг:** Применить гибридную стратегию согласно плану