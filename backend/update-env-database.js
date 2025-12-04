const fs = require('fs');
const path = require('path');

// Новый DATABASE_URL для Render
const NEW_DATABASE_URL = 'postgresql://docugen_postgres_user:coAtVPH0nMGseKX0iVqwQzJ3FHZWiVAA@dpg-d49j6cili9vc739sk15g-a.oregon-postgres.render.com:5432/docugen_postgres?sslmode=require';

const envPath = path.join(__dirname, '.env');

console.log('🔧 Обновление DATABASE_URL в backend/.env...\n');

// Проверяем, существует ли .env файл
if (!fs.existsSync(envPath)) {
  console.log('⚠️  Файл .env не найден. Создаю новый файл...');
  
  // Создаем новый .env файл
  fs.writeFileSync(envPath, `DATABASE_URL=${NEW_DATABASE_URL}\n`);
  console.log('✅ Файл .env создан с новым DATABASE_URL');
  process.exit(0);
}

// Читаем существующий .env файл
let envContent = fs.readFileSync(envPath, 'utf8');

// Проверяем, есть ли уже DATABASE_URL
if (envContent.includes('DATABASE_URL=')) {
  // Заменяем существующий DATABASE_URL
  const lines = envContent.split('\n');
  const updatedLines = lines.map(line => {
    if (line.startsWith('DATABASE_URL=')) {
      console.log('📝 Заменяю существующий DATABASE_URL...');
      return `DATABASE_URL=${NEW_DATABASE_URL}`;
    }
    return line;
  });
  envContent = updatedLines.join('\n');
} else {
  // Добавляем новый DATABASE_URL в конец файла
  console.log('📝 Добавляю новый DATABASE_URL в .env...');
  envContent += `\nDATABASE_URL=${NEW_DATABASE_URL}\n`;
}

// Записываем обновленный .env файл
fs.writeFileSync(envPath, envContent);

console.log('✅ DATABASE_URL успешно обновлен!');
console.log('\n📋 Новый DATABASE_URL:');
console.log(`   ${NEW_DATABASE_URL.substring(0, 50)}...`);
console.log('\n✅ Теперь можно проверить подключение:');
console.log('   node test-db-connection.js');

