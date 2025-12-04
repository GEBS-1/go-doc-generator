require('dotenv').config();
const { Client } = require('pg');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL не найден');
  process.exit(1);
}

console.log('🔍 Тестирование прямого подключения к Render PostgreSQL...\n');

// Парсим URL для более детального подключения
const url = require('url');
const parsed = url.parse(dbUrl);
const auth = parsed.auth.split(':');

const client = new Client({
  host: parsed.hostname,
  port: parsed.port || 5432,
  database: parsed.pathname.slice(1), // убираем первый /
  user: auth[0],
  password: auth[1],
  ssl: {
    rejectUnauthorized: false, // Для Render нужно отключить проверку сертификата
  },
  connectionTimeoutMillis: 10000,
});

console.log('📋 Параметры подключения:');
console.log(`   Хост: ${parsed.hostname}`);
console.log(`   Порт: ${parsed.port || 5432}`);
console.log(`   База: ${parsed.pathname.slice(1)}`);
console.log(`   Пользователь: ${auth[0]}`);
console.log(`   SSL: включен (rejectUnauthorized: false)\n`);

console.log('🔄 Попытка подключения...');

client.connect()
  .then(() => {
    console.log('✅ Подключение установлено!');
    return client.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
  })
  .then((result) => {
    console.log('\n✅ Запрос выполнен успешно!');
    console.log(`   Текущее время БД: ${result.rows[0].current_time}`);
    console.log(`   База данных: ${result.rows[0].db_name}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(',')[0]}\n`);
    console.log('✅ База данных доступна и готова к работе!');
    return client.end();
  })
  .then(() => {
    console.log('\n✅ Подключение закрыто.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка подключения:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('ECONNRESET')) {
      console.error('\n💡 Возможные причины:');
      console.error('   1. Проблема с сетью или файрволом');
      console.error('   2. Render требует внешний доступ (External URL)');
      console.error('   3. SSL настройки некорректны');
      console.error('   4. Хост недоступен');
    }
    
    if (error.message.includes('password')) {
      console.error('\n💡 Проверьте пароль в DATABASE_URL');
    }
    
    process.exit(1);
  });

