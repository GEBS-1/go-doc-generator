// Прямой тест авторизации через API
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Читаем .env
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

let axios;
const axiosPath = path.join(backendPath, 'node_modules', 'axios');
if (fs.existsSync(axiosPath)) {
  axios = require(axiosPath).default || require(axiosPath);
} else {
  axios = require('axios').default || require('axios');
}

const BACKEND_URL = 'http://localhost:3001';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в .env');
  process.exit(1);
}

// Генерируем тестовые данные авторизации
function generateTelegramAuthData(telegramId, username, firstName) {
  const authDate = Math.floor(Date.now() / 1000);
  const data = {
    id: telegramId,
    first_name: firstName,
    username: username,
    auth_date: authDate,
  };

  // Генерируем hash как это делает Telegram
  const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();
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

async function testAuth() {
  console.log('🧪 Тестирование авторизации через API\n');

  // Тестовые данные
  const testTelegramId = 999888777;
  const testUsername = 'testuser';
  const testFirstName = 'Test User';

  console.log('1. Генерация данных авторизации...');
  const authData = generateTelegramAuthData(testTelegramId, testUsername, testFirstName);
  console.log('   Telegram ID:', authData.id);
  console.log('   Username:', authData.username);
  console.log('   Hash:', authData.hash.substring(0, 20) + '...\n');

  try {
    console.log('2. Отправка запроса на /api/auth/telegram...');
    const response = await axios.post(`${BACKEND_URL}/api/auth/telegram`, authData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Авторизация успешна!');
    console.log('   Status:', response.status);
    console.log('   User ID:', response.data.user?.id);
    console.log('   Token получен:', response.data.token ? 'Да' : 'Нет');
    console.log('   User name:', response.data.user?.name);
    console.log('   Subscription:', response.data.user?.subscription?.planId || 'нет');

  } catch (error) {
    console.error('❌ Ошибка авторизации:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data?.error || error.response.data);
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Message:', error.message);
    }
    process.exit(1);
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
  
  await testAuth();
}

main();

