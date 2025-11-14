# Чеклист деплоя и настройки

## 1. Проверка подключения БД и записи данных

### Команда для проверки БД:
```bash
# Из корня проекта:
node check-db-connection.cjs

# Или из директории backend:
cd backend
node ../check-db-connection.cjs
```

### Или через psql (если есть доступ):
```bash
# Используйте External Database URL из Render
psql "postgres://user:pass@host:5432/dbname?sslmode=require"

# В psql выполните:
\dt                    # Список таблиц
SELECT * FROM users;   # Проверка пользователей
SELECT * FROM subscriptions;
SELECT * FROM payments;
```

### Проверка через авторизацию:
1. Откройте фронтенд: `https://ваш-фронт.onrender.com`
2. Нажмите "Войти через Telegram"
3. Авторизуйтесь
4. Запустите проверку БД снова - должен появиться новый пользователь

---

## 2. Регистрация через Telegram (уже реализована)

### Проверка что всё работает:
```bash
# Backend endpoint уже есть: POST /api/auth/telegram
# Frontend уже использует TelegramLoginButton

# Проверьте переменные окружения на Render (Backend):
# - TELEGRAM_BOT_TOKEN (должен быть заполнен)
# - TELEGRAM_BOT_USERNAME (должен быть заполнен)

# Проверьте переменные окружения на Render (Frontend):
# - VITE_TELEGRAM_BOT_USERNAME (должен совпадать с backend)
```

### Тест авторизации:
1. Откройте фронтенд
2. Нажмите "Войти" → должна появиться кнопка Telegram
3. Нажмите на кнопку → откроется окно Telegram
4. Подтвердите авторизацию
5. Должен появиться ваш профиль в Header

---

## 3. Настройка домена

### На Render (Frontend Static Site):
1. Зайдите в Settings → Custom Domain
2. Добавьте ваш домен (например: `docugen.ru`)
3. Render покажет DNS записи для добавления:
   - CNAME: `www` → `ваш-сайт.onrender.com`
   - A record: `@` → IP адрес (если нужен корневой домен)

### Настройка DNS у регистратора:
```
Тип: CNAME
Имя: www
Значение: ваш-фронт.onrender.com
TTL: 3600

Тип: A (если нужен корневой домен)
Имя: @
Значение: [IP от Render]
TTL: 3600
```

### Обновление переменных окружения:
```bash
# Backend (Render):
FRONTEND_URL=https://www.ваш-домен.ru
ALLOWED_ORIGINS=https://www.ваш-домен.ru,https://ваш-домен.ru

# Frontend (Render):
VITE_BACKEND_URL=https://ваш-backend.onrender.com
```

---

## 4. Создание нового фавикона

### Генерация фавикона:
```bash
# Используйте онлайн генератор или создайте вручную:
# https://realfavicongenerator.net/
# https://favicon.io/

# Размеры:
# - 16x16 (favicon.ico)
# - 32x32
# - 180x180 (apple-touch-icon)
# - 192x192 (android)
# - 512x512 (android)
```

### Размещение файлов:
```bash
# Скопируйте файлы в:
public/favicon.ico
public/apple-touch-icon.png
public/android-chrome-192x192.png
public/android-chrome-512x512.png

# Обновите index.html:
# <link rel="icon" type="image/x-icon" href="/favicon.ico">
# <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

### Команда для обновления:
```bash
# После добавления файлов:
git add public/favicon.* public/*-icon*.png
git commit -m "Add new favicon"
git push
# Render автоматически обновит фронтенд
```

---

## 5. Регистрация на ЮКассе и подключение оплаты

### Шаг 1: Регистрация на ЮКассе
1. Перейдите: https://yookassa.ru/
2. Нажмите "Подключиться"
3. Заполните данные:
   - ИНН/ОГРН (если ИП/ООО)
   - Реквизиты банковского счёта
   - Контактные данные
4. Подтвердите email и телефон
5. Дождитесь модерации (обычно 1-3 дня)

### Шаг 2: Получение ключей
1. После модерации зайдите в личный кабинет
2. Перейдите: Настройки → API
3. Скопируйте:
   - **Shop ID** (shopId)
   - **Секретный ключ** (Secret Key)

### Шаг 3: Настройка на Render (Backend)
Добавьте переменные окружения:
```
YOOKASSA_SHOP_ID=ваш_shop_id
YOOKASSA_SECRET_KEY=ваш_секретный_ключ
PAYMENT_RETURN_URL=https://ваш-домен.ru/payment/success
PAYMENT_FAIL_URL=https://ваш-домен.ru/payment/failed
```

### Шаг 4: Настройка Webhook (опционально)
1. В личном кабинете ЮКассы: Настройки → HTTP-уведомления
2. URL: `https://ваш-backend.onrender.com/api/payments/webhook`
3. События: `payment.succeeded`, `payment.canceled`

### Шаг 5: Тестирование оплаты
1. Используйте тестовые карты ЮКассы:
   - Успешная оплата: `5555 5555 5555 4444`
   - Отклонённая: `5555 5555 5555 4477`
2. CVC: любые 3 цифры
3. Срок: любая будущая дата

### Проверка работы:
```bash
# После настройки переменных:
# 1. Откройте фронтенд
# 2. Войдите через Telegram
# 3. Перейдите в раздел подписки
# 4. Выберите тариф
# 5. Должна открыться форма оплаты ЮКассы
```

---

## Быстрые команды для проверки

### Проверка БД:
```bash
node check-db-connection.cjs
```

### Проверка backend health:
```bash
curl https://ваш-backend.onrender.com/health
```

### Проверка авторизации:
```bash
# Откройте фронтенд в браузере и войдите через Telegram
```

### Проверка оплаты:
```bash
# После настройки ЮКассы, попробуйте купить подписку
```

---

## Порядок выполнения:
1. ✅ Проверка БД (команда выше)
2. ✅ Проверка Telegram авторизации (через фронтенд)
3. ⏳ Настройка домена (DNS + переменные)
4. ⏳ Создание фавикона (файлы + commit)
5. ⏳ Регистрация на ЮКассе (1-3 дня модерации)
6. ⏳ Подключение ЮКассы (переменные + тест)

