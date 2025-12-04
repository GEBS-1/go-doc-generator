# 🔧 Обновление DATABASE_URL для Render PostgreSQL

## 📋 Данные для подключения:

**Хост (External):** `dpg-d49j6cili9vc739sk15g-a.oregon-postgres.render.com`  
**Порт:** `5432`  
**База данных:** `docugen_postgres`  
**Пользователь:** `docugen_postgres_user`  
**Пароль:** `coAtVPH0nMGseKX0iVqwQzJ3FHZWiVAA`

## ✅ DATABASE_URL для добавления в backend/.env:

```
DATABASE_URL=postgresql://docugen_postgres_user:coAtVPH0nMGseKX0iVqwQzJ3FHZWiVAA@dpg-d49j6cili9vc739sk15g-a.oregon-postgres.render.com:5432/docugen_postgres?sslmode=require
```

## 📝 Инструкция:

1. Откройте файл `backend/.env`
2. Найдите строку `DATABASE_URL=...`
3. Замените её на строку выше
4. Сохраните файл

После этого запустите:
```bash
cd backend
node test-db-connection.js
```

Затем создайте тестового пользователя:
```bash
node create-test-user-yookassa.js
```

