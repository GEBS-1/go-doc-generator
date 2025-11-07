# Backend Proxy для GigaChat API

Backend сервер для проксирования запросов к GigaChat API, решающий проблемы CORS и защищающий API ключи.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd backend
npm install
```

### 2. Настройка .env файла

Скопируйте `.env.example` в `.env`:

```bash
copy .env.example .env
```

Заполните `.env` файл:

```env
GIGACHAT_CLIENT_ID=ваш_client_id
GIGACHAT_CLIENT_SECRET=ваш_client_secret
PORT=3001
ALLOWED_ORIGINS=http://localhost:8080
```

### 3. Запуск сервера

**Development (с auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Сервер запустится на `http://localhost:3001`

## 📡 API Endpoints

### 1. Health Check
```http
GET /health
```

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T10:00:00.000Z",
  "tokenCached": true
}
```

### 2. OAuth Proxy
```http
POST /api/gigachat-oauth/*
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJ..."
}
```

### 3. GigaChat API Proxy
```http
POST /api/gigachat-api/*
```

**Тело запроса:**
```json
{
  "model": "GigaChat",
  "messages": [
    { "role": "user", "content": "Привет!" }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### 4. Упрощенный Generate Endpoint
```http
POST /api/gigachat/generate
```

**Тело запроса:**
```json
{
  "prompt": "Напиши текст о...",
  "systemPrompt": "Ты эксперт...",
  "max_tokens": 2048,
  "temperature": 0.7
}
```

**Ответ:**
```json
{
  "choices": [
    {
      "message": {
        "content": "Сгенерированный текст..."
      }
    }
  ]
}
```

## 🔧 Интеграция с Frontend

### Обновите `src/lib/gigachat.ts`:

```typescript
// Для production используйте backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const isProduction = import.meta.env.PROD;

const GIGACHAT_OAUTH_URL = isProduction
  ? `${BACKEND_URL}/api/gigachat-oauth/api/v2/oauth`
  : '/api/gigachat-oauth/api/v2/oauth';

const GIGACHAT_API_URL = isProduction
  ? `${BACKEND_URL}/api/gigachat-api/api/v1/chat/completions`
  : '/api/gigachat-api/api/v1/chat/completions';
```

### Добавьте в `.env` frontend:
```env
VITE_BACKEND_URL=http://localhost:3001
```

## 🔒 Безопасность

- ✅ API ключи хранятся только на сервере
- ✅ CORS настроен для разрешенных origins
- ✅ Токены кэшируются на сервере
- ✅ Обработка ошибок с понятными сообщениями

## 🛠️ Для Production

1. **HTTPS**: Используйте HTTPS для всех соединений
2. **Rate Limiting**: Добавьте rate limiting (например, `express-rate-limit`)
3. **Environment Variables**: Храните секреты в безопасном месте (не в коде!)
4. **Logging**: Добавьте логирование (например, `winston`)
5. **Redis**: Используйте Redis для кэширования токенов вместо памяти

### Пример с rate limiting:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов
});

app.use('/api/', limiter);
```

## 📦 Деплой

### Heroku:
```bash
heroku create your-app-name
heroku config:set GIGACHAT_CLIENT_ID=your_id
heroku config:set GIGACHAT_CLIENT_SECRET=your_secret
git push heroku main
```

### Railway:
1. Подключите GitHub репозиторий
2. Добавьте environment variables в настройках
3. Railway автоматически обнаружит `package.json` и запустит сервер

### VPS (PM2):
```bash
npm install -g pm2
pm2 start server.js --name gigachat-proxy
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

**Ошибка: "GIGACHAT_CLIENT_ID не установлен"**
- Проверьте, что `.env` файл существует в папке `backend/`
- Убедитесь, что переменные установлены правильно

**Ошибка: "CORS blocked"**
- Проверьте `ALLOWED_ORIGINS` в `.env`
- Убедитесь, что ваш frontend URL включен в список

**Ошибка: "Connection timeout"**
- Проверьте интернет соединение
- Убедитесь, что GigaChat API доступен

## 📚 Дополнительные ресурсы

- [GigaChat API Documentation](https://developers.sber.ru/gigachat)
- [Express.js Documentation](https://expressjs.com/)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

