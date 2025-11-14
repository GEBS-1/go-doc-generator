const TelegramBot = require('node-telegram-bot-api');
const { get: dbGet } = require('./db');

let bot = null;

const initTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

  if (!token) {
    console.warn('[Telegram Bot] TELEGRAM_BOT_TOKEN не задан. Бот не будет запущен.');
    return null;
  }

  try {
    // Используем polling для получения обновлений
    // Для production можно переключить на webhook
    const useWebhook = process.env.TELEGRAM_USE_WEBHOOK === 'true';
    bot = new TelegramBot(token, { polling: !useWebhook });

    // Обработка команды /start
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from.id;

      try {
        const user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);

        if (user) {
          await bot.sendMessage(
            chatId,
            `👋 Привет, ${msg.from.first_name || 'пользователь'}!\n\n` +
            `Вы уже зарегистрированы в DocuGen.\n\n` +
            `📝 Используйте команды:\n` +
            `/subscription - статус подписки\n` +
            `/usage - использовано документов\n` +
            `/upgrade - купить подписку\n\n` +
            `🌐 Открыть сайт: ${frontendUrl}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🌐 Открыть сайт', url: frontendUrl }],
                  [{ text: '📊 Статус подписки', callback_data: 'subscription' }],
                ],
              },
            }
          );
        } else {
          await bot.sendMessage(
            chatId,
            `👋 Привет, ${msg.from.first_name || 'пользователь'}!\n\n` +
            `Добро пожаловать в DocuGen!\n\n` +
            `Для начала работы авторизуйтесь на сайте через Telegram Login Widget.\n\n` +
            `🌐 Открыть сайт: ${frontendUrl}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🌐 Открыть сайт', url: frontendUrl }],
                ],
              },
            }
          );
        }
      } catch (error) {
        console.error('[Telegram Bot] Error in /start:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
      }
    });

    // Обработка команды /subscription
    bot.onText(/\/subscription/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from.id;

      try {
        const user = await dbGet(
          `SELECT u.*, s.plan, s.status, s.docs_generated, s.docs_limit, s.expires_at, s.activated_at
           FROM users u
           LEFT JOIN subscriptions s ON u.id = s.user_id
           WHERE u.telegram_id = ?`,
          [telegramId]
        );

        if (!user) {
          await bot.sendMessage(
            chatId,
            '❌ Вы не зарегистрированы. Авторизуйтесь на сайте через Telegram Login Widget.\n\n' +
            `🌐 Открыть сайт: ${frontendUrl}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🌐 Открыть сайт', url: frontendUrl }],
                ],
              },
            }
          );
          return;
        }

        if (!user.plan) {
          await bot.sendMessage(
            chatId,
            '📊 У вас нет активной подписки.\n\n' +
            '💡 Оформите подписку для генерации документов:\n' +
            `🌐 Открыть сайт: ${frontendUrl}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💳 Купить подписку', url: `${frontendUrl}/generator` }],
                ],
              },
            }
          );
          return;
        }

        const planNames = {
          free: 'Бесплатный',
          basic: 'Базовый',
          premium: 'Премиум',
          single: 'Разовый документ',
        };

        const planName = planNames[user.plan] || user.plan;
        const statusEmoji = user.status === 'active' ? '✅' : '❌';
        const limitText = user.docs_limit == null ? '∞' : `${user.docs_limit}`;
        const usedText = `${user.docs_generated} / ${limitText}`;
        const expiresText = user.expires_at
          ? new Date(user.expires_at).toLocaleDateString('ru-RU')
          : 'Не ограничена';

        await bot.sendMessage(
          chatId,
          `📊 Статус подписки\n\n` +
          `📦 Тариф: ${planName}\n` +
          `Статус: ${statusEmoji} ${user.status === 'active' ? 'Активна' : 'Неактивна'}\n` +
          `📄 Использовано: ${usedText}\n` +
          `📅 Истекает: ${expiresText}\n` +
          (user.activated_at ? `🕐 Активирована: ${new Date(user.activated_at).toLocaleDateString('ru-RU')}` : ''),
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '💳 Обновить подписку', url: `${frontendUrl}/generator` }],
              ],
            },
          }
        );
      } catch (error) {
        console.error('[Telegram Bot] Error in /subscription:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
      }
    });

    // Обработка команды /usage
    bot.onText(/\/usage/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from.id;

      try {
        const user = await dbGet(
          `SELECT u.id, u.telegram_id, s.docs_generated, s.docs_limit, s.reset_date
           FROM users u
           LEFT JOIN subscriptions s ON u.id = s.user_id
           WHERE u.telegram_id = ?`,
          [telegramId]
        );

        if (!user) {
          await bot.sendMessage(chatId, '❌ Вы не зарегистрированы.');
          return;
        }

        const limitText = user.docs_limit == null ? '∞' : `${user.docs_limit}`;
        const usedText = `${user.docs_generated || 0} / ${limitText}`;
        const resetText = user.reset_date
          ? new Date(user.reset_date).toLocaleDateString('ru-RU')
          : 'Не установлена';

        await bot.sendMessage(
          chatId,
          `📊 Использование документов\n\n` +
          `📄 Использовано: ${usedText}\n` +
          `🔄 Сброс лимита: ${resetText}\n\n` +
          (user.docs_limit != null && user.docs_generated >= user.docs_limit
            ? '⚠️ Лимит исчерпан. Обновите подписку для продолжения работы.'
            : '✅ Лимит не исчерпан.'),
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '💳 Обновить подписку', url: `${frontendUrl}/generator` }],
              ],
            },
          }
        );
      } catch (error) {
        console.error('[Telegram Bot] Error in /usage:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
      }
    });

    // Обработка команды /upgrade
    bot.onText(/\/upgrade/, async (msg) => {
      const chatId = msg.chat.id;
      await bot.sendMessage(
        chatId,
        '💳 Обновление подписки\n\n' +
        'Выберите тариф на сайте:\n' +
        `🌐 Открыть сайт: ${frontendUrl}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💳 Купить подписку', url: `${frontendUrl}/generator` }],
            ],
          },
        }
      );
    });

    // Обработка callback кнопок
    bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;

      if (data === 'subscription') {
        // Триггерим команду /subscription
        const msg = { ...query.message, text: '/subscription', from: query.from };
        bot.emit('text', msg);
      }

      await bot.answerCallbackQuery(query.id);
    });

    console.log('[Telegram Bot] Бот успешно инициализирован');
    return bot;
  } catch (error) {
    console.error('[Telegram Bot] Ошибка инициализации:', error.message);
    return null;
  }
};

/**
 * Отправка уведомления пользователю
 */
const sendNotification = async (telegramId, message, options = {}) => {
  if (!bot) {
    console.warn('[Telegram Bot] Бот не инициализирован, уведомление не отправлено');
    return false;
  }

  try {
    await bot.sendMessage(telegramId, message, options);
    return true;
  } catch (error) {
    console.error(`[Telegram Bot] Ошибка отправки уведомления пользователю ${telegramId}:`, error.message);
    return false;
  }
};

/**
 * Уведомление об успешной оплате
 */
const notifyPaymentSuccess = async (userId, planName) => {
  try {
    const user = await dbGet('SELECT telegram_id FROM users WHERE id = ?', [userId]);
    if (!user || !user.telegram_id) {
      return false;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    return await sendNotification(
      user.telegram_id,
      `✅ Оплата успешна!\n\n` +
      `Ваша подписка "${planName}" активирована.\n\n` +
      `Теперь вы можете генерировать документы без ограничений.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Открыть сайт', url: frontendUrl }],
          ],
        },
      }
    );
  } catch (error) {
    console.error('[Telegram Bot] Error in notifyPaymentSuccess:', error);
    return false;
  }
};

/**
 * Уведомление о генерации документа
 */
const notifyDocumentGenerated = async (userId, documentName) => {
  try {
    const user = await dbGet(
      `SELECT u.telegram_id, s.docs_generated, s.docs_limit
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id
       WHERE u.id = ?`,
      [userId]
    );
    if (!user || !user.telegram_id) {
      return false;
    }

    const limitText = user.docs_limit == null ? '∞' : `${user.docs_limit}`;
    const usedText = `${user.docs_generated || 0} / ${limitText}`;

    return await sendNotification(
      user.telegram_id,
      `📄 Документ сгенерирован!\n\n` +
      `Название: ${documentName}\n` +
      `Использовано: ${usedText}`,
    );
  } catch (error) {
    console.error('[Telegram Bot] Error in notifyDocumentGenerated:', error);
    return false;
  }
};

/**
 * Уведомление об истечении подписки
 */
const notifySubscriptionExpiring = async (userId, daysLeft) => {
  try {
    const user = await dbGet('SELECT telegram_id FROM users WHERE id = ?', [userId]);
    if (!user || !user.telegram_id) {
      return false;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    return await sendNotification(
      user.telegram_id,
      `⚠️ Подписка истекает через ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}!\n\n` +
      `Обновите подписку, чтобы продолжить пользоваться сервисом.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Обновить подписку', url: `${frontendUrl}/generator` }],
          ],
        },
      }
    );
  } catch (error) {
    console.error('[Telegram Bot] Error in notifySubscriptionExpiring:', error);
    return false;
  }
};

module.exports = {
  initTelegramBot,
  sendNotification,
  notifyPaymentSuccess,
  notifyDocumentGenerated,
  notifySubscriptionExpiring,
  getBot: () => bot,
};

