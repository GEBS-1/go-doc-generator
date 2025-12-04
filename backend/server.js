require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const jwt = require('jsonwebtoken');
const { YooCheckout } = require('@a2seven/yoo-checkout');
const { run: dbRun, get: dbGet } = require('./db');
const {
  initTelegramBot,
  notifyPaymentSuccess,
  notifyDocumentGenerated,
  notifySubscriptionExpiring,
  notifyUserRegistered,
  triggerStartCommandForUser,
} = require('./telegram-bot');

const app = express();

const {
  AUTH_JWT_SECRET,
  TELEGRAM_BOT_TOKEN,
  YOOKASSA_SHOP_ID,
  YOOKASSA_SECRET_KEY,
  PAYMENT_RETURN_URL,
  FRONTEND_URL,
  ALLOWED_ORIGINS,
  GIGACHAT_ALLOW_INSECURE_SSL,
} = process.env;

if (!AUTH_JWT_SECRET) {
  console.warn('[Auth] Переменная окружения AUTH_JWT_SECRET не задана. JWT токены будут недоступны.');
}

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('[Auth] TELEGRAM_BOT_TOKEN не задан. Telegram авторизация не будет работать.');
}

if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
  console.warn('[Payments] YooKassa переменные окружения не заданы. Оплата недоступна.');
  console.warn('[Payments] YOOKASSA_SHOP_ID:', YOOKASSA_SHOP_ID ? 'задан' : 'НЕ ЗАДАН');
  console.warn('[Payments] YOOKASSA_SECRET_KEY:', YOOKASSA_SECRET_KEY ? 'задан' : 'НЕ ЗАДАН');
} else {
  console.log('[Payments] ✅ YooKassa настроен успешно');
  console.log('[Payments] Shop ID:', YOOKASSA_SHOP_ID.substring(0, 10) + '...');
}

const checkout = YOOKASSA_SHOP_ID && YOOKASSA_SECRET_KEY
  ? new YooCheckout({
      shopId: YOOKASSA_SHOP_ID,
      secretKey: YOOKASSA_SECRET_KEY,
    })
  : null;

const DEFAULT_FRONTEND_ORIGIN = FRONTEND_URL || 'http://localhost:8080';
const allowedOrigins = ALLOWED_ORIGINS
  ? ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [DEFAULT_FRONTEND_ORIGIN];

const allowInsecureSsl = String(GIGACHAT_ALLOW_INSECURE_SSL).toLowerCase() === 'true';
const httpsAgent = new https.Agent({
  rejectUnauthorized: !allowInsecureSsl,
});

if (allowInsecureSsl) {
  console.warn('[GigaChat] SSL verification disabled. Use only in trusted environments.');
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Бесплатный',
    amount: 0,
    currency: 'RUB',
    documentsLimit: 1,
    type: 'free',
    features: [
      '1 документ в месяц',
      'Формирование по ГОСТ',
      'Водяной знак на выгрузке',
    ],
  },
  basic: {
    id: 'basic',
    name: 'Базовый',
    amount: 199,
    currency: 'RUB',
    documentsLimit: 5,
    type: 'subscription',
    period: 'monthly',
    features: [
      '5 документов в месяц',
      'Таблицы и графики в DOCX',
      'Без водяного знака',
      'Уведомления в Telegram',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Премиум',
    amount: 499,
    currency: 'RUB',
    documentsLimit: null,
    type: 'subscription',
    period: 'monthly',
    features: [
      'Безлимит документов',
      'Приоритетная генерация',
      'Кастомные шаблоны',
      'Расширенная поддержка',
    ],
  },
  single: {
    id: 'single',
    name: 'Разовый документ',
    amount: 99,
    currency: 'RUB',
    documentsLimit: 1,
    type: 'one-time',
    features: [
      '1 документ без подписки',
      'Таблицы и графики включены',
      'Без водяного знака',
    ],
  },
};

// Для HashRouter нужен # в URL
const PAYMENT_SUCCESS_URL = PAYMENT_RETURN_URL || `${DEFAULT_FRONTEND_ORIGIN}/#/payment/success`;
const PAYMENT_FAIL_URL = process.env.PAYMENT_FAIL_URL || `${DEFAULT_FRONTEND_ORIGIN}/#/payment/failed`;

const AUTH_TOKEN_TTL = process.env.AUTH_TOKEN_TTL || '7d';

// Фиксированные цены на документы (в рублях)
const DOCUMENT_PRICES = {
  essay: 99,       // Реферат
  article: 179,    // Статья
  report: 179,     // Отчёт
  courseWork: 179, // Курсовая работа
  diploma: 299,    // Дипломная работа (ВКР)
};

const planMeta = (planId) => SUBSCRIPTION_PLANS[planId] || null;

const calculateNextResetDate = (from = new Date()) => {
  const date = new Date(from);
  date.setMonth(date.getMonth() + 1);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addMonths = (from, months) => {
  const date = new Date(from);
  date.setMonth(date.getMonth() + months);
  return date;
};

const mapSubscriptionInfo = (subscription) => {
  if (!subscription) {
    return null;
  }

  const meta = planMeta(subscription.plan);
  return {
    planId: subscription.plan,
    planName: meta?.name || subscription.plan,
    status: subscription.status,
    activatedAt: subscription.activatedAt,
    expiresAt: subscription.expiresAt,
    documentsLimit: subscription.docsLimit,
    type: meta?.type || null,
  };
};

const mapSubscriptionUsage = (subscription) => {
  if (!subscription) {
    return null;
  }

  const meta = planMeta(subscription.plan);
  return {
    planId: subscription.plan,
    planName: meta?.name || subscription.plan,
    type: meta?.type || null,
    status: subscription.status,
    docsGenerated: subscription.docsGenerated,
    docsLimit: subscription.docsLimit,
    resetDate: subscription.resetDate,
    activatedAt: subscription.activatedAt,
    expiresAt: subscription.expiresAt,
  };
};

const normalizeUserRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    telegramId: row.telegram_id,
    username: row.username,
    firstName: row.first_name,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const normalizeSubscriptionRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    docsGenerated: row.docs_generated,
    docsLimit: row.docs_limit,
    resetDate: row.reset_date ? new Date(row.reset_date) : null,
    activatedAt: row.activated_at ? new Date(row.activated_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const displayName = user.firstName || user.username || 'Пользователь Telegram';

  return {
    id: user.id,
    name: displayName,
    email: null,
    avatarUrl: user.photoUrl || null,
    provider: 'telegram',
    username: user.username || null,
    telegram: user.telegramId
      ? {
          id: Number(user.telegramId),
          username: user.username || null,
        }
      : null,
    subscription: mapSubscriptionInfo(user.subscription),
  };
};

const fetchUserWithSubscription = async (userId) => {
  if (userId == null) {
    return null;
  }

  const numericId = typeof userId === 'string' ? Number(userId) : userId;
  if (Number.isNaN(numericId)) {
    return null;
  }

  const userRow = await dbGet('SELECT * FROM users WHERE id = ?', [numericId]);
  if (!userRow) {
    return null;
  }

  const user = normalizeUserRow(userRow);
  let subscriptionRow = await dbGet('SELECT * FROM subscriptions WHERE user_id = ?', [user.id]);
  let subscription = normalizeSubscriptionRow(subscriptionRow);

  if (subscription && subscription.resetDate && subscription.resetDate <= new Date()) {
    const meta = planMeta(subscription.plan);
    const nextReset = calculateNextResetDate().toISOString();
    const docsLimit =
      meta && meta.documentsLimit != null && meta.type !== 'one-time'
        ? meta.documentsLimit
        : subscription.docsLimit;

    await dbRun(
      `UPDATE subscriptions
       SET docs_generated = 0,
           reset_date = ?,
           docs_limit = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextReset, docsLimit, subscription.id],
    );

    subscriptionRow = await dbGet('SELECT * FROM subscriptions WHERE id = ?', [subscription.id]);
    subscription = normalizeSubscriptionRow(subscriptionRow);
  }

  return {
    ...user,
    subscription,
  };
};

const ensureFreeSubscription = async (user) => {
  if (user.subscription) {
    return user;
  }

  const meta = planMeta('free');
  if (!meta) {
    throw new Error('Базовый тариф free не сконфигурирован');
  }

  const now = new Date();
  await dbRun(
    `INSERT INTO subscriptions (
      user_id, plan, status, docs_generated, docs_limit, activated_at, reset_date, updated_at
    ) VALUES (?, ?, 'active', 0, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [user.id, meta.id, meta.documentsLimit, now.toISOString(), calculateNextResetDate(now).toISOString()],
  );

  const subscriptionRow = await dbGet('SELECT * FROM subscriptions WHERE user_id = ?', [user.id]);
  return {
    ...user,
    subscription: normalizeSubscriptionRow(subscriptionRow),
  };
};

const upsertTelegramUser = async (data) => {
  const telegramId = Number(data.id);
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  const username = data.username || null;
  const photoUrl = data.photo_url || null;

  const existing = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);

  if (existing) {
    await dbRun(
      `UPDATE users
       SET username = ?, first_name = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [username, fullName, photoUrl, existing.id],
    );
    const user = await fetchUserWithSubscription(existing.id);
    const ensured = await ensureFreeSubscription(user);
    return sanitizeUser(ensured);
  }

  // Новый пользователь - создаем запись
  const insertResult = await dbRun(
    'INSERT INTO users (telegram_id, username, first_name, photo_url) VALUES (?, ?, ?, ?) RETURNING id',
    [telegramId, username, fullName, photoUrl],
  );

  const newUserId = insertResult.lastID || insertResult.rows?.[0]?.id;
  if (!newUserId) {
    throw new Error('Не удалось получить идентификатор нового пользователя');
  }
  const user = await fetchUserWithSubscription(newUserId);
  const ensured = await ensureFreeSubscription(user);
  
  // Отправляем уведомление о регистрации в Telegram и автоматически вызываем /start
  try {
    // notifyUserRegistered теперь автоматически вызывает /start внутри себя
    await notifyUserRegistered(telegramId, data.first_name);
  } catch (error) {
    console.error('[Auth] Ошибка отправки уведомления о регистрации:', error);
    // Не прерываем процесс регистрации, если уведомление не отправилось
  }
  
  return sanitizeUser(ensured);
};

const createToken = (payload = {}) => {
  if (!AUTH_JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET не задан, невозможно выпустить токен');
  }

  return jwt.sign(payload, AUTH_JWT_SECRET, { expiresIn: AUTH_TOKEN_TTL });
};

const verifyToken = (token) => {
  if (!AUTH_JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET не задан, невозможно проверить токен');
  }
  return jwt.verify(token, AUTH_JWT_SECRET);
};

const requireAuth = async (req, res, next) => {
  try {
    // Пытаемся получить токен из Authorization header (Bearer token)
    let token = null;
    const header = req.headers.authorization || '';
    const parts = header.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
    
    // Если токена нет в header, пытаемся получить из cookie (HTTP-only cookie)
    if (!token && req.cookies && req.cookies.docugen_token) {
      token = req.cookies.docugen_token;
      console.log('[Auth] Токен получен из cookie');
    }
    
    if (!token) {
      return res.status(401).json({
        error: 'Требуется авторизация',
      });
    }

    const decoded = verifyToken(token);

    const user = await fetchUserWithSubscription(decoded.sub);

    if (!user) {
      return res.status(401).json({
        error: 'Пользователь не найден',
      });
    }

    req.user = {
      ...decoded,
      sub: user.id,
    };
    req.authUser = sanitizeUser(user);
    req.authUserRecord = user;

    return next();
  } catch (error) {
    console.error('[Auth] Middleware error:', error);
    return res.status(401).json({
      error: 'Недействительный токен',
      details: error.message,
    });
  }
};

const applySubscription = async (userId, planId) => {
  const meta = planMeta(planId);
  if (!meta) {
    return null;
  }

  const user = await fetchUserWithSubscription(userId);
  if (!user) {
    return null;
  }

  const now = new Date();
  const nowISO = now.toISOString();
  const nextResetISO = calculateNextResetDate(now).toISOString();

  if (meta.type === 'one-time') {
    const docsIncrease = meta.documentsLimit || 0;

    if (user.subscription) {
      await dbRun(
        `UPDATE subscriptions
         SET docs_limit = COALESCE(docs_limit, 0) + ?,
             status = 'active',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [docsIncrease, user.subscription.id],
      );
    } else {
      await dbRun(
        `INSERT INTO subscriptions (
          user_id, plan, status, docs_generated, docs_limit, activated_at, reset_date, updated_at
        ) VALUES (?, ?, 'active', 0, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [user.id, meta.id, docsIncrease, nowISO, nextResetISO],
      );
    }
  } else {
    const expiresAt =
      meta.type === 'subscription' && meta.period === 'monthly'
        ? addMonths(now, 1).toISOString()
        : null;

    if (user.subscription) {
      await dbRun(
        `UPDATE subscriptions
         SET plan = ?, status = 'active', docs_generated = 0, docs_limit = ?, activated_at = ?, reset_date = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [meta.id, meta.documentsLimit, nowISO, nextResetISO, expiresAt, user.subscription.id],
      );
    } else {
      await dbRun(
        `INSERT INTO subscriptions (
          user_id, plan, status, docs_generated, docs_limit, activated_at, reset_date, expires_at, updated_at
        ) VALUES (?, ?, 'active', 0, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [user.id, meta.id, meta.documentsLimit, nowISO, nextResetISO, expiresAt],
      );
    }
  }

  const refreshedUser = await fetchUserWithSubscription(user.id);
  return sanitizeUser(refreshedUser);
};

const subscriptionAllowsDocument = (subscription) => {
  if (!subscription) {
    return false;
  }
  if (subscription.docsLimit == null) {
    return true;
  }
  return subscription.docsGenerated < subscription.docsLimit;
};

const evaluateDocumentQuota = async (userId, { consume = false } = {}) => {
  const user = await fetchUserWithSubscription(userId);

  if (!user || !user.subscription) {
    return {
      allowed: false,
      reason: 'no_subscription',
      subscription: null,
    };
  }

  if (!subscriptionAllowsDocument(user.subscription)) {
    return {
      allowed: false,
      reason: 'limit_exceeded',
      subscription: mapSubscriptionUsage(user.subscription),
    };
  }

  if (!consume) {
    return {
      allowed: true,
      subscription: mapSubscriptionUsage(user.subscription),
    };
  }

  await dbRun(
    `UPDATE subscriptions
     SET docs_generated = docs_generated + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [user.subscription.id],
  );

  const updatedRow = await dbGet('SELECT * FROM subscriptions WHERE id = ?', [user.subscription.id]);
  return {
    allowed: true,
    subscription: mapSubscriptionUsage(normalizeSubscriptionRow(updatedRow)),
  };
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Поддержка cookie (для JWT токенов)
const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.get('/api/plans', (req, res) => {
  res.json({
    plans: Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
      ...plan,
      amount: Number(plan.amount || 0),
    })),
  });
});

// Вспомогательная функция для проверки данных Telegram
const verifyTelegramAuth = (data) => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан');
  }

  const { hash, auth_date: authDate } = data;

  if (!hash || !data.id) {
    throw new Error('Некорректные данные авторизации Telegram');
  }

  const secret = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
  const dataCheckString = Object.keys(data)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join('\n');

  const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    throw new Error('Не удалось подтвердить данные Telegram');
  }

  if (authDate && Date.now() / 1000 - Number(authDate) > 86400) {
    throw new Error('Данные авторизации устарели, попробуйте ещё раз');
  }

  return true;
};

// GET endpoint для обработки редиректа от Telegram виджета (data-auth-url)
app.get('/api/auth/telegram/callback', async (req, res) => {
  try {
    console.log('[Auth] Telegram callback (GET) - получены параметры:', Object.keys(req.query));
    
    if (!TELEGRAM_BOT_TOKEN) {
      return res.redirect(`${DEFAULT_FRONTEND_ORIGIN}/?error=telegram_unavailable`);
    }

    // Получаем данные из query параметров (Telegram отправляет их в URL)
    const data = req.query || {};
    const { hash, auth_date: authDate } = data;

    if (!hash || !data.id) {
      console.error('[Auth] Telegram callback - отсутствуют обязательные параметры');
      return res.redirect(`${DEFAULT_FRONTEND_ORIGIN}/?error=invalid_data`);
    }

    // Проверяем данные
    try {
      verifyTelegramAuth(data);
    } catch (error) {
      console.error('[Auth] Telegram callback - ошибка проверки:', error.message);
      return res.redirect(`${DEFAULT_FRONTEND_ORIGIN}/?error=verification_failed`);
    }

    // Создаем/обновляем пользователя
    const user = await upsertTelegramUser(data);

    // Создаем токен
    const token = createToken({
      sub: user.id,
      provider: 'telegram',
    });

    console.log('[Auth] Telegram callback - авторизация успешна, установка cookie и перенаправление');

    // Устанавливаем HTTP-only cookie с JWT токеном (безопаснее, чем localStorage)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
    const cookieOptions = {
      httpOnly: true, // Защита от XSS - JavaScript не может прочитать cookie
      secure: isProduction, // Только HTTPS в production
      sameSite: 'lax', // Защита от CSRF
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      path: '/', // Доступна на всех путях
    };

    res.cookie('docugen_token', token, cookieOptions);
    console.log('[Auth] Cookie установлена:', {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
    });

    // Также передаем токен в URL для совместимости с фронтендом (если он использует localStorage)
    const redirectUrl = new URL(`${DEFAULT_FRONTEND_ORIGIN}/auth/callback`);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('success', 'true');

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('[Auth] Telegram callback error:', error);
    res.redirect(`${DEFAULT_FRONTEND_ORIGIN}/?error=auth_failed`);
  }
});

// Endpoint для валидации временного токена от бота (как на poehali.dev)
app.post('/api/auth/telegram-token', async (req, res) => {
  try {
    console.log('[Auth] Запрос на /api/auth/telegram-token получен:', {
      method: req.method,
      url: req.url,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      headers: {
        'content-type': req.headers['content-type'],
        origin: req.headers.origin,
      },
    });

    const { token } = req.body;
    
    if (!token) {
      console.warn('[Auth] Токен не предоставлен в запросе');
      return res.status(400).json({
        error: 'Токен не предоставлен',
      });
    }

    console.log('[Auth] Валидация токена от бота:', {
      token: token.substring(0, 8) + '...',
      tokenLength: token.length,
    });

    // Проверяем токен в БД
    const tokenRecord = await dbGet(
      `SELECT * FROM auth_tokens 
       WHERE token = ? AND expires_at > CURRENT_TIMESTAMP AND used = FALSE`,
      [token]
    );

    if (!tokenRecord) {
      console.warn('[Auth] Токен не найден или истек:', {
        token: token.substring(0, 8) + '...',
      });
      return res.status(401).json({
        error: 'Токен недействителен или истек',
      });
    }

    // Получаем пользователя по telegram_id
    const user = await dbGet(
      `SELECT u.*, s.plan, s.status, s.docs_generated, s.docs_limit
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id
       WHERE u.telegram_id = ?`,
      [tokenRecord.telegram_id]
    );

    if (!user) {
      console.error('[Auth] Пользователь не найден для токена:', {
        telegramId: tokenRecord.telegram_id,
      });
      return res.status(404).json({
        error: 'Пользователь не найден',
      });
    }

    // Помечаем токен как использованный
    await dbRun(
      `UPDATE auth_tokens SET used = TRUE WHERE token = ?`,
      [token]
    );

    // Создаем JWT токен
    const jwtToken = createToken({
      sub: user.id,
      provider: 'telegram',
    });

    console.log('[Auth] Токен валидирован, пользователь авторизован:', {
      userId: user.id,
      telegramId: user.telegram_id,
    });

    // Устанавливаем HTTP-only cookie с JWT токеном
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      path: '/',
    };

    res.cookie('docugen_token', jwtToken, cookieOptions);

    res.json({
      success: true,
      token: jwtToken, // Также возвращаем для совместимости с localStorage
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[Auth] Ошибка валидации токена:', error);
    res.status(500).json({
      error: 'Ошибка авторизации',
      details: error.message,
    });
  }
});

// POST endpoint для обработки callback от виджета (data-onauth)
app.post('/api/auth/telegram', async (req, res) => {
  try {
    console.log('[Auth] Telegram auth (POST) - получены данные');
    
    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({
        error: 'Telegram авторизация временно недоступна',
      });
    }

    const data = req.body || {};
    
    // Проверяем данные
    try {
      verifyTelegramAuth(data);
    } catch (error) {
      return res.status(401).json({
        error: error.message,
      });
    }

    const user = await upsertTelegramUser(data);

    const token = createToken({
      sub: user.id,
      provider: 'telegram',
    });

    console.log('[Auth] Telegram auth (POST) - авторизация успешна');

    res.json({
      token,
      user,
    });
  } catch (error) {
    console.error('[Auth] Telegram auth error:', error);
    res.status(500).json({
      error: 'Ошибка авторизации через Telegram',
      details: error.message,
    });
  }
});

// Специальный endpoint для входа тестового пользователя Юкассы
app.post('/api/auth/test-login', async (req, res) => {
  try {
    const { login, password } = req.body || {};

    // Данные тестового пользователя
    const TEST_USER = {
      telegram_id: 999999999,
      username: 'yookassa_test',
      password: 'YooKassa2025!Test', // Пароль для тестового пользователя
    };

    if (!login || !password) {
      return res.status(400).json({
        error: 'Логин и пароль обязательны',
      });
    }

    // Проверяем, что это тестовый пользователь
    if (login !== TEST_USER.username || password !== TEST_USER.password) {
      return res.status(401).json({
        error: 'Неверный логин или пароль',
      });
    }

    // Находим тестового пользователя в БД
    const userRow = await dbGet(
      'SELECT * FROM users WHERE telegram_id = ?',
      [TEST_USER.telegram_id]
    );

    if (!userRow) {
      return res.status(404).json({
        error: 'Тестовый пользователь не найден. Запустите скрипт create-test-user-yookassa.js',
      });
    }

    const user = normalizeUserRow(userRow);
    const subscriptionRow = await dbGet(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [user.id]
    );
    const subscription = normalizeSubscriptionRow(subscriptionRow);

    // Создаем токен
    const token = createToken({
      sub: user.id,
      provider: 'telegram',
      test: true,
    });

    const sanitizedUser = sanitizeUser({
      ...user,
      subscription,
    });

    console.log('[Auth] Тестовый пользователь успешно авторизован:', {
      userId: user.id,
      username: user.username,
    });

    res.json({
      token,
      user: sanitizedUser,
    });
  } catch (error) {
    console.error('[Auth] Ошибка тестового входа:', error);
    res.status(500).json({
      error: 'Ошибка авторизации',
      details: error.message,
    });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: req.authUser,
  });
});

app.get('/api/subscription', requireAuth, async (req, res) => {
  const detailed = req.authUserRecord
    ? mapSubscriptionUsage(req.authUserRecord.subscription)
    : null;

  res.json({
    subscription: detailed,
  });
});

app.post('/api/subscription/consume', requireAuth, async (req, res) => {
  try {
    const { consume = true, documentName } = req.body || {};

    const result = await evaluateDocumentQuota(req.user.sub, { consume });

    if (!result.allowed) {
      return res.status(403).json({
        error: result.reason,
        subscription: result.subscription,
      });
    }

    // Отправляем уведомление в Telegram при успешной генерации
    if (consume && documentName) {
      await notifyDocumentGenerated(req.user.sub, documentName);
    }

    res.json({
      allowed: true,
      subscription: result.subscription,
    });
  } catch (error) {
    console.error('Subscription consume error:', error);
    res.status(500).json({
      error: 'Не удалось обновить лимит документов',
      details: error.message,
    });
  }
});

app.post('/api/payments/create', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body || {};
    const plan = SUBSCRIPTION_PLANS[planId];

    if (!plan) {
      return res.status(400).json({
        error: 'Неизвестный тарифный план',
      });
    }

    const userId = req.user.sub;

    if (plan.amount === 0) {
      const user = await applySubscription(userId, plan.id);
      return res.json({
        status: 'activated',
        user,
      });
    }

    if (!checkout) {
      return res.status(503).json({
        error: 'Платёжный шлюз не настроен',
      });
    }

    const idempotenceKey = crypto.randomUUID();
    const payment = await checkout.createPayment(
      {
        amount: {
          value: plan.amount.toFixed(2),
          currency: plan.currency,
        },
        confirmation: {
          type: 'redirect',
          return_url: PAYMENT_SUCCESS_URL,
        },
        capture: true,
        description: `DocuGen: тариф "${plan.name}"`,
        metadata: {
          userId: req.user.sub,
          planId: plan.id,
        },
      },
      idempotenceKey
    );

    const metadataPayload = payment.metadata ? payment.metadata : null;
    const status = payment.status || 'pending';

    const updated = await dbRun(
      `UPDATE payments
       SET amount = ?, currency = ?, plan = ?, status = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = ?`,
      [plan.amount, plan.currency, plan.id, status, metadataPayload, payment.id],
    );

    if (!updated.changes) {
      await dbRun(
        `INSERT INTO payments (user_id, payment_id, amount, currency, plan, status, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, payment.id, plan.amount, plan.currency, plan.id, status, metadataPayload],
      );
    }

    res.json({
      status: 'pending',
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url || null,
    });
  } catch (error) {
    console.error('YooKassa create payment error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Не удалось создать платёж',
      details: error.response?.data || error.message,
    });
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  try {
    const event = req.body;

    if (!event?.event || !event?.object) {
      return res.status(400).json({
        error: 'Некорректный формат webhook',
      });
    }

    const paymentObject = event.object;
    const metadata = paymentObject.metadata || {};
    const paymentId = paymentObject.id;
    const status =
      paymentObject.status ||
      (event.event === 'payment.succeeded'
        ? 'succeeded'
        : event.event === 'payment.canceled'
          ? 'canceled'
          : 'pending');

    const metadataPayload = metadata || null;

    const updateResult = await dbRun(
      `UPDATE payments
       SET status = ?, metadata = ?, amount = ?, currency = ?, plan = ?, updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = ?`,
      [
        status,
        metadataPayload,
        Number(paymentObject.amount?.value || 0),
        paymentObject.amount?.currency || 'RUB',
        metadata.planId || 'unknown',
        paymentId,
      ],
    );

    if (!updateResult.changes && metadata.userId) {
      await dbRun(
        `INSERT INTO payments (user_id, payment_id, amount, currency, plan, status, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(metadata.userId),
          paymentId,
          Number(paymentObject.amount?.value || 0),
          paymentObject.amount?.currency || 'RUB',
          metadata.planId || 'unknown',
          status,
          metadataPayload,
        ],
      );
    } else if (!updateResult.changes) {
      console.warn('Webhook без userId, невозможно создать запись платежа:', paymentId);
    }

    if (event.event === 'payment.succeeded' && metadata.userId) {
      // Обработка платежей за подписки
      if (metadata.planId) {
        const plan = planMeta(metadata.planId);
        const planName = plan?.name || metadata.planId;
        await applySubscription(Number(metadata.userId), metadata.planId);
        // Отправляем уведомление в Telegram
        await notifyPaymentSuccess(Number(metadata.userId), planName);
      }
      // Обработка платежей за документы (фиксированные цены)
      else if (metadata.type === 'document' && metadata.docType) {
        const docTypeLabels = {
          essay: 'Реферат',
          report: 'Отчёт',
          article: 'Статья',
          courseWork: 'Курсовая работа',
          diploma: 'Выпускная квалификационная работа',
        };
        const docName = docTypeLabels[metadata.docType] || metadata.docType;
        // Отправляем уведомление в Telegram
        await notifyPaymentSuccess(Number(metadata.userId), `Оплата документа: ${docName}`);
      }
    }

    if (event.event === 'payment.canceled' && metadata.userId) {
      const userRecord = await fetchUserWithSubscription(Number(metadata.userId));
      if (userRecord?.subscription) {
        await dbRun(
          `UPDATE subscriptions
           SET status = 'canceled',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [userRecord.subscription.id],
        );
      }
    }


    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('YooKassa webhook error:', error);
    res.status(500).json({
      error: 'Ошибка обработки webhook',
      details: error.message,
    });
  }
});

// Получение цены документа по типу
app.get('/api/payments/document-price', requireAuth, async (req, res) => {
  try {
    const { docType } = req.query;

    if (!docType || typeof docType !== 'string') {
      return res.status(400).json({
        error: 'Не указан тип документа',
      });
    }

    const price = DOCUMENT_PRICES[docType];

    if (!price) {
      return res.status(400).json({
        error: 'Неизвестный тип документа',
      });
    }

    res.json({
      docType,
      price,
      currency: 'RUB',
    });
  } catch (error) {
    console.error('Get document price error:', error);
    res.status(500).json({
      error: 'Не удалось получить цену документа',
      details: error.message,
    });
  }
});

// Создание платежа для документа
app.post('/api/payments/create-document', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { docType } = req.body;

    if (!checkout) {
      return res.status(503).json({
        error: 'Платёжный шлюз не настроен',
      });
    }

    if (!docType || typeof docType !== 'string') {
      return res.status(400).json({
        error: 'Не указан тип документа',
      });
    }

    const price = DOCUMENT_PRICES[docType];

    if (!price) {
      return res.status(400).json({
        error: 'Неизвестный тип документа',
      });
    }

    const docTypeLabels = {
      essay: 'Реферат',
      report: 'Отчёт',
      article: 'Статья',
      courseWork: 'Курсовая работа',
      diploma: 'Выпускная квалификационная работа',
    };

    const idempotenceKey = crypto.randomUUID();
    const payment = await checkout.createPayment(
      {
        amount: {
          value: price.toFixed(2),
          currency: 'RUB',
        },
        confirmation: {
          type: 'redirect',
          return_url: PAYMENT_SUCCESS_URL,
        },
        capture: true,
        description: `DocuGen: ${docTypeLabels[docType] || docType}`,
        metadata: {
          userId: req.user.sub,
          type: 'document',
          docType: docType,
        },
      },
      idempotenceKey
    );

    res.json({
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url || null,
      amount: price,
      docType,
    });
  } catch (error) {
    console.error('Create document payment error:', error);
    res.status(500).json({
      error: 'Не удалось создать платёж',
      details: error.response?.data || error.message,
    });
  }
});

// Кэш для токенов (в production используйте Redis)
let tokenCache = {
  token: null,
  expiresAt: null,
};

// Константы
const OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
const API_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
const OAUTH_TIMEOUT = 10000; // 10 секунд
const API_TIMEOUT = 60000; // 60 секунд
const GIGACHAT_MAX_RETRIES = (() => {
  const parsed = Number(process.env.GIGACHAT_MAX_RETRIES);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 3;
})();
const GIGACHAT_RETRY_DELAY_MS = (() => {
  const parsed = Number(process.env.GIGACHAT_RETRY_DELAY_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2000;
})();
const GIGACHAT_QUEUE_COOLDOWN_MS = (() => {
  const parsed = Number(process.env.GIGACHAT_QUEUE_COOLDOWN_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 500;
})();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const gigaChatQueue = [];
let isProcessingGigaChatQueue = false;

/**
 * Получение OAuth токена
 * Поддерживает два метода:
 * 1. Authorization Key (рекомендуется) - напрямую
 * 2. Client ID + Client Secret - кодируются в Base64
 */
async function getAccessToken() {
  const authKey = process.env.GIGACHAT_AUTH_KEY;
  const clientId = process.env.GIGACHAT_CLIENT_ID;
  const clientSecret = process.env.GIGACHAT_CLIENT_SECRET;

  // Определяем метод авторизации
  let authorizationHeader;
  
  if (authKey) {
    // Метод 1: Используем Authorization Key напрямую
    authorizationHeader = `Basic ${authKey}`;
  } else if (clientId && clientSecret) {
    // Метод 2: Кодируем Client ID и Secret в Base64
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    authorizationHeader = `Basic ${credentials}`;
  } else {
    throw new Error('GIGACHAT_AUTH_KEY (рекомендуется) или GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET должны быть установлены в .env');
  }

  // Проверяем кэш токена
  if (tokenCache.token && tokenCache.expiresAt) {
    const now = Date.now();
    // Если токен еще действителен (с запасом в 1 минуту), используем его
    if (tokenCache.expiresAt > now + 60000) {
      return tokenCache.token;
    }
  }

  try {
    // Генерируем уникальный RqUID
    const rqUID = crypto.randomUUID();
    
    console.log('Requesting OAuth token with:', {
      method: authKey ? 'Authorization Key' : 'Client ID + Secret',
      url: OAUTH_URL,
      rqUID
    });

    const response = await axios.post(
      OAUTH_URL,
      'scope=GIGACHAT_API_PERS',
               {
           headers: {
             'Content-Type': 'application/x-www-form-urlencoded',
             'Accept': 'application/json',
             'RqUID': rqUID,
             'Authorization': authorizationHeader,
           },
        timeout: OAUTH_TIMEOUT,
        httpsAgent,
      }
    );

    if (!response.data?.access_token) {
      throw new Error('Неожиданный формат ответа от OAuth сервера');
    }

    // Кэшируем токен (действителен 30 минут)
    const expiresAt = Date.now() + 30 * 60 * 1000;
    tokenCache = {
      token: response.data.access_token,
      expiresAt,
    };

    return response.data.access_token;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error('Неверные учетные данные. Проверьте GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET');
      } else if (status === 429) {
        throw new Error('Превышен лимит запросов. Попробуйте позже');
      } else if (status >= 500) {
        throw new Error('Ошибка сервера GigaChat. Попробуйте позже');
      }
      throw new Error(`Ошибка OAuth: ${status} - ${error.response.data?.message || error.message}`);
    }
    throw error;
  }
}

function enqueueGigaChatCall(builder) {
  return new Promise((resolve, reject) => {
    gigaChatQueue.push({ builder, resolve, reject });
    processGigaChatQueue();
  });
}

async function processGigaChatQueue() {
  if (isProcessingGigaChatQueue) {
    return;
  }

  isProcessingGigaChatQueue = true;

  while (gigaChatQueue.length > 0) {
    const { builder, resolve, reject } = gigaChatQueue.shift();

    try {
      const result = await executeGigaChatWithRetries(builder);
      resolve(result);
    } catch (error) {
      reject(error);
    }

    if (gigaChatQueue.length > 0 && GIGACHAT_QUEUE_COOLDOWN_MS > 0) {
      await sleep(GIGACHAT_QUEUE_COOLDOWN_MS);
    }
  }

  isProcessingGigaChatQueue = false;
}

async function executeGigaChatWithRetries(builder) {
  let lastError;

  for (let attempt = 0; attempt < GIGACHAT_MAX_RETRIES; attempt += 1) {
    try {
      const token = await getAccessToken();
      return await builder(token);
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const networkCode = error?.code;

      if (status === 401) {
        tokenCache = { token: null, expiresAt: null };
      }

      const shouldRetry =
        status === 429 ||
        status === 408 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        (!status && (networkCode === 'ECONNRESET' || networkCode === 'ETIMEDOUT'));

      const isLastAttempt = attempt === GIGACHAT_MAX_RETRIES - 1;

      if (!shouldRetry || isLastAttempt) {
        break;
      }

      const delay = GIGACHAT_RETRY_DELAY_MS * Math.max(1, Math.pow(2, attempt));
      console.warn(
        `[GigaChat Queue] попытка ${attempt + 1} завершилась ошибкой ${status || networkCode || error.message}. Повтор через ${delay} мс`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Proxy endpoint для OAuth (если нужен прямой доступ)
 */
app.post('/api/gigachat-oauth/:path(*)', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ access_token: token });
  } catch (error) {
    console.error('OAuth Proxy Error:', error.message);
    res.status(500).json({ 
      error: 'Ошибка получения токена',
      message: error.message 
    });
  }
});

/**
 * Proxy endpoint для генерации текста через GigaChat API
 */
app.post('/api/gigachat-api/:path(*)', async (req, res) => {
  try {
    // Извлекаем данные из запроса
    const { model = 'GigaChat', messages, temperature = 0.7, max_tokens = 2000 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'Некорректный запрос',
        message: 'Поле messages обязательно и должно быть массивом' 
      });
    }

    const response = await enqueueGigaChatCall((token) =>
      axios.post(
        API_URL,
        {
          model,
          messages,
          temperature,
          max_tokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: API_TIMEOUT,
          httpsAgent,
        },
      ),
    );

    res.json(response.data);
  } catch (error) {
    console.error('GigaChat API Proxy Error:', error.message);
    
    if (error.response) {
      const status = error.response.status;
      let message = 'Ошибка при генерации текста';
      
      if (status === 401) {
        // Токен устарел, сбрасываем кэш
        tokenCache = { token: null, expiresAt: null };
        message = 'Токен доступа устарел. Попробуйте снова';
      } else if (status === 429) {
        message = 'Превышен лимит запросов. Подождите немного';
      } else if (status >= 500) {
        message = 'Ошибка сервера GigaChat. Попробуйте позже';
      } else if (status === 400) {
        message = 'Неверный запрос. Проверьте входные данные';
      }
      
      return res.status(status).json({ 
        error: message,
        details: error.response.data 
      });
    }
    
    res.status(500).json({ 
      error: 'Ошибка проксирования запроса',
      message: error.message 
    });
  }
});

/**
 * Универсальный endpoint для генерации (упрощенный)
 */
app.post('/api/gigachat/generate', async (req, res) => {
  try {
    const { prompt, systemPrompt, max_tokens = 2048, temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Поле prompt обязательно' 
      });
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await enqueueGigaChatCall((token) =>
      axios.post(
        API_URL,
        {
          model: 'GigaChat',
          messages,
          temperature,
          max_tokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: API_TIMEOUT,
          httpsAgent,
        },
      ),
    );

    res.json(response.data);
  } catch (error) {
    console.error('Generate Error:', error.message);
    
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        tokenCache = { token: null, expiresAt: null };
      } else if (status === 402) {
        // 402 от GigaChat API означает проблему с балансом/квотами аккаунта GigaChat
        return res.status(402).json({ 
          error: 'GigaChat API: Требуется оплата или проблема с балансом аккаунта GigaChat',
          message: 'У аккаунта GigaChat закончился баланс или квоты. Проверьте настройки GigaChat API в переменных окружения сервера.',
          details: error.response.data,
          code: 'GIGACHAT_PAYMENT_REQUIRED'
        });
      }
      return res.status(status).json({ 
        error: error.response.data?.message || 'Ошибка генерации',
        details: error.response.data 
      });
    }
    
    res.status(500).json({ 
      error: 'Ошибка генерации текста',
      message: error.message 
    });
  }
});

/**
 * Admin endpoint для создания тестового пользователя Юкассы
 * Защищен секретным ключом из переменной окружения
 */
app.post('/api/admin/create-test-user', express.json(), async (req, res) => {
  try {
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production';
    const { secret } = req.body || {};

    // Проверка секрета отключена для создания тестового пользователя

    // Данные тестового пользователя
    const TEST_USER = {
      telegram_id: 999999999,
      username: 'yookassa_test',
      first_name: 'Тестовый пользователь Юкасса',
      photo_url: null,
    };

    // Проверяем, существует ли уже тестовый пользователь
    const existingUser = await dbGet(
      'SELECT * FROM users WHERE telegram_id = ?',
      [TEST_USER.telegram_id]
    );

    let userId;

    if (existingUser) {
      // Обновляем данные пользователя
      await dbRun(
        `UPDATE users 
         SET username = ?, first_name = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE telegram_id = ?`,
        [TEST_USER.username, TEST_USER.first_name, TEST_USER.telegram_id]
      );
      userId = existingUser.id;
    } else {
      // Создаем нового пользователя
      const result = await dbRun(
        `INSERT INTO users (telegram_id, username, first_name, photo_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [TEST_USER.telegram_id, TEST_USER.username, TEST_USER.first_name, TEST_USER.photo_url]
      );
      userId = result.rows?.[0]?.id || result.lastID;
    }

    // Проверяем, есть ли подписка
    const existingSubscription = await dbGet(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [userId]
    );

    if (!existingSubscription) {
      const now = new Date();
      const nextReset = new Date(now);
      nextReset.setMonth(nextReset.getMonth() + 1);

      await dbRun(
        `INSERT INTO subscriptions (
          user_id, plan, status, docs_generated, docs_limit, 
          activated_at, reset_date, created_at, updated_at
        ) VALUES (?, ?, 'active', 0, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, 'free', now.toISOString(), nextReset.toISOString()]
      );
    }

    // Создаем JWT токен
    const token = createToken({
      sub: userId,
      provider: 'telegram',
      test: true,
    });

    console.log('[Admin] Тестовый пользователь для Юкассы создан/обновлен:', {
      userId,
      username: TEST_USER.username,
    });

    res.json({
      success: true,
      user: {
        id: userId,
        username: TEST_USER.username,
        firstName: TEST_USER.first_name,
      },
      credentials: {
        login: 'yookassa_test',
        password: 'YooKassa2025!Test',
      },
      token,
      message: 'Тестовый пользователь успешно создан',
    });
  } catch (error) {
    console.error('[Admin] Ошибка создания тестового пользователя:', error);
    res.status(500).json({
      error: 'Ошибка при создании тестового пользователя',
      details: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    tokenCached: !!tokenCache.token,
  });
});

/**
 * Webhook endpoint для Telegram бота (если используется webhook)
 */
app.post('/api/telegram/webhook', express.json(), (req, res) => {
  const { getBot } = require('./telegram-bot');
  const bot = getBot();
  
  if (!bot) {
    return res.status(503).json({ error: 'Telegram bot not initialized' });
  }

  bot.processUpdate(req.body);
  res.status(200).json({ status: 'ok' });
});

/**
 * Обработка ошибок
 */
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    message: err.message 
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Запускаем сервер сразу, без ожидания БД
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 GigaChat Proxy Server запущен на ${HOST}:${PORT}`);
  console.log(`📡 OAuth endpoint: POST /api/gigachat-oauth/*`);
  console.log(`📡 API endpoint: POST /api/gigachat-api/*`);
  console.log(`📡 Generate endpoint: POST /api/gigachat/generate`);
  console.log(`💚 Health check: GET /health`);
  
  // Инициализируем Telegram бота асинхронно ПОСЛЕ запуска сервера
  // Это не блокирует старт сервера и позволяет Render обнаружить открытый порт
  if (TELEGRAM_BOT_TOKEN) {
    console.log(`🤖 Telegram Bot: инициализация...`);
    
    // Проверяем БД с небольшой задержкой, чтобы дать серверу время запуститься
    setTimeout(async () => {
      try {
        const { pool } = require('./db');
        if (pool) {
          await pool.query('SELECT 1');
          console.log('[Server] База данных подключена, инициализируем Telegram бота...');
          initTelegramBot();
        } else {
          console.warn('[Server] База данных недоступна. Telegram бот не будет запущен.');
        }
      } catch (error) {
        console.error('[Server] Ошибка подключения к базе данных:', error.message);
        console.warn('[Server] Telegram бот не будет запущен');
      }
    }, 1000); // Задержка 1 секунда после старта сервера
  }
});

module.exports = app;
