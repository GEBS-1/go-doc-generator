require('dotenv').config();
const { run: dbRun, get: dbGet } = require('./db');
const jwt = require('jsonwebtoken');

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;
const AUTH_TOKEN_TTL = process.env.AUTH_TOKEN_TTL || '30d';

// Данные тестового пользователя для Юкассы
const TEST_USER = {
  telegram_id: 999999999, // Специальный тестовый ID
  username: 'yookassa_test',
  first_name: 'Тестовый пользователь Юкасса',
  photo_url: null,
};

// Логин и пароль для тестового пользователя
const TEST_CREDENTIALS = {
  login: 'yookassa_test',
  password: 'YooKassa2025!Test',
};

const createToken = (payload = {}) => {
  if (!AUTH_JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET не задан, невозможно выпустить токен');
  }
  return jwt.sign(payload, AUTH_JWT_SECRET, { expiresIn: AUTH_TOKEN_TTL });
};

async function createTestUser() {
  try {
    console.log('🚀 Создание тестового пользователя для Юкассы...\n');

    if (!AUTH_JWT_SECRET) {
      throw new Error('❌ AUTH_JWT_SECRET не задан в .env файле');
    }

    // Проверяем, существует ли уже тестовый пользователь
    const existingUser = await dbGet(
      'SELECT * FROM users WHERE telegram_id = ?',
      [TEST_USER.telegram_id]
    );

    let userId;

    if (existingUser) {
      console.log('⚠️  Тестовый пользователь уже существует, обновляем данные...');
      
      // Обновляем данные пользователя
      await dbRun(
        `UPDATE users 
         SET username = ?, first_name = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE telegram_id = ?`,
        [TEST_USER.username, TEST_USER.first_name, TEST_USER.telegram_id]
      );

      userId = existingUser.id;
      console.log(`✅ Пользователь обновлен (ID: ${userId})`);
    } else {
      // Создаем нового пользователя
      const result = await dbRun(
        `INSERT INTO users (telegram_id, username, first_name, photo_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [TEST_USER.telegram_id, TEST_USER.username, TEST_USER.first_name, TEST_USER.photo_url]
      );

      // Получаем ID из результата (PostgreSQL возвращает в rows)
      userId = result.rows?.[0]?.id;
      
      if (!userId) {
        // Если ID не получен, делаем запрос
        const newUser = await dbGet(
          'SELECT id FROM users WHERE telegram_id = ?',
          [TEST_USER.telegram_id]
        );
        userId = newUser?.id;
      }
      
      console.log(`✅ Пользователь создан (ID: ${userId})`);
    }

    // Проверяем, есть ли подписка
    const existingSubscription = await dbGet(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    if (!existingSubscription) {
      // Создаем бесплатную подписку для тестового пользователя
      const now = new Date();
      const nextReset = new Date(now);
      nextReset.setMonth(nextReset.getMonth() + 1);

      await dbRun(
        `INSERT INTO subscriptions (
          user_id, plan, status, docs_generated, docs_limit, 
          activated_at, reset_date, created_at, updated_at
        ) VALUES (?, ?, 'active', 0, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, 'free', now.toISOString(), nextReset.toISOString()]
      );
      console.log('✅ Бесплатная подписка создана');
    } else {
      console.log('✅ Подписка уже существует');
    }

    // Создаем JWT токен для входа
    const token = createToken({
      sub: userId,
      provider: 'telegram',
      test: true, // Помечаем как тестовый токен
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ ТЕСТОВЫЙ ПОЛЬЗОВАТЕЛЬ ДЛЯ ЮКАССЫ УСПЕШНО СОЗДАН');
    console.log('='.repeat(70));
    console.log('\n📋 Данные для входа:');
    console.log(`   Логин: ${TEST_CREDENTIALS.login}`);
    console.log(`   Пароль: ${TEST_CREDENTIALS.password}`);
    console.log(`\n🔑 JWT Токен (для прямого входа):`);
    console.log(`   ${token}`);
    console.log(`\n📝 Инструкция для Юкассы:`);
    console.log(`   1. Откройте сайт: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
    console.log(`   2. Перейдите на страницу: /auth/test-login`);
    console.log(`   3. Введите логин: ${TEST_CREDENTIALS.login}`);
    console.log(`   4. Введите пароль: ${TEST_CREDENTIALS.password}`);
    console.log(`   ИЛИ используйте прямую ссылку с токеном (будет создана на следующем шаге)`);
    console.log('\n' + '='.repeat(70));

    return {
      userId,
      token,
      credentials: TEST_CREDENTIALS,
    };
  } catch (error) {
    console.error('❌ Ошибка при создании тестового пользователя:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запускаем создание пользователя
createTestUser()
  .then(() => {
    console.log('\n✅ Готово!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });

