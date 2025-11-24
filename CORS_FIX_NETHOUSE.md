# 🔧 Исправление CORS ошибки после переноса домена

## ❌ Проблема

После переноса домена возникла CORS ошибка:
```
Access to fetch at 'https://www.prepromo.online/api/auth/telegram-token' 
from origin 'https://prepromo.online' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
Redirect is not allowed for a preflight request.
```

**Причина:**
- Frontend: `https://prepromo.online` (без www)
- Backend: `https://www.prepromo.online` (с www)
- Несоответствие доменов и возможный редирект вызывают CORS ошибку

---

## ✅ Решение

### Вариант 1: Использовать поддомен `api` для backend (рекомендуется)

#### 1.1. Настрой DNS записи на Nethouse

**Удали старую запись:**
- Если есть CNAME для `www` → `go-doc-generator-backend.onrender.com` — удали её

**Добавь новую запись:**
```
Тип:     CNAME
Имя:     api
Значение: go-doc-generator-backend.onrender.com
TTL:     3600
```

**Результат:**
- Frontend: `https://prepromo.online`
- Backend: `https://api.prepromo.online`

---

#### 1.2. Обнови переменные окружения на Render

**Frontend (Static Site) → Environment:**

```env
VITE_BACKEND_URL=https://api.prepromo.online
VITE_TELEGRAM_BOT_USERNAME=твой_бот
VITE_REQUIRE_AUTH=true
```

**Backend (Web Service) → Environment:**

```env
FRONTEND_URL=https://prepromo.online
ALLOWED_ORIGINS=https://prepromo.online,https://www.prepromo.online
AUTH_JWT_SECRET=<твой_секрет>
TELEGRAM_BOT_TOKEN=<твой_токен>
GIGACHAT_AUTH_KEY=<твой_ключ>
DATABASE_URL=<твой_DATABASE_URL>
# ... остальные переменные
```

**Важно:**
- В `ALLOWED_ORIGINS` укажи **оба варианта** (с `www` и без)
- Используй **https://** (не http://)
- Не добавляй слэш в конце

---

#### 1.3. Добавь Custom Domain для backend на Render

1. Зайди в Render → **Web Service** → **Settings** → **Custom Domains**
2. Если есть `www.prepromo.online` — удали его
3. Нажми **Add Custom Domain**
4. Введи: `api.prepromo.online`
5. Дождись выдачи SSL сертификата (до 1 часа)

---

#### 1.4. Перезапусти сервисы

**Frontend:**
1. Render → **Static Site** → **Manual Deploy**
2. Нажми **Deploy latest commit**

**Backend:**
1. Render → **Web Service** → **Manual Deploy**
2. Нажми **Deploy latest commit**

---

### Вариант 2: Использовать один домен с редиректом (альтернатива)

Если хочешь использовать один домен (например, `www.prepromo.online` для обоих):

#### 2.1. Настрой DNS записи на Nethouse

**Для Frontend:**
```
Тип:     CNAME
Имя:     www
Значение: go-doc-generator.onrender.com
TTL:     3600
```

**Для Backend:**
```
Тип:     CNAME
Имя:     api
Значение: go-doc-generator-backend.onrender.com
TTL:     3600
```

**Результат:**
- Frontend: `https://www.prepromo.online`
- Backend: `https://api.prepromo.online`

---

#### 2.2. Обнови переменные окружения

**Frontend:**
```env
VITE_BACKEND_URL=https://api.prepromo.online
```

**Backend:**
```env
FRONTEND_URL=https://www.prepromo.online
ALLOWED_ORIGINS=https://www.prepromo.online,https://prepromo.online
```

---

## 🔍 Проверка конфигурации

### 1. Проверь DNS записи

**Windows PowerShell:**
```powershell
nslookup api.prepromo.online
nslookup prepromo.online
```

**Или онлайн:**
- https://www.dnschecker.org/
- Введи `api.prepromo.online` и `prepromo.online`
- Проверь, что записи появились по всему миру

---

### 2. Проверь переменные окружения

**Frontend на Render:**
1. Static Site → **Environment**
2. Убедись, что `VITE_BACKEND_URL=https://api.prepromo.online` (не `www.prepromo.online`)

**Backend на Render:**
1. Web Service → **Environment**
2. Убедись, что `ALLOWED_ORIGINS` включает `https://prepromo.online`
3. Убедись, что нет опечаток

---

### 3. Проверь Custom Domains на Render

**Frontend:**
1. Static Site → **Settings** → **Custom Domains**
2. Должен быть домен: `prepromo.online` или `www.prepromo.online`
3. SSL статус: **"Certificate Issued"** или **"Active"**

**Backend:**
1. Web Service → **Settings** → **Custom Domains**
2. Должен быть домен: `api.prepromo.online` (не `www.prepromo.online`)
3. SSL статус: **"Certificate Issued"** или **"Active"**

---

### 4. Проверь работу API

**В браузере:**
1. Открой `https://api.prepromo.online/health`
2. Должен вернуться JSON: `{"status":"ok",...}`

**В консоли браузера (F12) → Network:**
1. Открой `https://prepromo.online`
2. Попробуй авторизоваться через Telegram
3. Убедись, что запросы идут на `https://api.prepromo.online` (не `www.prepromo.online`)
4. Убедись, что нет CORS ошибок

---

## ⚠️ Частые ошибки

### Ошибка: "CORS blocked" после исправления

**Решение:**
1. Убедись, что в `ALLOWED_ORIGINS` указан правильный домен (без www или с www, в зависимости от твоего выбора)
2. Перезапусти backend (Manual Deploy)
3. Очисти кэш браузера (Ctrl+Shift+Del)
4. Попробуй в режиме инкогнито

---

### Ошибка: "Failed to fetch"

**Решение:**
1. Проверь, что backend доступен: `https://api.prepromo.online/health`
2. Проверь, что SSL сертификат выдан (Render → Custom Domains)
3. Проверь DNS записи на dnschecker.org
4. Подожди еще 30 минут для распространения DNS

---

### Ошибка: "Redirect is not allowed for a preflight request"

**Решение:**
1. Убедись, что frontend и backend на **разных** поддоменах (например, `prepromo.online` и `api.prepromo.online`)
2. Или используй **один** домен для обоих (например, `www.prepromo.online` для frontend и `api.prepromo.online` для backend)
3. Убедись, что нет редиректов с `www` на без `www` (или наоборот)

---

## ✅ Итоговая конфигурация (Вариант 1 — рекомендуется)

**DNS записи на Nethouse:**
```
CNAME  @    →  go-doc-generator.onrender.com
CNAME  api  →  go-doc-generator-backend.onrender.com
```

**Frontend Environment (Render):**
```env
VITE_BACKEND_URL=https://api.prepromo.online
VITE_TELEGRAM_BOT_USERNAME=твой_бот
VITE_REQUIRE_AUTH=true
```

**Backend Environment (Render):**
```env
FRONTEND_URL=https://prepromo.online
ALLOWED_ORIGINS=https://prepromo.online,https://www.prepromo.online
AUTH_JWT_SECRET=<твой_секрет>
TELEGRAM_BOT_TOKEN=<твой_токен>
GIGACHAT_AUTH_KEY=<твой_ключ>
DATABASE_URL=<твой_DATABASE_URL>
GIGACHAT_ALLOW_INSECURE_SSL=true
YOOKASSA_SHOP_ID=<твой_shop_id>
YOOKASSA_SECRET_KEY=<твой_secret_key>
PAYMENT_RETURN_URL=https://prepromo.online/#/payment/success
PAYMENT_FAIL_URL=https://prepromo.online/#/payment/failed
```

**Custom Domains на Render:**
- Frontend: `prepromo.online` (или `www.prepromo.online`)
- Backend: `api.prepromo.online`

---

## 🎉 Готово!

После выполнения всех шагов CORS ошибка должна исчезнуть.

**Проверь:**
1. Frontend: `https://prepromo.online` — открывается
2. Backend: `https://api.prepromo.online/health` — возвращает JSON
3. Авторизация через Telegram работает без CORS ошибок

