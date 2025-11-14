// Скрипт для проверки подключения к БД и записи данных
// Запускать из директории backend: node ../check-db-connection.cjs
const path = require('path');
const fs = require('fs');

// Пытаемся найти dotenv в backend/node_modules
// Скрипт может быть запущен из корня или из backend
const backendPath = fs.existsSync(path.join(__dirname, 'backend')) 
  ? path.join(__dirname, 'backend')
  : __dirname;
// Читаем .env вручную (без dotenv)
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
        // Убираем кавычки если есть
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
}

// Пытаемся загрузить pg из backend/node_modules
let Pool;
const pgPath = path.join(backendPath, 'node_modules', 'pg');
if (fs.existsSync(pgPath)) {
  Pool = require(pgPath).Pool;
} else {
  try {
    Pool = require('pg').Pool;
  } catch (e) {
    console.error('❌ Модуль pg не найден. Установите: cd backend && npm install');
    process.exit(1);
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL не задан в backend/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
});

async function checkDatabase() {
  try {
    console.log('🔍 Проверка подключения к БД...');
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Подключение успешно!');
    console.log('   Время сервера:', result.rows[0].current_time);
    console.log('   PostgreSQL:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);

    console.log('\n📊 Проверка таблиц...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('   Найдено таблиц:', tables.rows.length);
    tables.rows.forEach(row => console.log('   -', row.table_name));

    console.log('\n👥 Проверка пользователей...');
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('   Всего пользователей:', users.rows[0].count);

    if (users.rows[0].count > 0) {
      const lastUser = await pool.query('SELECT id, telegram_id, username, first_name, created_at FROM users ORDER BY id DESC LIMIT 1');
      console.log('   Последний пользователь:');
      console.log('     ID:', lastUser.rows[0].id);
      console.log('     Telegram ID:', lastUser.rows[0].telegram_id);
      console.log('     Username:', lastUser.rows[0].username || '(не указан)');
      console.log('     Имя:', lastUser.rows[0].first_name || '(не указано)');
      console.log('     Создан:', lastUser.rows[0].created_at);
    }

    console.log('\n💳 Проверка подписок...');
    const subs = await pool.query('SELECT COUNT(*) as count FROM subscriptions');
    console.log('   Всего подписок:', subs.rows[0].count);

    console.log('\n💰 Проверка платежей...');
    const payments = await pool.query('SELECT COUNT(*) as count FROM payments');
    console.log('   Всего платежей:', payments.rows[0].count);

    console.log('\n✅ Все проверки пройдены!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDatabase();

