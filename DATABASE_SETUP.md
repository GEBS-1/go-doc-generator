# 🗄️ Настройка DATABASE_URL для PostgreSQL

## 📋 Формат строки подключения

`DATABASE_URL` должен иметь следующий формат:

```
postgres://username:password@host:port/database
```

### Примеры:

**Локальный PostgreSQL:**
```
DATABASE_URL=postgres://postgres:mypassword@localhost:5432/godocgenerator
```

**Удаленный сервер:**
```
DATABASE_URL=postgres://user:pass@192.168.1.100:5432/mydb
```

**Cloud (например, Render, Supabase, Neon):**
```
DATABASE_URL=postgres://user:pass@host.region.provider.com:5432/dbname?sslmode=require
```

---

## 🔍 Как найти параметры подключения

### 1. Если PostgreSQL установлен локально

**Windows:**
- Обычно установлен на `localhost:5432`
- Имя пользователя по умолчанию: `postgres`
- Пароль задается при установке

**Проверка через командную строку:**
```bash
psql -U postgres -h localhost
```

### 2. Если используете облачный сервис

**Render.com:**
- Перейдите в Dashboard → PostgreSQL
- Скопируйте "Internal Database URL" или "External Database URL"

**Supabase:**
- Project Settings → Database → Connection string
- Используйте "Connection pooling" или "Direct connection"

**Neon.tech:**
- Dashboard → Connection Details
- Скопируйте Connection String

---

## 🛠️ Создание базы данных

Если база данных еще не создана:

### Через psql:

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE godocgenerator;

# Создайте пользователя (опционально)
CREATE USER godocuser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE godocgenerator TO godocuser;

# Выйдите
\q
```

### Через pgAdmin:
1. Откройте pgAdmin
2. Правый клик на "Databases" → "Create" → "Database"
3. Имя: `godocgenerator`
4. Сохраните

---

## ✅ Проверка подключения

### Вариант 1: Через Node.js

Создайте файл `backend/test-db-connection.js`:

```javascript
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL не задан в .env файле');
  process.exit(1);
}

const pool = new Pool({ connectionString });

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
    process.exit(1);
  }
  console.log('✅ Подключение к БД успешно!');
  console.log('Время сервера:', res.rows[0].now);
  pool.end();
});
```

Запустите:
```bash
cd backend
node test-db-connection.js
```

### Вариант 2: Через psql

```bash
psql "postgres://username:password@host:5432/database"
```

Если подключение успешно, вы увидите приглашение `psql`.

---

## 📝 Добавление в backend/.env

Откройте файл `backend/.env` и добавьте/измените строку:

```env
DATABASE_URL=postgres://your_username:your_password@your_host:5432/your_database
```

**⚠️ ВАЖНО:**
- Не используйте пробелы вокруг `=`
- Если в пароле есть специальные символы, закодируйте их в URL (например, `@` → `%40`)
- Не коммитьте `.env` файл в Git!

---

## 🔧 Настройка для разных сценариев

### Локальная разработка

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/godocgenerator
```

### Render.com (Production)

```env
DATABASE_URL=postgres://user:pass@dpg-xxx.region.render.com:5432/dbname
PGSSLMODE=require
```

### Supabase

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### Neon.tech

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

---

## 🚨 Частые ошибки

### Ошибка: "connection refused"
- Проверьте, что PostgreSQL запущен
- Проверьте хост и порт (обычно `localhost:5432`)

### Ошибка: "password authentication failed"
- Проверьте правильность пароля
- Убедитесь, что пользователь существует

### Ошибка: "database does not exist"
- Создайте базу данных (см. выше)

### Ошибка: "relation does not exist"
- Таблицы будут созданы автоматически при первом запуске backend
- Убедитесь, что backend запускается успешно

---

## ✅ После настройки

1. Сохраните `backend/.env`
2. Проверьте подключение: `node backend/test-db-connection.js`
3. Запустите backend: `cd backend && npm run dev`
4. При первом запуске таблицы создадутся автоматически

---

## 🆘 Нужна помощь?

Если у вас есть строка подключения из другого места (например, из production окружения), просто скопируйте её в `DATABASE_URL` в `backend/.env`.

