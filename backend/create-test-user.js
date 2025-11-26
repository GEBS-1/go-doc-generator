require('dotenv').config();
const { run: dbRun, get: dbGet } = require('./db');
const jwt = require('jsonwebtoken');

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;
const AUTH_TOKEN_TTL = process.env.AUTH_TOKEN_TTL || '7d';

async function createTestUser() {
  try {
    console.log('🔧 Создание тестового пользователя...\n');

    // Проверяем, существует ли уже тестовый пользователь
    const existingUser = await dbGet(
      'SELECT * FROM users WHERE telegram_id = ?',
      [999999999]
    );

    let userId;
    if (existingUser) {
      console.log('✅ Тестовый пользователь уже существует, обновляю...');
      userId = existingUser.id;
      await dbRun(
        `UPDATE users 
         SET username = ?, first_name = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        ['test_user', 'Тестовый Пользователь', userId]
      );
    } else {
      console.log('➕ Создаю нового тестового пользователя...');
      const result = await dbRun(
        'INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?) RETURNING id',
        [999999999, 'test_user', 'Тестовый Пользователь']
      );
      userId = result.lastID || result.rows?.[0]?.id;
      console.log(`✅ Пользователь создан с ID: ${userId}`);
    }

    // Создаем или обновляем бесплатную подписку
    const subscription = await dbGet(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    if (!subscription) {
      const now = new Date();
      const nextReset = new Date(now);
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);
      nextReset.setHours(0, 0, 0, 0);

      await dbRun(
        `INSERT INTO subscriptions (
          user_id, plan, status, docs_generated, docs_limit, activated_at, reset_date
        ) VALUES (?, 'free', 'active', 0, 1, ?, ?)`,
        [userId, now.toISOString(), nextReset.toISOString()]
      );
      console.log('✅ Бесплатная подписка создана');
    } else {
      console.log('✅ Подписка уже существует');
    }

    // Генерируем JWT токен
    if (!AUTH_JWT_SECRET) {
      throw new Error('AUTH_JWT_SECRET не задан в .env файле!');
    }

    const payload = { sub: userId };
    const token = jwt.sign(payload, AUTH_JWT_SECRET, { expiresIn: AUTH_TOKEN_TTL });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ТЕСТОВЫЙ ПОЛЬЗОВАТЕЛЬ СОЗДАН!');
    console.log('='.repeat(60));
    console.log(`\n👤 User ID: ${userId}`);
    console.log(`📧 Username: test_user`);
    console.log(`🔑 JWT Token:\n\n${token}\n`);
    console.log('='.repeat(60));
    console.log('\n📋 ИНСТРУКЦИЯ ПО ИСПОЛЬЗОВАНИЮ:');
    console.log('1. Откройте браузер на http://localhost:8080');
    console.log('2. Откройте консоль разработчика (F12)');
    console.log('3. Выполните следующую команду:');
    console.log('\n   localStorage.setItem("auth_token", "' + token + '")\n');
    console.log('4. Обновите страницу (F5)');
    console.log('5. Теперь вы авторизованы как тестовый пользователь!\n');
    console.log('='.repeat(60) + '\n');

    return { userId, token };
  } catch (error) {
    console.error('❌ Ошибка создания тестового пользователя:', error);
    process.exit(1);
  }
}

// Ждем инициализации БД и создаем пользователя
const { pool } = require('./db');
pool.query('SELECT 1')
  .then(() => {
    createTestUser().then(() => {
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('❌ Ошибка подключения к БД:', error);
    process.exit(1);
  });

