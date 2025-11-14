# Telegram Bot для DocuGen

## Описание

Telegram бот для уведомлений и управления подпиской через команды.

## Функционал

### Команды бота

- `/start` - Приветствие и ссылка на сайт
- `/subscription` - Статус подписки (тариф, использовано документов, дата истечения)
- `/usage` - Использование документов (сколько использовано из лимита)
- `/upgrade` - Ссылка на покупку подписки

### Уведомления

Бот автоматически отправляет уведомления:

1. **При успешной оплате** - когда пользователь оплачивает подписку через ЮКассу
2. **При генерации документа** - когда пользователь успешно генерирует документ
3. **При истечении подписки** - напоминание за несколько дней до истечения (планируется)

## Настройка

### Переменные окружения

```env
# Обязательно
TELEGRAM_BOT_TOKEN=ваш_токен_бота

# Опционально
TELEGRAM_USE_WEBHOOK=false  # true для использования webhook вместо polling
FRONTEND_URL=https://ваш-домен.ru  # URL фронтенда для ссылок в сообщениях
```

### Получение токена бота

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный токен в `TELEGRAM_BOT_TOKEN`

### Режимы работы

#### Polling (по умолчанию)

Бот опрашивает Telegram API на наличие новых сообщений. Работает из коробки, не требует дополнительной настройки.

#### Webhook (для production)

Для использования webhook:

1. Установите `TELEGRAM_USE_WEBHOOK=true`
2. Настройте webhook в Telegram:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
     -d "url=https://ваш-backend.onrender.com/api/telegram/webhook"
   ```

## Интеграция

### Уведомления при оплате

Уведомления отправляются автоматически при успешной оплате через webhook ЮКассы.

### Уведомления при генерации документа

Для отправки уведомления при генерации документа, передайте `documentName` в запросе:

```javascript
POST /api/subscription/consume
{
  "consume": true,
  "documentName": "Название документа"
}
```

## Использование в коде

### Отправка уведомления вручную

```javascript
const { sendNotification } = require('./telegram-bot');

await sendNotification(telegramId, 'Ваше сообщение', {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Кнопка', url: 'https://example.com' }],
    ],
  },
});
```

### Уведомление об успешной оплате

```javascript
const { notifyPaymentSuccess } = require('./telegram-bot');

await notifyPaymentSuccess(userId, 'Базовый');
```

### Уведомление о генерации документа

```javascript
const { notifyDocumentGenerated } = require('./telegram-bot');

await notifyDocumentGenerated(userId, 'Мой документ.docx');
```

## Проверка работы

1. Найдите вашего бота в Telegram по username
2. Отправьте команду `/start`
3. Должно прийти приветственное сообщение

## Troubleshooting

### Бот не отвечает

1. Проверьте, что `TELEGRAM_BOT_TOKEN` задан в переменных окружения
2. Проверьте логи сервера - должно быть сообщение `[Telegram Bot] Бот успешно инициализирован`
3. Убедитесь, что бот запущен (не заблокирован в BotFather)

### Уведомления не приходят

1. Проверьте, что пользователь авторизован через Telegram Login Widget
2. Убедитесь, что в БД есть `telegram_id` для пользователя
3. Проверьте логи на наличие ошибок отправки

### Webhook не работает

1. Убедитесь, что `TELEGRAM_USE_WEBHOOK=true`
2. Проверьте, что webhook настроен в Telegram API
3. Убедитесь, что URL доступен извне (HTTPS обязателен)

