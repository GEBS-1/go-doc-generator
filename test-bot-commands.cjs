// Тестовый скрипт для проверки команд бота
const path = require('path');
const fs = require('fs');

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

const { Pool } = require(path.join(backendPath, 'node_modules', 'pg'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
});

async function testBotCommands() {
  console.log('🧪 Тестирование команд бота\n');

  // Находим последнего зарегистрированного пользователя
  const userResult = await pool.query(
    'SELECT * FROM users ORDER BY id DESC LIMIT 1'
  );

  if (userResult.rows.length === 0) {
    console.log('❌ Нет пользователей в БД. Сначала запустите test-telegram-auth.cjs\n');
    await pool.end();
    return;
  }

  const user = userResult.rows[0];
  console.log('📋 Тестируем команды для пользователя:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Telegram ID: ${user.telegram_id}`);
  console.log(`   Username: ${user.username || '(не указан)'}`);
  console.log(`   Name: ${user.first_name || '(не указано)'}\n`);

  // Проверяем подписку
  const subResult = await pool.query(
    'SELECT * FROM subscriptions WHERE user_id = $1',
    [user.id]
  );

  if (subResult.rows.length > 0) {
    const sub = subResult.rows[0];
    console.log('📊 Информация о подписке:');
    console.log(`   Plan: ${sub.plan}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Docs Generated: ${sub.docs_generated}`);
    console.log(`   Docs Limit: ${sub.docs_limit || '∞'}`);
    console.log(`   Expires: ${sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('ru-RU') : 'Не ограничена'}\n`);
  } else {
    console.log('⚠️  Подписка не найдена\n');
  }

  console.log('✅ Данные готовы для тестирования команд бота\n');
  console.log('📱 Для проверки команд:');
  console.log(`   1. Найдите бота в Telegram: @${process.env.TELEGRAM_BOT_USERNAME || 'ваш_бот'}`);
  console.log(`   2. Отправьте команду /start`);
  console.log(`   3. Проверьте команды: /subscription, /usage, /upgrade\n`);
  console.log(`   Telegram ID для теста: ${user.telegram_id}\n`);

  await pool.end();
}

testBotCommands().catch(error => {
  console.error('❌ Ошибка:', error);
  process.exit(1);
});

