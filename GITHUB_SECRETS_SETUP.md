# GitHub Secrets Setup для Cloudflare Pages Deployment

## Требуемые шаги

### 1. Создать Cloudflare API Token

Перейти на: https://dash.cloudflare.com/profile/api-tokens

**Инструкции:**
1. Нажать "Create Token"
2. Выбрать "Custom Token"
3. Дать имя: "GitHub Actions - alegria-frontend"
4. Выбрать Account: "alegria" (6045b0c922c5f02ca8efe49010a2e687)
5. Permissions:
   - Workers and Pages (Edit)
   - Account Settings (Read)
6. Скопировать токен

---

### 2. Добавить GitHub Secrets

Перейти на: https://github.com/iamaman11/alegria-frontend/settings/secrets/actions

**Требуемые секреты (всего 3):**

#### 1. CLOUDFLARE_API_TOKEN
- Значение: [Скопированный токен из шага 1]

#### 2. CLOUDFLARE_ACCOUNT_ID
- Значение: `6045b0c922c5f02ca8efe49010a2e687`

#### 3. NEXT_PUBLIC_API_URL
- Значение: [URL вашего API]
- Пример: `https://alegria-api.majakojh.workers.dev`

---

## Проверка

После добавления всех секретов:

1. Перейти в репозиторий: https://github.com/iamaman11/alegria-frontend
2. Выбрать вкладку "Actions"
3. Выбрать workflow "Deploy to Cloudflare Pages"
4. Workflow должен автоматически запуститься при push в main branch

**Статус workflow:**
- ✅ Success - деплой успешен
- ❌ Failure - проверить logs для диагностики

---

## Troubleshooting

### Ошибка: "API token is invalid"
- Убедиться, что токен скопирован полностью
- Проверить, что токен имеет нужные permissions

### Ошибка: "Project name not found"
- Убедиться, что имя проекта в workflow совпадает: `alegria-frontend`
- Проверить, что CLOUDFLARE_ACCOUNT_ID верный

### Ошибка: "Build failed"
- Проверить, что NEXT_PUBLIC_* переменные установлены
- Посмотреть logs в GitHub Actions для детальной информации

---

**Дата:** 2025-10-16
**Статус:** Готово к настройке
