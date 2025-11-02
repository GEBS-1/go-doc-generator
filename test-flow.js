/**
 * Тестовый скрипт для проверки основных компонентов MVP
 * Запуск: node test-flow.js
 */

const { spawn } = require('child_process');

console.log('🧪 Тестирование MVP генератора документов...\n');

// Проверяем наличие основных файлов
const fs = require('fs');

const requiredFiles = [
  'src/App.tsx',
  'src/pages/Generator.tsx',
  'src/components/steps/ThemeInput.tsx',
  'src/components/steps/StructureEditor.tsx',
  'src/components/steps/TextGeneration.tsx',
  'src/components/steps/DocumentEditor.tsx',
  'src/components/steps/TitlePage.tsx',
  'src/lib/gigachat.ts',
  'package.json',
  'vite.config.ts',
  '.env'
];

console.log('📋 Проверка файлов проекта...');
let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  if (exists) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - НЕ НАЙДЕН`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Не все необходимые файлы найдены!');
  process.exit(1);
}

console.log('\n✅ Все файлы на месте!\n');

// Проверяем .env
console.log('🔐 Проверка конфигурации...');
const envContent = fs.readFileSync('.env', 'utf8');
const hasClientId = envContent.includes('VITE_GIGACHAT_CLIENT_ID=') && !envContent.includes('your_client_id');
const hasSecret = envContent.includes('VITE_GIGACHAT_CLIENT_SECRET=') && !envContent.includes('your_client_secret');

if (hasClientId && hasSecret) {
  console.log('  ✅ GigaChat API credentials настроены');
} else {
  console.log('  ⚠️  GigaChat API credentials не настроены (будет использоваться demo режим)');
}

// Проверяем package.json
console.log('\n📦 Проверка зависимостей...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['react', 'docx', 'file-saver', '@tanstack/react-query', 'react-router-dom'];
const missingDeps = [];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`  ✅ ${dep}`);
  } else {
    console.log(`  ❌ ${dep} - не установлен`);
    missingDeps.push(dep);
  }
});

if (missingDeps.length > 0) {
  console.log('\n⚠️  Некоторые зависимости не установлены. Запустите: npm install');
}

// Проверяем структуру проекта
console.log('\n📂 Проверка структуры проекта...');
const requiredDirs = [
  'src',
  'src/components',
  'src/components/steps',
  'src/lib',
  'src/pages',
  'public'
];

let allDirsExist = true;
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  if (exists) {
    console.log(`  ✅ ${dir}/`);
  } else {
    console.log(`  ❌ ${dir}/ - НЕ НАЙДЕН`);
    allDirsExist = false;
  }
});

// Итоговая проверка
console.log('\n' + '='.repeat(60));
console.log('📊 ИТОГОВЫЙ ОТЧЁТ');
console.log('='.repeat(60));

if (allFilesExist && allDirsExist) {
  console.log('✅ Проект готов к работе!');
  console.log('\n🚀 Для запуска приложения:');
  console.log('   npm run dev');
  console.log('\n🌐 Откройте в браузере:');
  console.log('   http://localhost:8080');
  console.log('\n📝 Для сборки production:');
  console.log('   npm run build');
  console.log('\n📚 Документация:');
  console.log('   - TEST_PLAN.md - план тестирования');
  console.log('   - MVP_FEATURES.md - список реализованных фич');
  console.log('   - README.md - основная документация');
} else {
  console.log('❌ Проект не готов. Проверьте ошибки выше.');
  process.exit(1);
}

console.log('\n✅ Тестирование завершено!\n');
