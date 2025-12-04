require('dotenv').config();
const https = require('https');
const { URL } = require('url');

const BACKEND_URL = process.argv[2] || 'https://api.prepromo.online';
const ADMIN_SECRET = process.argv[3] || 'admin-secret-2025-yookassa';

const url = new URL(`${BACKEND_URL}/api/admin/create-test-user`);

const postData = JSON.stringify({ secret: ADMIN_SECRET });

console.log('🚀 Создание тестового пользователя...\n');
console.log(`📡 URL: ${url.toString()}`);
console.log(`🔐 Secret: ${ADMIN_SECRET.substring(0, 10)}...\n`);

const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
  timeout: 30000,
};

const req = https.request(options, (res) => {
  let data = '';
  
  console.log(`📊 Статус: ${res.statusCode} ${res.statusMessage}`);
  console.log(`📋 Headers:`, res.headers['content-type']);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`\n📄 Ответ (первые 500 символов):`);
    console.log(data.substring(0, 500));
    console.log('\n');
    
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        if (json.success) {
          console.log('✅ УСПЕХ!');
          console.log(`\n📋 Данные для входа:`);
          console.log(`   Логин: ${json.credentials?.login || 'yookassa_test'}`);
          console.log(`   Пароль: ${json.credentials?.password || 'YooKassa2025!Test'}`);
        } else {
          console.error('❌ Ошибка:', json.error || json.message);
        }
      } catch (e) {
        console.error('❌ Не удалось разобрать JSON ответ');
        console.error('Полный ответ:', data);
      }
    } else {
      console.error(`❌ Ошибка: ${res.statusCode}`);
      if (data.includes('<!DOCTYPE') || data.includes('<html')) {
        console.error('⚠️  Сервер вернул HTML страницу (возможно, 404 или ошибка)');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Ошибка подключения:', error.message);
});

req.on('timeout', () => {
  req.destroy();
  console.error('❌ Превышено время ожидания');
});

req.write(postData);
req.end();

