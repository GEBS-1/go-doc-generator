# 🚀 Создание тестового пользователя - Простая инструкция

## ✅ Что уже готово

1. ✅ `ADMIN_SECRET` добавлен на Render
2. ✅ API endpoint создан: `/api/admin/create-test-user`
3. ✅ Скрипт готов: `call-create-test-user.js`

## 📋 Что нужно сделать

### Шаг 1: Узнать URL backend сервиса

В Render Dashboard найдите URL вашего backend сервиса (например: `https://go-doc-generator-backend.onrender.com`)

### Шаг 2: Вызвать endpoint

**Вариант А: Через curl (самый простой)**

```bash
curl -X POST https://YOUR-BACKEND-URL.onrender.com/api/admin/create-test-user \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"ваш-admin-secret\"}"
```

**Вариант Б: Через скрипт**

```bash
cd backend
node call-create-test-user.js https://YOUR-BACKEND-URL.onrender.com ваш-admin-secret
```

## ✅ Результат

После успешного вызова вы получите данные для входа:
- Логин: `yookassa_test`
- Пароль: `YooKassa2025!Test`

## 📝 Что дальше

После создания пользователя обновите URL в `YOOKASSA_CREDENTIALS.txt` и отправьте файл Юкассе.

