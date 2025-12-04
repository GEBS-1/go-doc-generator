require('dotenv').config();

// Проверяем, какой ADMIN_SECRET используется
console.log('🔍 Проверка ADMIN_SECRET...\n');

const adminSecret = process.env.ADMIN_SECRET;

if (adminSecret) {
  console.log('✅ ADMIN_SECRET найден в .env');
  console.log(`   Значение: ${adminSecret.substring(0, 10)}...${adminSecret.substring(adminSecret.length - 4)}`);
  console.log(`   Длина: ${adminSecret.length} символов\n`);
  
  console.log('💡 Попробуйте создать пользователя с этим секретом:');
  console.log(`   node test-create-user.js https://api.prepromo.online "${adminSecret}"`);
} else {
  console.log('❌ ADMIN_SECRET не найден в .env файле');
  console.log('\n💡 Возможные варианты:');
  console.log('   1. Проверьте файл backend/.env');
  console.log('   2. Проверьте Render Dashboard → Environment Variables');
  console.log('   3. Или попробуйте стандартный секрет: admin-secret-2025-yookassa');
}

console.log('\n📋 Инструкция:');
console.log('   1. Зайдите в Render Dashboard');
console.log('   2. Откройте Backend сервис');
console.log('   3. Environment → Environment Variables');
console.log('   4. Найдите ADMIN_SECRET');
console.log('   5. Скопируйте значение');
console.log('   6. Используйте его в команде:');
console.log('      node test-create-user.js https://api.prepromo.online "ВАШ-СЕКРЕТ"');

