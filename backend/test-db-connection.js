require('dotenv').config();
const { pool, get } = require('./db');

async function testConnection() {
  try {
    console.log('🔍 Проверка подключения к базе данных...\n');

    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL не задан в .env файле');
      console.log('\n📝 Для настройки добавьте в backend/.env:');
      console.log('   DATABASE_URL=postgresql://user:password@host:port/database');
      process.exit(1);
    }

    console.log('✅ DATABASE_URL найден в переменных окружения');
    console.log(`   Префикс: ${process.env.DATABASE_URL.substring(0, 30)}...\n`);

    // Пытаемся выполнить простой запрос
    console.log('🔄 Попытка подключения к базе данных...');
    
    const result = await get('SELECT NOW() as current_time, version() as db_version');
    
    if (result) {
      console.log('✅ Подключение к базе данных успешно!');
      console.log(`   Текущее время БД: ${result.current_time}`);
      console.log(`   Версия PostgreSQL: ${result.db_version?.substring(0, 50)}...`);
      console.log('\n✅ База данных доступна и готова к работе!');
      process.exit(0);
    } else {
      console.log('⚠️  Подключение установлено, но запрос не вернул результат');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Ошибка подключения к базе данных:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('connection')) {
      console.error('\n💡 Возможные причины:');
      console.error('   1. База данных не запущена');
      console.error('   2. Неверный DATABASE_URL');
      console.error('   3. Проблемы с сетью или файрволом');
      console.error('   4. Неверные учетные данные');
    }
    
    process.exit(1);
  }
}

testConnection();

