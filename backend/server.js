require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
