# 📁 Куда добавлять переменные окружения

## ✅ Ответ: В `backend/.env`

**Все переменные YooKassa добавляются в файл `backend/.env`**, потому что:

1. ✅ Backend использует `require('dotenv').config()` - ищет `.env` в папке `backend/`
2. ✅ Все переменные YooKassa используются только в `backend/server.js`
3. ✅ Frontend не имеет доступа к этим переменным (и не должен)

---

## 📂 Структура файлов `.env`:

### 1. **`backend/.env`** (для бэкенда) ⬅️ СЮДА ДОБАВЛЯТЬ

```env
# YooKassa (обязательно)
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=test_ваш_ключ

# URLs для оплаты (обязательно для локального тестирования)
FRONTEND_URL=http://localhost:8080
PAYMENT_RETURN_URL=http://localhost:8080/payment/success
PAYMENT_FAIL_URL=http://localhost:8080/payment/failed

# Другие переменные backend
AUTH_JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
DATABASE_URL=postgres://...
```

**Где находится**: `D:\Python\Github\go-doc-generator\backend\.env`

---

### 2. **`.env` в корне** (для фронтенда)

```env
# Frontend переменные (с префиксом VITE_)
VITE_GIGACHAT_AUTH_KEY=ваш_ключ
VITE_BACKEND_URL=http://localhost:3001
VITE_TELEGRAM_BOT_USERNAME=your_bot_name
```

**Где находится**: `D:\Python\Github\go-doc-generator\.env`

**Важно**: 
- Frontend переменные имеют префикс `VITE_`
- Они доступны в браузере (не секретные!)
- НЕ добавляйте сюда YooKassa ключи (безопасность!)

---

## 🔍 Как проверить, где используется переменная:

### В backend (backend/server.js):
```javascript
// Эти переменные берутся из backend/.env
const {
  YOOKASSA_SHOP_ID,      // ← из backend/.env
  YOOKASSA_SECRET_KEY,   // ← из backend/.env
  FRONTEND_URL,          // ← из backend/.env
  PAYMENT_RETURN_URL,    // ← из backend/.env
} = process.env;
```

### В frontend (src/...):
```typescript
// Эти переменные берутся из корневого .env
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL; // ← из .env в корне
const AUTH_KEY = import.meta.env.VITE_GIGACHAT_AUTH_KEY; // ← из .env в корне
```

---

## ✅ Итоговая инструкция:

### Шаг 1: Создайте файл `backend/.env`

```bash
cd backend
copy env.example .env
# или просто создайте новый файл .env
```

### Шаг 2: Добавьте переменные YooKassa в `backend/.env`

```env
YOOKASSA_SHOP_ID=ваш_shop_id
YOOKASSA_SECRET_KEY=test_ваш_секретный_ключ
FRONTEND_URL=http://localhost:8080
PAYMENT_RETURN_URL=http://localhost:8080/payment/success
PAYMENT_FAIL_URL=http://localhost:8080/payment/failed
```

### Шаг 3: Перезапустите backend

```bash
cd backend
npm run dev
```

---

## ⚠️ ВАЖНО:

- ❌ **НЕ добавляйте** YooKassa ключи в корневой `.env` (это для frontend)
- ✅ **Добавляйте** YooKassa ключи в `backend/.env` (это для backend)
- 🔒 YooKassa ключи - это **секретные данные**, они должны быть только на сервере

---

## 📝 Пример полного `backend/.env`:

```env
# Database
DATABASE_URL=postgres://user:password@host:5432/database

# Auth
AUTH_JWT_SECRET=your-jwt-secret-key
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRSTuvWXyz

# YooKassa Payment Gateway
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=test_MjIyNjMyNzQzNC0xLVBTVS1OdmVjT...

# Frontend URLs (для возврата после оплаты)
FRONTEND_URL=http://localhost:8080
PAYMENT_RETURN_URL=http://localhost:8080/payment/success
PAYMENT_FAIL_URL=http://localhost:8080/payment/failed

# CORS
ALLOWED_ORIGINS=http://localhost:8080
```

---

## 🎯 Резюме:

| Переменная | Файл | Причина |
|------------|------|---------|
| `YOOKASSA_SHOP_ID` | `backend/.env` | Используется только в backend |
| `YOOKASSA_SECRET_KEY` | `backend/.env` | Секретный ключ, только на сервере |
| `FRONTEND_URL` | `backend/.env` | Нужен backend для формирования ссылок |
| `PAYMENT_RETURN_URL` | `backend/.env` | Используется при создании платежа |
| `VITE_BACKEND_URL` | `.env` (корень) | Нужен frontend для API запросов |

