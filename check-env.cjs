/**
 * Проверка переменных окружения
 * Запуск: node check-env.js
 */

const fs = require('fs');

console.log('🔍 Проверка .env файла...\n');

// Читаем .env файл
let envContent = '';
try {
  envContent = fs.readFileSync('.env', 'utf8');
} catch (error) {
  console.error('Ошибка чтения .env:', error.message);
  process.exit(1);
}

// Проверяем наличие credentials
const hasClientId = envContent.includes('VITE_GIGACHAT_CLIENT_ID=');
const hasSecret = envContent.includes('VITE_GIGACHAT_CLIENT_SECRET=');

console.log('Проверка структуры .env:');
console.log(`  Client ID: ${hasClientId ? '✅ Найдено' : '❌ Не найдено'}`);
console.log(`  Secret: ${hasSecret ? '✅ Найдено' : '❌ Не найдено'}\n`);

// Извлекаем значения
const clientIdMatch = envContent.match(/VITE_GIGACHAT_CLIENT_ID=(.+)/);
const secretMatch = envContent.match(/VITE_GIGACHAT_CLIENT_SECRET=(.+)/);

if (clientIdMatch) {
  const clientId = clientIdMatch[1].trim();
  console.log(`Client ID: ${clientId}`);
  console.log(`  Длина: ${clientId.length} символов`);
  console.log(`  Формат: ${/^[a-f0-9\-]+$/i.test(clientId) ? '✅ UUID' : '⚠️ Не UUID'}`);
}

if (secretMatch) {
  const secret = secretMatch[1].trim();
  console.log(`Client Secret: ${secret}`);
  console.log(`  Длина: ${secret.length} символов`);
  console.log(`  Формат: ${/^[a-f0-9\-]+$/i.test(secret) ? '✅ UUID' : '⚠️ Не UUID'}`);
}

// Проверяем, что это не placeholder значения
console.log('\nПроверка валидности:');
const isValid = clientIdMatch && secretMatch && 
  !clientIdMatch[1].includes('your_') && 
  !secretMatch[1].includes('your_') &&
  clientIdMatch[1].length > 10 &&
  secretMatch[1].length > 10;

if (isValid) {
  console.log('✅ Credentials выглядят валидными!');
} else {
  console.log('⚠️ Credentials могут быть placeholder значениями или неполными');
}

console.log('\n📝 Важно:');
console.log('- Vite автоматически загружает переменные из .env файла');
console.log('- Переменные доступны через import.meta.env.VITE_*');
console.log('- После изменения .env нужно перезапустить dev сервер');
console.log('- Файл .env в .gitignore (не коммитится)');

console.log('\n✅ Проверка завершена!\n');
