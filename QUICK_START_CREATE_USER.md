# ⚡ Быстрый старт: Создание тестового пользователя

## ✅ Что уже сделано

1. ✅ `ADMIN_SECRET` добавлен на Render (вы это сделали)
2. ✅ API endpoint готов: `/api/admin/create-test-user`
3. ✅ Страница входа готова: `/auth/test-login`

## 🚀 Создание пользователя - 2 шага

### Шаг 1: Узнайте URL вашего backend

В Render Dashboard:
1. Откройте ваш **Backend сервис**
2. Посмотрите URL вверху страницы или в разделе "Info"
3. Например: `https://go-doc-generator-backend.onrender.com`

### Шаг 2: Вызовите API

**Способ 1: Через браузер (самый простой)**

1. Откройте любой REST клиент (например: https://reqbin.com/curl или Postman)
2. Создайте POST запрос:
   - **URL:** `https://YOUR-BACKEND-URL.onrender.com/api/admin/create-test-user`
   - **Method:** POST
   - **Headers:** `Content-Type: application/json`
   - **Body:**
     ```json
     {
       "secret": "ваш-admin-secret-который-вы-добавили"
     }
     ```
3. Нажмите "Send"

**Способ 2: Через curl**

```bash
curl -X POST https://YOUR-BACKEND-URL.onrender.com/api/admin/create-test-user \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"ваш-admin-secret\"}"
```

## ✅ После создания

Вы получите:
- Логин: `yookassa_test`
- Пароль: `YooKassa2025!Test`

Обновите `YOOKASSA_CREDENTIALS.txt` с вашим URL и отправьте Юкассе!

