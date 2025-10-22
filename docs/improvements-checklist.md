# Checklist: Применение экспертных рекомендаций

**Дата начала:** 22 октября 2025
**Ветка:** `claude/apply-expert-recommendations-011CUP378KipZAJPXUECLcMG`
**Базовый отчет:** `docs/expert-review-2025-10-22.md`

---

## 🔴 КРИТИЧЕСКИЙ ПРИОРИТЕТ

### 1. Build Configuration - Включить валидацию
- [ ] **Файл:** `next.config.js:54-61`
- [ ] Включить `typescript.ignoreBuildErrors: false`
- [ ] Включить `eslint.ignoreDuringBuilds: false`
- [ ] Запустить `npm run build` и проверить ошибки
- [ ] Исправить все TypeScript errors
- [ ] Исправить все ESLint errors
- [ ] **Время:** 1 день
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Начало: _______
Окончание: _______
Найдено ошибок: _______
Исправлено: _______
```

---

### 2. Package Manager - Выбор единого менеджера
- [ ] **Файлы:** `package-lock.json`, `pnpm-lock.yaml`
- [ ] Выбрать package manager (рекомендуется: npm)
- [ ] Удалить лишний lock файл
- [ ] Добавить в `.gitignore`
- [ ] Переустановить зависимости
- [ ] Проверить `npm list` на UNMET DEPENDENCIES
- [ ] **Время:** 30 минут
- [ ] **Статус:** ⏳ Не начато

**Решение:** _______ (npm / pnpm)

**Результат:**
```
Выбран: _______
UNMET DEPENDENCIES до: 10+
UNMET DEPENDENCIES после: _______
```

---

### 3. Console Statements - Очистка production кода
- [ ] **Файлы:** 59 вхождений в 11 файлах
- [ ] Создать `src/lib/logger.ts` с условным логированием
- [ ] Заменить в `src/lib/api.ts` (29 statements)
- [ ] Заменить в `src/lib/api-diagnostic.ts` (14 statements)
- [ ] Очистить остальные 8 файлов
- [ ] Проверить: `grep -r "console\.log" src/ --exclude-dir=node_modules`
- [ ] **Время:** 2 часа
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Console.log до: 59
Console.log после: _______
Production console.log: 0 (удаляются компилятором)
```

---

## 🟠 ВЫСОКИЙ ПРИОРИТЕТ

### 4. useClickableCard Hook - Исправить зависимости
- [ ] **Файл:** `src/utilities/useClickableCard.ts:52-96`
- [ ] Удалить `eslint-disable-next-line`
- [ ] Убрать refs из массива зависимостей
- [ ] Использовать `.current` внутри callback
- [ ] Пустой массив зависимостей `[]`
- [ ] Протестировать работу кликов
- [ ] **Время:** 30 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Eslint warnings до: 3
Eslint warnings после: _______
Работает корректно: ✅ / ❌
```

---

### 5. Card Component - Добавить мемоизацию
- [ ] **Файл:** `src/components/Card/index.tsx`
- [ ] Импортировать `memo` из React
- [ ] Обернуть компонент в `memo()`
- [ ] Добавить `Card.displayName = 'Card'`
- [ ] Проверить производительность в DevTools
- [ ] **Время:** 5 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Re-renders в списках до: _______
Re-renders после: _______
```

---

### 6. VideoMedia - Завершить реализацию
- [ ] **Файл:** `src/components/Media/VideoMedia/index.tsx:16-24`
- [ ] Раскомментировать `setShowFallback(true)`
- [ ] Добавить cleanup function
- [ ] Использовать named function для handler
- [ ] Добавить return с removeEventListener
- [ ] Протестировать fallback
- [ ] **Время:** 15 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Memory leaks: Исправлено ✅ / ❌
Fallback работает: ✅ / ❌
```

---

### 7. PayloadRedirects - Убрать unsafe casting
- [ ] **Файл:** `src/components/PayloadRedirects/index.tsx:30`
- [ ] Создать type guard `isPage()`
- [ ] Создать type guard `isPost()`
- [ ] Заменить `as Page | Post` на runtime проверку
- [ ] Добавить обработку ошибки
- [ ] **Время:** 30 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Type safety: Улучшена ✅ / ❌
Runtime checks: Добавлены ✅ / ❌
```

---

## 🟡 СРЕДНИЙ ПРИОРИТЕТ

### 8. Security Headers - Добавить недостающие
- [ ] **Файл:** `src/middleware.ts:55-56`
- [ ] Добавить `Referrer-Policy`
- [ ] Добавить `Permissions-Policy`
- [ ] (Опционально) Добавить `Content-Security-Policy`
- [ ] Протестировать на securityheaders.com
- [ ] **Время:** 30 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Security headers до: 2
Security headers после: _______
Security score: _______/A+
```

---

### 9. Video Accessibility - Добавить контролы
- [ ] **Файл:** `src/components/Media/VideoMedia/index.tsx:30-42`
- [ ] Изменить `controls={false}` на `controls={true}`
- [ ] Добавить `aria-label={alt || 'Video content'}`
- [ ] Добавить `title={alt}`
- [ ] Проверить keyboard navigation
- [ ] **Время:** 5 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
WCAG Level: AA ✅ / ❌
Keyboard accessible: ✅ / ❌
```

---

### 10. Card Image Fallback - Улучшить UX
- [ ] **Файл:** `src/components/Card/index.tsx:33-38`
- [ ] Импортировать `ImageIcon` из lucide-react
- [ ] Добавить `role="img"`
- [ ] Добавить `aria-label="No preview image available"`
- [ ] Стилизовать placeholder
- [ ] **Время:** 10 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
UX улучшен: ✅ / ❌
A11y добавлена: ✅ / ❌
```

---

### 11. Button Type Attributes - Добавить type="button"
- [ ] **Файл:** `src/components/BeforeDashboard/SeedButton/index.tsx:82`
- [ ] Добавить `type="button"` к button элементу
- [ ] Проверить другие button элементы в проекте
- [ ] **Время:** 5 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Кнопок без type до: _______
Кнопок без type после: 0
```

---

## 🟢 НИЗКИЙ ПРИОРИТЕТ

### 12. CSS Dark Mode - Исправить синтаксис
- [ ] **Файл:** `src/app/(frontend)/globals.css:77`
- [ ] Заменить `--border: 0, 0%, 15%, 0.8`
- [ ] На `--border: 0 0% 15% / 0.8`
- [ ] Проверить визуально в dark mode
- [ ] **Время:** 2 минуты
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Синтаксис корректен: ✅ / ❌
Visual regression: Нет ✅ / Есть ❌
```

---

### 13. Robots.txt - Создать файл
- [ ] **Файл:** `public/robots.txt` (новый)
- [ ] Создать базовый robots.txt
- [ ] Добавить Sitemap URL
- [ ] Disallow /api/
- [ ] Disallow /_next/
- [ ] Проверить через Google Search Console
- [ ] **Время:** 5 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
Файл создан: ✅ / ❌
Sitemap добавлен: ✅ / ❌
```

---

### 14. Preconnect Hints - Добавить для API
- [ ] **Файл:** `src/app/layout.tsx:25-28`
- [ ] Добавить `<link rel="preconnect">`
- [ ] Добавить `<link rel="dns-prefetch">`
- [ ] Для `https://api.poshta.cloud`
- [ ] Измерить улучшение в Network tab
- [ ] **Время:** 5 минут
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
DNS lookup время до: _______ ms
DNS lookup время после: _______ ms
Улучшение: _______ ms
```

---

### 15. README - Обновить документацию
- [ ] **Файл:** `README.md`
- [ ] Описать реальную архитектуру
- [ ] Добавить Environment Variables
- [ ] Добавить Deployment инструкции
- [ ] Добавить структуру проекта
- [ ] Добавить Development setup
- [ ] **Время:** 1 час
- [ ] **Статус:** ⏳ Не начато

**Результат:**
```
README обновлен: ✅ / ❌
Полнота документации: _______/10
```

---

## 📊 ПРОГРЕСС

### Общая статистика:
- **Всего задач:** 15
- **Завершено:** 0
- **В процессе:** 0
- **Не начато:** 15

### По приоритетам:
- 🔴 **Критический:** 0/3 (0%)
- 🟠 **Высокий:** 0/4 (0%)
- 🟡 **Средний:** 0/4 (0%)
- 🟢 **Низкий:** 0/4 (0%)

### Затраченное время:
- **План:** ~12 часов
- **Факт:** _______ часов
- **Эффективность:** _______%

---

## 🎯 ЦЕЛИ

### После завершения всех задач:

**Code Quality:**
- ✅ TypeScript errors: 0
- ✅ ESLint errors: 0
- ✅ Console.log в production: 0
- ✅ Memory leaks: 0

**Performance:**
- ✅ Мемоизация компонентов
- ✅ Оптимизированные хуки
- ✅ DNS preconnect

**Security:**
- ✅ Security headers: 4+
- ✅ Нет hardcoded secrets
- ✅ Type safety

**Accessibility:**
- ✅ WCAG Level AA
- ✅ Keyboard navigation
- ✅ ARIA labels

**SEO:**
- ✅ robots.txt
- ✅ Sitemap
- ✅ Meta tags

**Documentation:**
- ✅ README актуален
- ✅ Чеклист выполнен
- ✅ Отчет обновлен

---

## 📝 ПРИМЕЧАНИЯ

**Исключения:**
- ❌ Sentry (внешний сервис)
- ❌ Error monitoring (внешний сервис)
- ❌ Analytics (внешний сервис)

**Следующие шаги после чеклиста:**
1. Запустить полный build
2. Протестировать в production режиме
3. Проверить Lighthouse scores
4. Создать Pull Request
5. Code review

---

**Последнее обновление:** 22 октября 2025
