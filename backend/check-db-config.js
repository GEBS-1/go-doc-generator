require('dotenv').config();
const url = require('url');

console.log('🔍 Проверка конфигурации базы данных...\n');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.log('❌ DATABASE_URL не найден в .env файле');
  console.log('\n📝 Добавьте в backend/.env:');
  console.log('   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require');
  process.exit(1);
}

const parsed = url.parse(dbUrl);
const auth = parsed.auth ? parsed.auth.split(':') : [];

console.log('✅ DATABASE_URL найден!\n');

console.log('📋 Текущие настройки:');
console.log(`   Хост: ${parsed.hostname || 'не указан'}`);
console.log(`   Порт: ${parsed.port || '5432 (по умолчанию)'}`);
console.log(`   Пользователь: ${auth[0] || 'не указан'}`);
console.log(`   База данных: ${parsed.pathname ? parsed.pathname.slice(1) : 'не указана'}`);
console.log(`   Пароль: ${auth[1] ? '✅ задан' : '❌ не указан'}`);
console.log(`   SSL: ${parsed.query && parsed.query.includes('sslmode') ? '✅ настроен' : '⚠️  не указан'}`);

// Проверяем, локальный ли это сервер
const isLocal = parsed.hostname === 'localhost' || 
                parsed.hostname === '127.0.0.1' || 
                parsed.hostname === '::1';

if (isLocal) {
  console.log('\n⚠️  ВНИМАНИЕ: Указан локальный адрес (localhost/127.0.0.1)');
  console.log('   Если база данных на удаленном сервере, обновите DATABASE_URL на внешний адрес');
}

// Проверяем, нужен ли SSL для удаленных БД
const isRemote = !isLocal && (
  parsed.hostname.includes('render.com') ||
  parsed.hostname.includes('supabase.co') ||
  parsed.hostname.includes('railway.app') ||
  parsed.hostname.includes('neon.tech') ||
  parsed.hostname.includes('amazonaws.com')
);

if (isRemote && !parsed.query?.includes('sslmode')) {
  console.log('\n⚠️  ВНИМАНИЕ: Обнаружен удаленный сервер, но SSL не указан');
  console.log('   Рекомендуется добавить ?sslmode=require в конец DATABASE_URL');
}

console.log('\n' + '='.repeat(60));
console.log('📝 Для подключения к удаленной БД нужно:');
console.log('   1. Хост (например: dpg-xxxxx-a.render.com)');
console.log('   2. Порт (обычно 5432)');
console.log('   3. Имя базы данных');
console.log('   4. Пользователь');
console.log('   5. Пароль');
console.log('   6. SSL (добавить ?sslmode=require)');
console.log('='.repeat(60));

