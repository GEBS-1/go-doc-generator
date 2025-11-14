require('dotenv').config();
const { initTelegramBot, sendNotification, getBot } = require('./telegram-bot');

async function testBot() {
  console.log('🧪 Тестирование Telegram бота...\n');

  // Инициализация бота
  console.log('1. Инициализация бота...');
  const bot = initTelegramBot();
  
  if (!bot) {
    console.error('❌ Бот не инициализирован. Проверьте TELEGRAM_BOT_TOKEN в .env');
    process.exit(1);
  }
  console.log('✅ Бот инициализирован\n');

  // Проверка информации о боте
  console.log('2. Проверка информации о боте...');
  try {
    const botInfo = await bot.getMe();
    console.log(`✅ Бот: @${botInfo.username} (${botInfo.first_name})`);
    console.log(`   ID: ${botInfo.id}\n`);
  } catch (error) {
    console.error('❌ Ошибка получения информации о боте:', error.message);
    process.exit(1);
  }

  // Проверка webhook
  console.log('3. Проверка webhook...');
  try {
    const webhookInfo = await bot.getWebHookInfo();
    if (webhookInfo.url) {
      console.log(`✅ Webhook установлен: ${webhookInfo.url}`);
      console.log(`   Pending updates: ${webhookInfo.pending_update_count}`);
    } else {
      console.log('⚠️  Webhook не установлен (используется polling)');
    }
    console.log('');
  } catch (error) {
    console.error('❌ Ошибка проверки webhook:', error.message);
  }

  // Тест отправки уведомления (нужен реальный telegram_id)
  console.log('4. Тест отправки уведомления...');
  const testTelegramId = process.env.TEST_TELEGRAM_ID;
  if (testTelegramId) {
    try {
      await sendNotification(
        Number(testTelegramId),
        '🧪 Тестовое уведомление от DocuGen бота!\n\nЕсли вы получили это сообщение, бот работает корректно.'
      );
      console.log(`✅ Тестовое уведомление отправлено пользователю ${testTelegramId}`);
    } catch (error) {
      console.error(`❌ Ошибка отправки уведомления: ${error.message}`);
    }
  } else {
    console.log('⚠️  TEST_TELEGRAM_ID не задан, пропускаем тест отправки');
    console.log('   Для теста установите TEST_TELEGRAM_ID в .env (ваш telegram_id)');
  }

  console.log('\n✅ Тестирование завершено!');
  console.log('\n📝 Для проверки команд:');
  console.log('   1. Найдите бота в Telegram: @' + (await bot.getMe()).username);
  console.log('   2. Отправьте команду /start');
  console.log('   3. Проверьте другие команды: /subscription, /usage, /upgrade\n');

  // Не завершаем процесс, чтобы бот продолжал работать
  console.log('🤖 Бот работает. Нажмите Ctrl+C для остановки.\n');
}

testBot().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

