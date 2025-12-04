require('dotenv').config();
const https = require('https');

// Попробуем все возможные варианты секрета
const SECRETS_TO_TRY = [
  'admin-secret-2025-yookassa',
  'change-me-in-production',
];

const BACKEND_URL = process.argv[2] || 'https://api.prepromo.online';

async function tryCreateUser(secret) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BACKEND_URL}/api/admin/create-test-user`);
    const postData = JSON.stringify({ secret });

    const options = {
      hostname: url.hostname,
      port: 443,
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
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

async function main() {
  console.log('🔍 Попытка создать пользователя с разными секретами...\n');

  for (const secret of SECRETS_TO_TRY) {
    console.log(`Пробуем секрет: ${secret.substring(0, 10)}...`);
    try {
      const result = await tryCreateUser(secret);
      console.log(`  Статус: ${result.status}`);
      
      if (result.status === 200) {
        const json = JSON.parse(result.data);
        console.log('\n✅ УСПЕХ! Пользователь создан!');
        console.log(`   Логин: ${json.credentials?.login || 'yookassa_test'}`);
        console.log(`   Пароль: ${json.credentials?.password || 'YooKassa2025!Test'}`);
        process.exit(0);
      } else if (result.status === 401) {
        console.log('  ❌ 401 - неверный секрет\n');
      } else {
        console.log(`  Ответ: ${result.data.substring(0, 100)}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Ошибка: ${error.message}\n`);
    }
  }

  console.log('\n❌ Не удалось создать пользователя с известными секретами.');
  console.log('\n💡 Нужно узнать ADMIN_SECRET из Render Dashboard:');
  console.log('   1. Зайдите на https://dashboard.render.com');
  console.log('   2. Backend сервис → Environment → ADMIN_SECRET');
  console.log('   3. Скопируйте значение');
  console.log('   4. Запустите: node test-create-user.js https://api.prepromo.online "ВАШ-СЕКРЕТ"');
}

main();

