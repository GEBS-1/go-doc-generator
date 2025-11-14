# Переменные окружения для Render

## 🔧 Frontend (Static Site)

### Обязательные переменные:

```env
VITE_REQUIRE_AUTH=true
VITE_BACKEND_URL=https://go-doc-generator-backend.onrender.com
VITE_TELEGRAM_BOT_USERNAME=PrePromo_bot
```

**Где добавить:**
1. Render Dashboard → Frontend Static Site
2. Settings → Environment
3. Добавьте все три переменные
4. **ВАЖНО:** После добавления нажмите **"Manual Deploy"** → **"Deploy latest commit"**

---

## 🔧 Backend (Web Service)

### Обязательные переменные:

```env
# База данных
DATABASE_URL=<Internal Database URL из PostgreSQL>
PGSSLMODE=require

# JWT
AUTH_JWT_SECRET=<ваш_секрет_минимум_32_символа>

# Telegram Bot
TELEGRAM_BOT_TOKEN=<ваш_токен_бота>
TELEGRAM_BOT_USERNAME=PrePromo_bot
FRONTEND_URL=https://ваш-фронт.onrender.com

# GigaChat API
GIGACHAT_CLIENT_ID=<ваш_client_id>
GIGACHAT_CLIENT_SECRET=<ваш_client_secret>
GIGACHAT_AUTH_KEY=<ваш_auth_key>
GIGACHAT_ALLOW_INSECURE_SSL=false

# CORS
ALLOWED_ORIGINS=https://ваш-фронт.onrender.com

# Server
HOST=0.0.0.0
PORT=10000
NODE_ENV=production
NODE_VERSION=18.x
```

**Где добавить:**
1. Render Dashboard → Backend Web Service
2. Settings → Environment
3. Добавьте все переменные
4. Backend автоматически перезапустится

---

## ⚠️ ВАЖНО

### Vite переменные (VITE_*)
- **Встраиваются в код во время СБОРКИ**
- Если добавили переменные ПОСЛЕ сборки - они НЕ будут работать
- **Обязательно делайте Manual Deploy после добавления переменных**

### Проверка переменных
После деплоя проверьте в браузере (F12 → Console):
```javascript
console.log('VITE_REQUIRE_AUTH:', import.meta.env.VITE_REQUIRE_AUTH);
console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
console.log('VITE_TELEGRAM_BOT_USERNAME:', import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
```

Должны быть значения, а не `undefined`!

