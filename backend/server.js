require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const jwt = require('jsonwebtoken');
const { YooCheckout } = require('@a2seven/yoo-checkout');
const { run: dbRun, get: dbGet } = require('./db');

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

const PAYMENT_SUCCESS_URL = PAYMENT_RETURN_URL || `${DEFAULT_FRONTEND_ORIGIN}/payment/success`;
const PAYMENT_FAIL_URL = process.env.PAYMENT_FAIL_URL || `${DEFAULT_FRONTEND_ORIGIN}/payment/failed`;

const AUTH_TOKEN_TTL = process.env.AUTH_TOKEN_TTL || '7d';

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

  const insertResult = await dbRun(
    'INSERT INTO users (telegram_id, username, first_name, photo_url) VALUES (?, ?, ?, ?)',
    [telegramId, username, fullName, photoUrl],
  );

  const user = await fetchUserWithSubscription(insertResult.lastID);
  const ensured = await ensureFreeSubscription(user);
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
    const header = req.headers.authorization || '';
    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Требуется авторизация',
      });
    }

    const token = parts[1];
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

app.get('/api/plans', (req, res) => {
  res.json({
    plans: Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
      ...plan,
      amount: Number(plan.amount || 0),
    })),
  });
});

app.post('/api/auth/telegram', async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({
        error: 'Telegram авторизация временно недоступна',
      });
    }

    const data = req.body || {};
    const { hash, auth_date: authDate } = data;

    if (!hash || !data.id) {
      return res.status(400).json({
        error: 'Некорректные данные авторизации Telegram',
      });
    }

    const secret = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
    const dataCheckString = Object.keys(data)
      .filter((key) => key !== 'hash')
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n');

    const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (computedHash !== hash) {
      return res.status(401).json({
        error: 'Не удалось подтвердить данные Telegram',
      });
    }

    if (authDate && Date.now() / 1000 - Number(authDate) > 86400) {
      return res.status(401).json({
        error: 'Данные авторизации устарели, попробуйте ещё раз',
      });
    }

    const user = await upsertTelegramUser(data);

    const token = createToken({
      sub: user.id,
      provider: 'telegram',
    });

    res.json({
      token,
      user,
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({
      error: 'Ошибка авторизации через Telegram',
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
    const { consume = true } = req.body || {};

    const result = await evaluateDocumentQuota(req.user.sub, { consume });

    if (!result.allowed) {
      return res.status(403).json({
        error: result.reason,
        subscription: result.subscription,
      });
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

    const metadataJson = payment.metadata ? JSON.stringify(payment.metadata) : null;
    const status = payment.status || 'pending';

    const updated = await dbRun(
      `UPDATE payments
       SET amount = ?, currency = ?, plan = ?, status = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = ?`,
      [plan.amount, plan.currency, plan.id, status, metadataJson, payment.id],
    );

    if (!updated.changes) {
      await dbRun(
        `INSERT INTO payments (user_id, payment_id, amount, currency, plan, status, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, payment.id, plan.amount, plan.currency, plan.id, status, metadataJson],
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

    const metadataJson = JSON.stringify(metadata || null);

    const updateResult = await dbRun(
      `UPDATE payments
       SET status = ?, metadata = ?, amount = ?, currency = ?, plan = ?, updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = ?`,
      [
        status,
        metadataJson,
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
          metadataJson,
        ],
      );
    } else if (!updateResult.changes) {
      console.warn('Webhook без userId, невозможно создать запись платежа:', paymentId);
    }

    if (event.event === 'payment.succeeded' && metadata.userId && metadata.planId) {
      await applySubscription(Number(metadata.userId), metadata.planId);
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
    const token = await getAccessToken();
    
    // Извлекаем данные из запроса
    const { model = 'GigaChat', messages, temperature = 0.7, max_tokens = 2000 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'Некорректный запрос',
        message: 'Поле messages обязательно и должно быть массивом' 
      });
    }

    const response = await axios.post(
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
          'Authorization': `Bearer ${token}`,
        },
        timeout: API_TIMEOUT,
        httpsAgent,
      }
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
    const token = await getAccessToken();
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

    const response = await axios.post(
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
          'Authorization': `Bearer ${token}`,
        },
        timeout: API_TIMEOUT,
        httpsAgent,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Generate Error:', error.message);
    
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        tokenCache = { token: null, expiresAt: null };
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

app.listen(PORT, HOST, () => {
  console.log(`🚀 GigaChat Proxy Server запущен на ${HOST}:${PORT}`);
  console.log(`📡 OAuth endpoint: POST /api/gigachat-oauth/*`);
  console.log(`📡 API endpoint: POST /api/gigachat-api/*`);
  console.log(`📡 Generate endpoint: POST /api/gigachat/generate`);
  console.log(`💚 Health check: GET /health`);
});

module.exports = app;
