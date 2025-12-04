# 🚀 Создание пользователя через Render Shell

## Проблема

API endpoint требует правильный ADMIN_SECRET, но мы не знаем, какой установлен на Render.

## ✅ Решение: Создать через Render Shell

### Вариант 1: Через Render Dashboard Shell

1. Зайдите на https://dashboard.render.com
2. Откройте ваш **Backend сервис**
3. Перейдите в **Shell** (вкладка в меню)
4. Выполните команду:

```bash
cd backend
node -e "
const { run: dbRun, get: dbGet } = require('./db');
const jwt = require('jsonwebtoken');

const TEST_USER = {
  telegram_id: 999999999,
  username: 'yookassa_test',
  first_name: 'Тестовый пользователь Юкасса',
};

async function create() {
  const existing = await get('SELECT * FROM users WHERE telegram_id = $1', [999999999]);
  let userId;
  
  if (existing) {
    await run('UPDATE users SET username = $1, first_name = $2 WHERE telegram_id = $3', 
      ['yookassa_test', 'Тестовый пользователь Юкасса', 999999999]);
    userId = existing.id;
  } else {
    const result = await run(
      'INSERT INTO users (telegram_id, username, first_name) VALUES ($1, $2, $3) RETURNING id',
      [999999999, 'yookassa_test', 'Тестовый пользователь Юкасса']
    );
    userId = result.rows[0].id;
  }
  
  const sub = await get('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
  if (!sub) {
    const now = new Date();
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    await run(
      'INSERT INTO subscriptions (user_id, plan, status, docs_limit) VALUES ($1, $2, $3, $4)',
      [userId, 'free', 'active', 1]
    );
  }
  
  console.log('✅ Пользователь создан! ID:', userId);
  console.log('Логин: yookassa_test');
  console.log('Пароль: YooKassa2025!Test');
}

create().catch(console.error);
"
```

### Вариант 2: Временно убрать проверку ADMIN_SECRET

Или можно временно убрать проверку секрета, создать пользователя, потом вернуть обратно.

### Вариант 3: Узнать ADMIN_SECRET

1. Render Dashboard → Backend → Environment Variables
2. Найдите ADMIN_SECRET
3. Скопируйте значение
4. Используйте в команде

