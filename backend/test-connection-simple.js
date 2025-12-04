require('dotenv').config();
const { Client } = require('pg');

console.log('🔍 Простое тестирование подключения к Render PostgreSQL...\n');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL не найден');
  process.exit(1);
}

// Парсим URL
const url = require('url');
const parsed = url.parse(dbUrl);
const auth = parsed.auth.split(':');

console.log('📋 Используемые параметры:');
console.log(`   Хост: ${parsed.hostname}`);
console.log(`   Порт: ${parsed.port || 5432}`);
console.log(`   База: ${parsed.pathname.slice(1)}`);
console.log(`   Пользователь: ${auth[0]}\n`);

const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000, // Увеличиваем таймаут
  query_timeout: 10000,
});

console.log('🔄 Попытка подключения (таймаут 15 секунд)...\n');

let connectionStartTime = Date.now();

client.connect()
  .then(() => {
    const connectionTime = Date.now() - connectionStartTime;
    console.log(`✅ Подключение установлено за ${connectionTime}ms!`);
    
    return client.query('SELECT NOW() as time, current_database() as db');
  })
  .then((result) => {
    console.log('\n✅ Запрос к БД выполнен успешно!');
    console.log(`   Время БД: ${result.rows[0].time}`);
    console.log(`   База данных: ${result.rows[0].db}\n`);
    
    console.log('🎉 База данных доступна и готова к работе!');
    
    return client.end();
  })
  .then(() => {
    console.log('\n✅ Подключение закрыто.');
    process.exit(0);
  })
  .catch((error) => {
    const connectionTime = Date.now() - connectionStartTime;
    console.error(`\n❌ Ошибка после ${connectionTime}ms:`);
    console.error(`   ${error.message}\n`);
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error('💡 Проблема: Таймаут подключения');
      console.error('\nВозможные причины:');
      console.error('   1. Render PostgreSQL может требовать VPN или специальный доступ');
      console.error('   2. Файрвол на вашем компьютере блокирует подключение');
      console.error('   3. Проблемы с интернет-соединением');
      console.error('   4. Render может требовать другой способ подключения\n');
      
      console.error('💡 Решения:');
      console.error('   1. Проверьте, включен ли "Public Networking" в настройках PostgreSQL');
      console.error('   2. Попробуйте отключить файрвол/антивирус временно');
      console.error('   3. Проверьте интернет-соединение');
      console.error('   4. Убедитесь, что используете External Database URL\n');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Проблема: Хост не найден');
      console.error('   Проверьте правильность External Database URL');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Проблема: Подключение отклонено');
      console.error('   Возможно, порт заблокирован или сервис недоступен');
    }
    
    process.exit(1);
  });

