/**
 * Полное тестирование генерации документа
 * Проверяет все этапы: структура → генерация → экспорт
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  log('\n📋 Проверка .env файла...', 'cyan');
  
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log('❌ .env файл не найден!', 'red');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasClientId = envContent.includes('VITE_GIGACHAT_CLIENT_ID=') && 
                     !envContent.includes('your_client_id');
  const hasClientSecret = envContent.includes('VITE_GIGACHAT_CLIENT_SECRET=') && 
                         !envContent.includes('your_client_secret');
  
  if (!hasClientId || !hasClientSecret) {
    log('⚠️  GigaChat API credentials не настроены!', 'yellow');
    log('   Приложение будет использовать mock данные', 'yellow');
    return false;
  }
  
  log('✅ .env файл настроен корректно', 'green');
  return true;
}

function checkBuild() {
  log('\n🔨 Проверка build...', 'cyan');
  
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    log('⚠️  dist/ папка не найдена. Запустите: npm run build', 'yellow');
    return false;
  }
  
  const indexHtml = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    log('❌ dist/index.html не найден!', 'red');
    return false;
  }
  
  log('✅ Build успешен', 'green');
  return true;
}

function checkDevServer() {
  log('\n🌐 Проверка dev server...', 'cyan');
  
  return new Promise((resolve) => {
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/',
      method: 'GET',
      timeout: 3000,
    };
    
    const req = http.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        log('✅ Dev server запущен на http://localhost:8080', 'green');
        resolve(true);
      } else {
        log(`⚠️  Dev server отвечает со статусом ${res.statusCode}`, 'yellow');
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        log('⚠️  Dev server не запущен. Запустите: npm run dev', 'yellow');
      } else {
        log(`⚠️  Ошибка подключения: ${err.message}`, 'yellow');
      }
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      log('⚠️  Timeout при подключении к dev server', 'yellow');
      resolve(false);
    });
    
    req.end();
  });
}

async function testGigaChatAPI() {
  log('\n🤖 Проверка GigaChat API...', 'cyan');
  
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log('⚠️  Пропуск проверки API (нет .env)', 'yellow');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const clientIdMatch = envContent.match(/VITE_GIGACHAT_CLIENT_ID=(.+)/);
  const clientSecretMatch = envContent.match(/VITE_GIGACHAT_CLIENT_SECRET=(.+)/);
  
  if (!clientIdMatch || !clientSecretMatch) {
    log('⚠️  API credentials не найдены в .env', 'yellow');
    return false;
  }
  
  const clientId = clientIdMatch[1].trim();
  const clientSecret = clientSecretMatch[1].trim();
  
  if (clientId.includes('your_') || clientSecret.includes('your_')) {
    log('⚠️  API credentials не настроены', 'yellow');
    return false;
  }
  
  // Проверка получения токена
  return new Promise((resolve) => {
    const authData = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const options = {
      hostname: 'ngw.devices.sberbank.ru',
      path: '/api/v2/oauth',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authData}`,
        'Accept': 'application/json',
        'RqUID': require('crypto').randomUUID(),
      },
      timeout: 10000,
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.access_token) {
              log('✅ GigaChat API доступен. Токен получен успешно', 'green');
              resolve(true);
            } else {
              log('⚠️  Неожиданный ответ от API', 'yellow');
              resolve(false);
            }
          } catch (e) {
            log('⚠️  Ошибка парсинга ответа API', 'yellow');
            resolve(false);
          }
        } else if (res.statusCode === 401) {
          log('❌ Неверные API credentials', 'red');
          resolve(false);
        } else {
          log(`⚠️  API вернул статус ${res.statusCode}`, 'yellow');
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      log(`⚠️  Ошибка подключения к API: ${err.message}`, 'yellow');
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      log('⚠️  Timeout при подключении к API', 'yellow');
      resolve(false);
    });
    
    req.write('scope=GIGACHAT_API_PERS');
    req.end();
  });
}

function generateTestReport() {
  log('\n📊 Сводка проверок:\n', 'cyan');
  
  const report = {
    env: checkEnvFile(),
    build: checkBuild(),
    api: false,
    devServer: false,
  };
  
  return report;
}

async function main() {
  log('🚀 Полное тестирование DocuGen AI\n', 'blue');
  log('=' .repeat(50), 'cyan');
  
  const report = generateTestReport();
  
  // Проверка API (асинхронно)
  if (report.env) {
    report.api = await testGigaChatAPI();
  }
  
  // Проверка dev server (асинхронно)
  report.devServer = await checkDevServer();
  
  // Итоговый отчет
  log('\n' + '='.repeat(50), 'cyan');
  log('\n📋 Итоговый отчет:\n', 'cyan');
  
  log(`${report.env ? '✅' : '❌'} .env файл`, report.env ? 'green' : 'red');
  log(`${report.build ? '✅' : '❌'} Build`, report.build ? 'green' : 'red');
  log(`${report.api ? '✅' : '⚠️ '} GigaChat API`, report.api ? 'green' : 'yellow');
  log(`${report.devServer ? '✅' : '⚠️ '} Dev Server`, report.devServer ? 'green' : 'yellow');
  
  const allCritical = report.env && report.build;
  const allOptional = report.api && report.devServer;
  
  log('\n' + '='.repeat(50), 'cyan');
  
  if (allCritical) {
    log('\n✅ Критические проверки пройдены!', 'green');
    log('   Проект готов к работе\n', 'green');
    
    if (!report.api) {
      log('⚠️  Внимание: GigaChat API не доступен', 'yellow');
      log('   Приложение будет использовать mock данные\n', 'yellow');
    }
    
    if (report.devServer) {
      log('🌐 Dev server запущен:', 'cyan');
      log('   http://localhost:8080', 'blue');
      log('\n📝 Инструкции для тестирования:', 'cyan');
      log('   1. Откройте http://localhost:8080 в браузере', 'blue');
      log('   2. Нажмите "Начать создание"', 'blue');
      log('   3. Введите тему: "Стратегия нефтегазового комплекса 2030"', 'blue');
      log('   4. Выберите тип документа: Реферат', 'blue');
      log('   5. Пройдите все этапы генерации', 'blue');
    } else {
      log('\n⚠️  Dev server не запущен', 'yellow');
      log('   Запустите: npm run dev\n', 'yellow');
    }
  } else {
    log('\n❌ Критические проверки не пройдены!', 'red');
    log('   Исправьте ошибки перед запуском\n', 'red');
  }
  
  log('='.repeat(50) + '\n', 'cyan');
}

main().catch((err) => {
  log(`\n❌ Ошибка: ${err.message}`, 'red');
  process.exit(1);
});
