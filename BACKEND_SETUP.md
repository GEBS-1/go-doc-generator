# 🚀 Настройка Backend Proxy для GigaChat API

## ✅ **Ответ на ваш вопрос:**

**ДА, предоставленный шаблон подойдет**, но я его **улучшил и адаптировал** под ваш проект:

### **Что исправлено:**

1. ✅ **OAuth авторизация** — используется правильный метод (Basic Auth, не JSON body)
2. ✅ **CORS middleware** — добавлен для разрешения запросов из браузера
3. ✅ **Кэширование токенов** — токены кэшируются на сервере (30 минут)
4. ✅ **Совместимость с frontend** — endpoints совпадают с тем, что ожидает ваш frontend
5. ✅ **Обработка ошибок** — улучшена с понятными сообщениями
6. ✅ **Health check** — добавлен endpoint для проверки статуса

---

## 📋 **Быстрая установка**

### **Шаг 1: Установите зависимости**

```bash
cd backend
npm install
```

### **Шаг 2: Настройте .env файл**

Скопируйте `.env.example` в `.env`:

```bash
copy .env.example .env
```

Откройте `.env` и заполните:

```env
GIGACHAT_CLIENT_ID=ваш_client_id
GIGACHAT_CLIENT_SECRET=ваш_client_secret
PORT=3001
ALLOWED_ORIGINS=http://localhost:8080
```

### **Шаг 3: Запустите backend**

```bash
npm run dev
```

Backend запустится на `http://localhost:3001`

---

## 🔧 **Интеграция с Frontend**

### **Обновите `src/lib/gigachat.ts`:**

Найдите строки:

```typescript
const isDevelopment = import.meta.env.DEV;
const GIGACHAT_OAUTH_URL = isDevelopment 
  ? '/api/gigachat-oauth/api/v2/oauth'
  : 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
```

Замените на:

```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

const GIGACHAT_OAUTH_URL = isProduction
  ? `${BACKEND_URL}/api/gigachat-oauth/api/v2/oauth`
  : isDevelopment
  ? '/api/gigachat-oauth/api/v2/oauth'  // Vite proxy
  : 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';

const GIGACHAT_API_URL = isProduction
  ? `${BACKEND_URL}/api/gigachat-api/api/v1/chat/completions`
  : isDevelopment
  ? '/api/gigachat-api/api/v1/chat/completions'  // Vite proxy
  : 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
```

### **Добавьте в `.env` frontend:**

```env
VITE_BACKEND_URL=http://localhost:3001
```

---

## 📡 **API Endpoints**

Backend предоставляет следующие endpoints:

### **1. Health Check**
```
GET /health
```
Проверка статуса сервера

### **2. OAuth Proxy**
```
POST /api/gigachat-oauth/*
```
Получение OAuth токена

### **3. GigaChat API Proxy**
```
POST /api/gigachat-api/*
```
Проксирование запросов к GigaChat API

### **4. Упрощенный Generate**
```
POST /api/gigachat/generate
```
Упрощенный endpoint для генерации текста

---

## 🎯 **Как это работает**

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│   Браузер   │───▶│ Backend API  │───▶│  GigaChat API    │
│  Frontend   │    │  (Node.js)   │    │  (ngw.devices)   │
└─────────────┘    └──────────────┘    └──────────────────┘
     ✅ CORS          ✅ НЕТ CORS          ✅ НЕТ CORS
```

1. **Frontend** отправляет запрос на `http://localhost:3001/api/gigachat-api/...`
2. **Backend** получает токен (или использует из кэша)
3. **Backend** отправляет запрос к GigaChat API от своего имени
4. **Backend** возвращает ответ frontend'у

---

## ✅ **Преимущества**

- ✅ **CORS решен** — запросы идут через backend
- ✅ **Безопасность** — API ключи только на сервере
- ✅ **Кэширование** — токены кэшируются, меньше запросов
- ✅ **Обработка ошибок** — понятные сообщения
- ✅ **Совместимость** — работает с вашим frontend кодом

---

## 🧪 **Тестирование**

### **1. Проверьте backend:**

```bash
curl http://localhost:3001/health
```

Должен вернуть:
```json
{
  "status": "ok",
  "timestamp": "...",
  "tokenCached": false
}
```

### **2. Проверьте OAuth:**

```bash
curl -X POST http://localhost:3001/api/gigachat-oauth/test
```

Должен вернуть токен (если .env настроен)

### **3. Запустите frontend:**

```bash
npm run dev
```

Откройте `http://localhost:8080/generator` и создайте документ.

---

## 🚀 **Деплой в Production**

### **Для Vercel/Netlify:**

Используйте Serverless Functions (см. `backend/README.md`)

### **Для VPS:**

```bash
npm install -g pm2
pm2 start backend/server.js --name gigachat-proxy
pm2 save
pm2 startup
```

### **Для Railway/Heroku:**

Просто подключите репозиторий и добавьте environment variables в настройках.

---

## 📚 **Дополнительная информация**

См. `backend/README.md` для полной документации.

---

**Готово!** Backend готов к использованию. 🎉
