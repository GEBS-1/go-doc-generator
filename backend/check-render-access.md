# ⚠️ Важно: Проверьте настройки доступа на Render

## Текущая проблема

Подключение к базе данных не устанавливается (таймаут). Это значит, что Render PostgreSQL может не разрешать внешние подключения.

## Что нужно проверить на Render:

### 1. Включен ли внешний доступ?

В Render Dashboard:
1. Откройте ваш PostgreSQL сервис
2. Перейдите в **Settings** или **Network**
3. Найдите **"Allow External Connections"** или **"Public Networking"**
4. Убедитесь, что эта опция **ВКЛЮЧЕНА**

### 2. Используете ли вы External URL?

В разделе "Соединения" должны быть два URL:
- **Internal Database URL** - только для сервисов внутри Render
- **External Database URL** - для внешних подключений (с локального компьютера)

Убедитесь, что мы используем **External Database URL**!

### 3. Проверьте External Database URL

External URL должен выглядеть так:
```
postgresql://...@dpg-xxxxx-a.oregon-postgres.render.com:5432/...
```

Если в URL нет `.oregon-postgres.render.com`, то это Internal URL.

## Что сделать:

1. Откройте Render Dashboard
2. Проверьте, какой External Database URL там указан
3. Если он отличается от того, что мы используем - скопируйте его
4. Я обновлю DATABASE_URL

Или просто скопируйте **External Database URL** из Render Dashboard и отправьте мне - я сразу обновлю конфигурацию!

