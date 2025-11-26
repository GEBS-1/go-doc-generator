require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;
const BACKEND_URL = 'http://localhost:3001';

async function testPayment() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ СОЗДАНИЯ ПЛАТЕЖА YOOKASSA\n');
    console.log('='.repeat(60));

    // Создаем токен для тестового пользователя (ID: 5)
    const token = jwt.sign({ sub: 5 }, AUTH_JWT_SECRET, { expiresIn: '7d' });
    console.log('✅ JWT токен создан\n');

    // Тестируем создание платежа для тарифа "basic" (199 ₽)
    console.log('📤 Отправка запроса на создание платежа...');
    console.log('   План: basic (199 ₽)');
    console.log('   URL: POST /api/payments/create\n');

    const response = await axios.post(
      `${BACKEND_URL}/api/payments/create`,
      { planId: 'basic' },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ ПЛАТЕЖ УСПЕШНО СОЗДАН!');
    console.log('='.repeat(60));
    console.log('\n📋 РЕЗУЛЬТАТ:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n' + '='.repeat(60));

    if (response.data.confirmationUrl) {
      console.log('\n🔗 Ссылка на оплату YooKassa:');
      console.log(response.data.confirmationUrl);
      console.log('\n💳 Для тестирования используйте тестовую карту:');
      console.log('   Номер: 5555555555554444');
      console.log('   Срок: 12/25 (любая будущая дата)');
      console.log('   CVC: 123');
    }

    if (response.data.status === 'activated') {
      console.log('\n✅ Подписка активирована сразу (бесплатный план)');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ОШИБКА ПРИ СОЗДАНИИ ПЛАТЕЖА:');
    console.error('='.repeat(60));
    
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Запрос отправлен, но ответа нет');
      console.error('Проверьте, запущен ли backend на порту 3001');
    } else {
      console.error('Ошибка:', error.message);
    }
    
    console.error('\n' + '='.repeat(60) + '\n');
    process.exit(1);
  }
}

testPayment();

