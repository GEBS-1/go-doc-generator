const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const { get: dbGet, run: dbRun, pool } = require('./db');

let bot = null;
let dbReady = false;

// Проверяем готовность базы данных
const checkDbReady = async () => {
  if (dbReady) return true;
  try {
    await pool.query('SELECT 1');
    dbReady = true;
    return true;
  } catch (error) {
    console.error('[Telegram Bot] База данных не готова:', error.message);
    return false;
  }
};

// Регистрация пользователя из данных Telegram бота
const registerUserFromTelegram = async (telegramUser) => {
  const telegramId = telegramUser.id;
  const firstName = telegramUser.first_name || null;
  const lastName = telegramUser.last_name || null;
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
  const username = telegramUser.username || null;
  // Фото из Telegram бота получить сложнее, оставляем null
  const photoUrl = null;

  // Проверяем, существует ли пользователь
  const existing = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);

  if (existing) {
    // Обновляем данные пользователя
    await dbRun(
      `UPDATE users
       SET username = ?, first_name = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [username, fullName, existing.id],
    );
    return { isNew: false, userId: existing.id };
  }

  // Создаем нового пользователя
  const insertResult = await dbRun(
    'INSERT INTO users (telegram_id, username, first_name, photo_url) VALUES (?, ?, ?, ?) RETURNING id',
    [telegramId, username, fullName, photoUrl],
  );

  const newUserId = insertResult.lastID || insertResult.rows?.[0]?.id;
  if (!newUserId) {
    throw new Error('Не удалось получить идентификатор нового пользователя');
  }

  // Создаем бесплатную подписку
  const now = new Date();
  const resetDate = new Date(now);
  resetDate.setMonth(resetDate.getMonth() + 1);
  resetDate.setDate(1);
  resetDate.setHours(0, 0, 0, 0);

  await dbRun(
    `INSERT INTO subscriptions (
      user_id, plan, status, docs_generated, docs_limit, activated_at, reset_date, updated_at
    ) VALUES (?, 'free', 'active', 0, 1, ?, ?, CURRENT_TIMESTAMP)`,
    [newUserId, now.toISOString(), resetDate.toISOString()],
  );

  return { isNew: true, userId: newUserId };
};

// Генерация временного токена для авторизации (как на poehali.dev)
const generateAuthToken = async (telegramId) => {
  // Генерируем UUID токен
  const token = crypto.randomUUID();
  
  // Токен валиден 5 минут
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);
  
  // Сохраняем токен в БД
  await dbRun(
    `INSERT INTO auth_tokens (token, telegram_id, expires_at) 
     VALUES (?, ?, ?)`,
    [token, telegramId, expiresAt.toISOString()]
  );
  
  console.log('[Telegram Bot] Сгенерирован токен авторизации:', {
    token: token.substring(0, 8) + '...',
    telegramId,
    expiresAt: expiresAt.toISOString(),
  });
  
  return token;
};

// Проверяем, валиден ли URL для Telegram (не localhost)
const isValidTelegramUrl = (url) => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    // Telegram не принимает localhost, 127.0.0.1, или IP адреса
    const hostname = urlObj.hostname.toLowerCase();
    return (
      (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') &&
      !hostname.includes('localhost') &&
      !hostname.includes('127.0.0.1') &&
      !hostname.match(/^\d+\.\d+\.\d+\.\d+$/) &&
      !hostname.includes('::1')
    );
  } catch {
    return false;
  }
};

const initTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

  if (!token) {
    console.warn('[Telegram Bot] TELEGRAM_BOT_TOKEN не задан. Бот не будет запущен.');
    return null;
  }

  try {
    // Автоматически определяем, использовать ли webhook
    // В production (Render) используем webhook, локально - polling
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.RENDER === 'true' ||
                         process.env.TELEGRAM_USE_WEBHOOK === 'true';
    
    if (isProduction) {
      // Production: используем webhook
      bot = new TelegramBot(token, { polling: false });
      console.log('[Telegram Bot] Режим: Webhook (production)');
      
      // Устанавливаем webhook при старте
      // Используем URL backend сервиса, не frontend
      const backendUrl = process.env.BACKEND_URL || 
                        process.env.RENDER_EXTERNAL_URL ||
                        'https://go-doc-generator-backend.onrender.com';
      const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || 
                        `${backendUrl.replace(/\/$/, '')}/api/telegram/webhook`;
      
      bot.setWebHook(webhookUrl)
        .then(() => {
          console.log(`[Telegram Bot] Webhook установлен: ${webhookUrl}`);
        })
        .catch((error) => {
          console.error('[Telegram Bot] Ошибка установки webhook:', error.message);
        });
    } else {
      // Development: используем polling
      bot = new TelegramBot(token, { polling: true });
      console.log('[Telegram Bot] Режим: Polling (development)');
    }

    // Обработка ошибок polling (409 Conflict)
    bot.on('polling_error', (error) => {
      // Игнорируем ошибку 409 - это нормально при перезапуске или нескольких экземплярах
      if (error.code === 'ETELEGRAM' && error.response?.body?.error_code === 409) {
        console.warn('[Telegram Bot] Polling конфликт (409) - другой экземпляр бота активен. Это нормально при перезапуске.');
        return;
      }
      // Для других ошибок логируем
      console.error('[Telegram Bot] Polling error:', error.message);
    });

    // Обработка любого сообщения для автоматической регистрации
    bot.on('message', async (msg) => {
      // Пропускаем команды, они обрабатываются отдельно
      if (msg.text && msg.text.startsWith('/')) {
        return;
      }

      const chatId = msg.chat.id;
      const telegramId = msg.from.id;

      try {
        const isReady = await checkDbReady();
        if (!isReady) return;

        // Проверяем, зарегистрирован ли пользователь
        const user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        
        if (!user) {
          // Автоматически регистрируем при первом сообщении
          await registerUserFromTelegram(msg.from);
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
          
          await bot.sendMessage(
            chatId,
            `🎉 Добро пожаловать в DocuGen!\n\n` +
            `✅ Вы автоматически зарегистрированы!\n\n` +
            `📝 Используйте команду /start для управления подпиской и получения информации.\n\n` +
            `🌐 Откройте сайт: ${frontendUrl}`,
          );
        }
      } catch (error) {
        console.error('[Telegram Bot] Error in message handler:', error);
      }
    });

    // Обработка команды /start
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from.id;

      try {
        // Проверяем готовность базы данных
        const isReady = await checkDbReady();
        if (!isReady) {
          await bot.sendMessage(
            chatId,
            '⏳ База данных еще не готова. Пожалуйста, попробуйте через несколько секунд.',
          );
          return;
        }

        // Автоматически регистрируем пользователя, если его нет
        const registrationResult = await registerUserFromTelegram(msg.from);
        
        // Генерируем временный токен для авторизации (как на poehali.dev)
        const authToken = await generateAuthToken(telegramId);
        const authLink = `${frontendUrl}/auth?token=${authToken}`;
        
        // Получаем данные пользователя с подпиской
        const user = await dbGet(
          `SELECT u.*, s.plan, s.status, s.docs_generated, s.docs_limit
           FROM users u
           LEFT JOIN subscriptions s ON u.id = s.user_id
           WHERE u.telegram_id = ?`,
          [telegramId]
        );

        const keyboard = [];
        // Добавляем кнопку с ссылкой для авторизации
        keyboard.push([{ text: '🔐 Войти на сайт', url: authLink }]);
        if (isValidTelegramUrl(frontendUrl)) {
          keyboard.push([{ text: '🌐 Открыть сайт', url: frontendUrl }]);
        }
        keyboard.push([
          { text: '📊 Статус подписки', callback_data: 'subscription' },
          { text: '📄 Использование', callback_data: 'usage' },
        ]);

        if (registrationResult.isNew) {
          // Новый пользователь - приветствие с регистрацией
          const planInfo = user?.plan 
            ? `\n📦 Тариф: ${user.plan}\n` 
            : '\n📦 Тариф: Бесплатный\n';

          await bot.sendMessage(
            chatId,
            `🎉 Добро пожаловать в DocuGen, ${msg.from.first_name || 'пользователь'}!\n\n` +
            `✅ Вы успешно зарегистрированы!${planInfo}\n\n` +
            `🔐 Нажмите кнопку ниже, чтобы войти на сайт:\n` +
            `(Ссылка действительна 5 минут)\n\n` +
            `📝 После входа вы сможете:\n` +
            `• Генерировать документы по ГОСТ\n` +
            `• Использовать команды бота для управления подпиской\n` +
            `• Отслеживать использование документов\n\n` +
            `Используйте команды:\n` +
            `/subscription - статус подписки\n` +
            `/usage - использовано документов\n` +
            `/upgrade - купить подписку`,
            {
              reply_markup: {
                inline_keyboard: keyboard,
              },
            }
          );
        } else {
          // Существующий пользователь
          const planInfo = user?.plan 
            ? `\n📦 Тариф: ${user.plan}\n` 
            : '\n📦 Тариф: Бесплатный\n';

          await bot.sendMessage(
            chatId,
            `👋 Привет, ${msg.from.first_name || 'пользователь'}!\n\n` +
            `✅ Вы уже зарегистрированы в DocuGen!${planInfo}\n\n` +
            `🔐 Нажмите кнопку ниже, чтобы войти на сайт:\n` +
            `(Ссылка действительна 5 минут)\n\n` +
            `📝 Используйте команды:\n` +
            `/subscription - статус подписки\n` +
            `/usage - использовано документов\n` +
            `/upgrade - купить подписку`,
            {
              reply_markup: {
                inline_keyboard: keyboard,
              },
            }
          );
        }
      } catch (error) {
        console.error('[Telegram Bot] Error in /start:', error);
        console.error('[Telegram Bot] Error stack:', error.stack);
        console.error('[Telegram Bot] Error details:', {
          message: error.message,
          code: error.code,
          telegramId,
          chatId,
        });
        try {
          await bot.sendMessage(
            chatId,
            `❌ Произошла ошибка: ${error.message}\n\nПопробуйте позже или обратитесь в поддержку.`,
          );
        } catch (sendError) {
          console.error('[Telegram Bot] Failed to send error message:', sendError);
        }
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
          const keyboard = [];
          if (isValidTelegramUrl(frontendUrl)) {
            keyboard.push([{ text: '🌐 Открыть сайт', url: frontendUrl }]);
          }

          await bot.sendMessage(
            chatId,
            '❌ Вы не зарегистрированы. Авторизуйтесь на сайте через Telegram Login Widget.\n\n' +
            `🌐 Открыть сайт: ${frontendUrl}`,
            {
              reply_markup: keyboard.length > 0 ? {
                inline_keyboard: keyboard,
              } : undefined,
            }
          );
          return;
        }

        if (!user.plan) {
          const keyboard = [];
          const upgradeUrl = `${frontendUrl}/generator`;
          if (isValidTelegramUrl(upgradeUrl)) {
            keyboard.push([{ text: '💳 Купить подписку', url: upgradeUrl }]);
          }

          await bot.sendMessage(
            chatId,
            '📊 У вас нет активной подписки.\n\n' +
            '💡 Оформите подписку для генерации документов:\n' +
            `🌐 Открыть сайт: ${frontendUrl}`,
            {
              reply_markup: keyboard.length > 0 ? {
                inline_keyboard: keyboard,
              } : undefined,
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

        const keyboard = [];
        const upgradeUrl = `${frontendUrl}/generator`;
        if (isValidTelegramUrl(upgradeUrl)) {
          keyboard.push([{ text: '💳 Обновить подписку', url: upgradeUrl }]);
        }

        await bot.sendMessage(
          chatId,
          `📊 Статус подписки\n\n` +
          `📦 Тариф: ${planName}\n` +
          `Статус: ${statusEmoji} ${user.status === 'active' ? 'Активна' : 'Неактивна'}\n` +
          `📄 Использовано: ${usedText}\n` +
          `📅 Истекает: ${expiresText}\n` +
          (user.activated_at ? `🕐 Активирована: ${new Date(user.activated_at).toLocaleDateString('ru-RU')}` : ''),
          {
            reply_markup: keyboard.length > 0 ? {
              inline_keyboard: keyboard,
            } : undefined,
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

        const keyboard = [];
        const upgradeUrl = `${frontendUrl}/generator`;
        if (isValidTelegramUrl(upgradeUrl)) {
          keyboard.push([{ text: '💳 Обновить подписку', url: upgradeUrl }]);
        }

        await bot.sendMessage(
          chatId,
          `📊 Использование документов\n\n` +
          `📄 Использовано: ${usedText}\n` +
          `🔄 Сброс лимита: ${resetText}\n\n` +
          (user.docs_limit != null && user.docs_generated >= user.docs_limit
            ? '⚠️ Лимит исчерпан. Обновите подписку для продолжения работы.'
            : '✅ Лимит не исчерпан.'),
          {
            reply_markup: keyboard.length > 0 ? {
              inline_keyboard: keyboard,
            } : undefined,
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
      const keyboard = [];
      const upgradeUrl = `${frontendUrl}/generator`;
      if (isValidTelegramUrl(upgradeUrl)) {
        keyboard.push([{ text: '💳 Купить подписку', url: upgradeUrl }]);
      }

      await bot.sendMessage(
        chatId,
        '💳 Обновление подписки\n\n' +
        'Выберите тариф на сайте:\n' +
        `🌐 Открыть сайт: ${frontendUrl}`,
        {
          reply_markup: keyboard.length > 0 ? {
            inline_keyboard: keyboard,
          } : undefined,
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
    const keyboard = [];
    if (isValidTelegramUrl(frontendUrl)) {
      keyboard.push([{ text: '🌐 Открыть сайт', url: frontendUrl }]);
    }

    return await sendNotification(
      user.telegram_id,
      `✅ Оплата успешна!\n\n` +
      `Ваша подписка "${planName}" активирована.\n\n` +
      `Теперь вы можете генерировать документы без ограничений.`,
      {
        reply_markup: keyboard.length > 0 ? {
          inline_keyboard: keyboard,
        } : undefined,
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
    const keyboard = [];
    const upgradeUrl = `${frontendUrl}/generator`;
    if (isValidTelegramUrl(upgradeUrl)) {
      keyboard.push([{ text: '💳 Обновить подписку', url: upgradeUrl }]);
    }

    return await sendNotification(
      user.telegram_id,
      `⚠️ Подписка истекает через ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}!\n\n` +
      `Обновите подписку, чтобы продолжить пользоваться сервисом.`,
      {
        reply_markup: keyboard.length > 0 ? {
          inline_keyboard: keyboard,
        } : undefined,
      }
    );
  } catch (error) {
    console.error('[Telegram Bot] Error in notifySubscriptionExpiring:', error);
    return false;
  }
};

/**
 * Уведомление о регистрации нового пользователя
 */
const notifyUserRegistered = async (telegramId, firstName) => {
  try {
    if (!bot) {
      console.warn('[Telegram Bot] Бот не инициализирован, уведомление о регистрации не отправлено');
      return false;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const keyboard = [];
    if (isValidTelegramUrl(frontendUrl)) {
      keyboard.push([{ text: '🌐 Открыть сайт', url: frontendUrl }]);
    }
    keyboard.push([
      { text: '📊 Статус подписки', callback_data: 'subscription' },
      { text: '📄 Использование', callback_data: 'usage' },
    ]);

    return await sendNotification(
      telegramId,
      `🎉 Добро пожаловать в DocuGen, ${firstName || 'пользователь'}!\n\n` +
      `✅ Вы успешно зарегистрированы!\n\n` +
      `📝 Теперь вы можете:\n` +
      `• Генерировать документы по ГОСТ\n` +
      `• Использовать команды бота для управления подпиской\n` +
      `• Отслеживать использование документов\n\n` +
      `Используйте команды:\n` +
      `/subscription - статус подписки\n` +
      `/usage - использовано документов\n` +
      `/upgrade - купить подписку`,
      {
        reply_markup: keyboard.length > 0 ? {
          inline_keyboard: keyboard,
        } : undefined,
      }
    );
  } catch (error) {
    console.error('[Telegram Bot] Error in notifyUserRegistered:', error);
    return false;
  }
};

module.exports = {
  initTelegramBot,
  sendNotification,
  notifyPaymentSuccess,
  notifyDocumentGenerated,
  notifySubscriptionExpiring,
  notifyUserRegistered,
  getBot: () => bot,
};

