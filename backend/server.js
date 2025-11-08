require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { YooCheckout } = require('@a2seven/yoo-checkout');

const app = express();

const {
  AUTH_JWT_SECRET,
  TELEGRAM_BOT_TOKEN,
  GOOGLE_CLIENT_ID,
  YOOKASSA_SHOP_ID,
  YOOKASSA_SECRET_KEY,
  PAYMENT_RETURN_URL,
  FRONTEND_URL,
  ALLOWED_ORIGINS,
} = process.env;

if (!AUTH_JWT_SECRET) {
  console.warn('[Auth] Переменная окружения AUTH_JWT_SECRET не задана. JWT токены будут недоступны.');
}

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('[Auth] TELEGRAM_BOT_TOKEN не задан. Telegram авторизация не будет работать.');
}

if (!GOOGLE_CLIENT_ID) {
  console.warn('[Auth] GOOGLE_CLIENT_ID не задан. Google авторизация не будет работать.');
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
  ? ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : [DEFAULT_FRONTEND_ORIGIN];

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

const users = new Map();

const PAYMENT_SUCCESS_URL = PAYMENT_RETURN_URL || `${DEFAULT_FRONTEND_ORIGIN}/payment/success`;
const PAYMENT_FAIL_URL = process.env.PAYMENT_FAIL_URL || `${DEFAULT_FRONTEND_ORIGIN}/payment/failed`;

const AUTH_TOKEN_TTL = process.env.AUTH_TOKEN_TTL || '7d';

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const {
    id,
    name,
    email,
    avatarUrl,
    provider,
    username,
    telegram,
    subscription,
  } = user;

  return {
    id,
    name,
    email: email || null,
    avatarUrl: avatarUrl || null,
    provider,
    username: username || null,
    telegram: telegram
      ? {
          id: telegram.id,
          username: telegram.username,
        }
      : null,
    subscription: subscription || null,
  };
};

const upsertUser = (id, data) => {
  const existing = users.get(id) || {};
  const updated = {
    ...existing,
    id,
    ...data,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };
  users.set(id, updated);
  return updated;
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

const requireAuth = (req, res, next) => {
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
    const user = users.get(decoded.sub);

    if (!user) {
      return res.status(401).json({
        error: 'Пользователь не найден',
      });
    }

    req.user = decoded;
    req.authUser = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Недействительный токен',
      details: error.message,
    });
  }
};

const applySubscription = (userId, planId) => {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    return null;
  }

  const user = users.get(userId);
  if (!user) {
    return null;
  }

  const now = Date.now();
  let expiresAt = null;

  if (plan.type === 'subscription' && plan.period === 'monthly') {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    expiresAt = nextMonth.toISOString();
  }

  const subscription = {
    planId: plan.id,
    planName: plan.name,
    status: 'active',
    activatedAt: new Date(now).toISOString(),
    expiresAt,
    documentsLimit: plan.documentsLimit,
    type: plan.type,
  };

  const updated = upsertUser(userId, {
    subscription,
  });

  return sanitizeUser(updated);
};

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
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

app.post('/api/auth/telegram', (req, res) => {
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

    const userId = `telegram:${data.id}`;
    const name =
      [data.first_name, data.last_name].filter(Boolean).join(' ') ||
      data.username ||
      'Пользователь Telegram';

    const user = upsertUser(userId, {
      provider: 'telegram',
      name,
      username: data.username || null,
      avatarUrl: data.photo_url || null,
      telegram: {
        id: data.id,
        username: data.username || null,
      },
    });

    const token = createToken({
      sub: userId,
      provider: 'telegram',
    });

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({
      error: 'Ошибка авторизации через Telegram',
      details: error.message,
    });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        error: 'Google авторизация временно недоступна',
      });
    }

    const { credential } = req.body || {};

    if (!credential) {
      return res.status(400).json({
        error: 'Отсутствует credential из Google',
      });
    }

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);

    if (!response.ok) {
      return res.status(401).json({
        error: 'Недействительный токен Google',
      });
    }

    const payload = await response.json();

    if (payload.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({
        error: 'Токен выдан для другого приложения Google',
      });
    }

    const userId = `google:${payload.sub}`;
    const name = payload.name || payload.email || 'Google user';

    const user = upsertUser(userId, {
      provider: 'google',
      name,
      email: payload.email || null,
      avatarUrl: payload.picture || null,
      emailVerified:
        payload.email_verified === true ||
        payload.email_verified === 'true' ||
        payload.email_verified === 1,
    });

    const token = createToken({
      sub: userId,
      provider: 'google',
    });

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      error: 'Ошибка авторизации через Google',
      details: error.message,
    });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: sanitizeUser(req.authUser),
  });
});

app.get('/api/subscription', requireAuth, (req, res) => {
  res.json({
    subscription: req.authUser.subscription || null,
  });
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

    if (plan.amount === 0) {
      const user = applySubscription(req.user.sub, plan.id);
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

app.post('/api/payments/webhook', (req, res) => {
  try {
    const event = req.body;

    if (!event?.event || !event?.object) {
      return res.status(400).json({
        error: 'Некорректный формат webhook',
      });
    }

    if (event.event === 'payment.succeeded') {
      const metadata = event.object.metadata || {};
      if (metadata.userId && metadata.planId) {
        applySubscription(metadata.userId, metadata.planId);
      }
    }

    if (event.event === 'payment.canceled') {
      const metadata = event.object.metadata || {};
      const user = users.get(metadata.userId);
      if (user && user.subscription?.planId === metadata.planId) {
        upsertUser(metadata.userId, {
          subscription: {
            ...user.subscription,
            status: 'canceled',
          },
        });
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
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: true,
        }),
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
