# 🚀 Создание тестового пользователя через curl

## 📋 Что нужно

1. ✅ `ADMIN_SECRET` уже добавлен на Render (вы это сделали)
2. 🔍 Нужен URL вашего backend сервиса на Render

## 🔍 Где найти URL backend сервиса

1. Зайдите в **Render Dashboard**
2. Откройте ваш **Backend сервис** (например, "go-doc-generator-backend")
3. В разделе "Info" вы увидите URL, например:
   - `https://go-doc-generator-backend.onrender.com`
   - Или другой URL, если у вас своё имя

## 🚀 Создание пользователя

### Вариант 1: Через curl (самый простой)

Замените `YOUR_BACKEND_URL` на ваш реальный URL backend:

```bash
curl -X POST https://YOUR_BACKEND_URL.onrender.com/api/admin/create-test-user \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"admin-secret-2025-yookassa\"}"
```

**Пример:**
```bash
curl -X POST https://go-doc-generator-backend.onrender.com/api/admin/create-test-user \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"admin-secret-2025-yookassa\"}"
```

### Вариант 2: Через Node.js скрипт

Если у вас установлен Node.js:

```bash
cd backend
node call-create-test-user.js https://YOUR_BACKEND_URL.onrender.com admin-secret-2025-yookassa
```

## ✅ Ожидаемый результат

После успешного вызова вы получите:

```json
{
  "success": true,
  "credentials": {
    "login": "yookassa_test",
    "password": "YooKassa2025!Test"
  },
  "message": "Тестовый пользователь успешно создан"
}
```

## 📝 Что дальше

После создания пользователя:
1. Обновите URL в файле `YOOKASSA_CREDENTIALS.txt`
2. Отправьте файл команде Юкассы

