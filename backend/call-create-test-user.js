require('dotenv').config();

// Получаем URL backend из переменных окружения или аргументов
const BACKEND_URL = process.argv[2] || process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.argv[3] || 'admin-secret-2025-yookassa';

if (!BACKEND_URL) {
  console.error('❌ URL backend не указан!');
  console.error('\n📝 Использование:');
  console.error('   node call-create-test-user.js <BACKEND_URL> [ADMIN_SECRET]');
  console.error('\n   Или установите переменные окружения:');
  console.error('   BACKEND_URL=https://your-backend.onrender.com');
  console.error('   ADMIN_SECRET=your-secret');
  console.error('\n   Или через .env файл:');
  console.error('   BACKEND_URL=https://your-backend.onrender.com');
  console.error('   ADMIN_SECRET=your-secret');
  process.exit(1);
}

console.log('🚀 Создание тестового пользователя через API...\n');
console.log(`📡 Backend URL: ${BACKEND_URL}`);
console.log(`🔐 Admin Secret: ${ADMIN_SECRET.substring(0, 10)}...\n`);

// Используем fetch если доступен (Node.js 18+), иначе https
const useFetch = typeof fetch !== 'undefined';

async function createTestUser() {
  const url = `${BACKEND_URL.replace(/\/$/, '')}/api/admin/create-test-user`;
  
  try {
    console.log('🔄 Отправка запроса...\n');
    
    let response;
    if (useFetch) {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret: ADMIN_SECRET }),
        signal: AbortSignal.timeout(30000), // 30 секунд таймаут
      });
    } else {
      // Fallback для старых версий Node.js
      const https = require('https');
      const http = require('http');
      const { URL } = require('url');
      
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const postData = JSON.stringify({ secret: ADMIN_SECRET });
      
      response = await new Promise((resolve, reject) => {
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 30000,
        };
        
        const req = client.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              json: () => Promise.resolve(JSON.parse(data)),
              text: () => Promise.resolve(data),
            });
          });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        
        req.write(postData);
        req.end();
      });
    }
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('\n' + '='.repeat(70));
      console.log('✅ ТЕСТОВЫЙ ПОЛЬЗОВАТЕЛЬ ДЛЯ ЮКАССЫ УСПЕШНО СОЗДАН!');
      console.log('='.repeat(70));
      console.log('\n📋 Данные для входа:');
      console.log(`   Логин: ${data.credentials.login}`);
      console.log(`   Пароль: ${data.credentials.password}`);
      if (data.token) {
        console.log(`\n🔑 JWT Токен:`);
        console.log(`   ${data.token}`);
      }
      console.log('\n✅ Пользователь готов к использованию!');
      console.log('='.repeat(70));
      process.exit(0);
    } else {
      console.error('\n❌ Ошибка при создании пользователя:');
      console.error(`   ${data.error || 'Неизвестная ошибка'}`);
      if (data.details) {
        console.error(`   Детали: ${data.details}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Ошибка подключения:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Проверьте правильность URL backend сервиса');
      console.error(`   Использован URL: ${BACKEND_URL}`);
    } else if (error.message.includes('Timeout') || error.message.includes('timeout')) {
      console.error('\n💡 Превышено время ожидания (30 секунд)');
      console.error('   Возможно, сервис еще загружается или недоступен');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Подключение отклонено');
      console.error('   Возможно, сервис не запущен или URL неверный');
    }
    
    process.exit(1);
  }
}

createTestUser();
