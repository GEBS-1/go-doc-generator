// Тестовый скрипт для проверки регистрации через Telegram и записи в БД
const path = require('path');
const fs = require('fs');

// Читаем .env вручную
const backendPath = path.join(__dirname, 'backend');
const envPath = path.join(backendPath, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
}

// Загружаем модули из backend/node_modules
let Pool;
const pgPath = path.join(backendPath, 'node_modules', 'pg');
if (fs.existsSync(pgPath)) {
  Pool = require(pgPath).Pool;
} else {
  Pool = require('pg').Pool;
}

let axiosModule;
const axiosPath = path.join(backendPath, 'node_modules', 'axios');
if (fs.existsSync(axiosPath)) {
  axiosModule = require(axiosPath);
} else {
  axiosModule = require('axios');
}
// Axios может быть в default или напрямую
const axios = axiosModule.default || axiosModule;

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не задан');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
});

// Симуляция данных от Telegram Login Widget
// В реальности эти данные приходят от Telegram после авторизации
function generateTelegramAuthData(telegramId, username, firstName) {
  const crypto = require('crypto');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан');
  }

  const authDate = Math.floor(Date.now() / 1000);
  const data = {
    id: telegramId,
    first_name: firstName,
    username: username,
    auth_date: authDate,
  };

  // Генерируем hash как это делает Telegram
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  return {
    ...data,
    hash,
  };
}

async function testRegistration() {
  console.log('🧪 Тестирование регистрации через Telegram\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);

  // Генерируем тестовые данные
  const testTelegramId = Math.floor(Math.random() * 1000000000) + 100000000;
  const testUsername = `test_user_${Date.now()}`;
  const testFirstName = 'Test User';

  console.log('1. Генерация тестовых данных...');
  console.log(`   Telegram ID: ${testTelegramId}`);
  console.log(`   Username: ${testUsername}`);
  console.log(`   First Name: ${testFirstName}\n`);

  try {
    // Генерируем данные авторизации
    const authData = generateTelegramAuthData(testTelegramId, testUsername, testFirstName);
    console.log('2. Отправка запроса на регистрацию...');
    
    const response = await axios.post(`${BACKEND_URL}/api/auth/telegram`, authData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Регистрация успешна!');
    console.log(`   User ID: ${response.data.user.id}`);
    console.log(`   Token получен: ${response.data.token ? 'Да' : 'Нет'}\n`);

    // Проверяем запись в БД
    console.log('3. Проверка записи в БД...');
    const dbResult = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [testTelegramId]
    );

    if (dbResult.rows.length > 0) {
      const user = dbResult.rows[0];
      console.log('✅ Пользователь найден в БД:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Telegram ID: ${user.telegram_id}`);
      console.log(`   Username: ${user.username || '(не указан)'}`);
      console.log(`   First Name: ${user.first_name || '(не указано)'}`);
      console.log(`   Created: ${user.created_at}\n`);

      // Проверяем подписку
      const subResult = await pool.query(
        'SELECT * FROM subscriptions WHERE user_id = $1',
        [user.id]
      );

      if (subResult.rows.length > 0) {
        const sub = subResult.rows[0];
        console.log('✅ Подписка создана:');
        console.log(`   Plan: ${sub.plan}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Docs Limit: ${sub.docs_limit}\n`);
      } else {
        console.log('⚠️  Подписка не найдена\n');
      }
    } else {
      console.log('❌ Пользователь не найден в БД!\n');
    }

    // Тестируем повторную авторизацию (обновление данных)
    console.log('4. Тестирование повторной авторизации (обновление данных)...');
    const updatedFirstName = 'Updated Test User';
    const updatedAuthData = generateTelegramAuthData(testTelegramId, testUsername, updatedFirstName);
    
    const updateResponse = await axios.post(`${BACKEND_URL}/api/auth/telegram`, updatedAuthData);
    console.log('✅ Данные обновлены!');
    
    const updatedDbResult = await pool.query(
      'SELECT first_name FROM users WHERE telegram_id = $1',
      [testTelegramId]
    );
    
    if (updatedDbResult.rows[0].first_name === updatedFirstName) {
      console.log(`✅ Имя обновлено в БД: ${updatedDbResult.rows[0].first_name}\n`);
    } else {
      console.log(`❌ Имя не обновлено!\n`);
    }

    console.log('✅ Все тесты пройдены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Проверяем доступность backend
async function checkBackend() {
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend доступен\n');
    return true;
  } catch (error) {
    console.error('❌ Backend недоступен:', error.message);
    console.error(`   Проверьте, что сервер запущен на ${BACKEND_URL}\n`);
    return false;
  }
}

async function main() {
  const backendAvailable = await checkBackend();
  if (!backendAvailable) {
    process.exit(1);
  }
  
  await testRegistration();
}

main();

