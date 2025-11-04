/**
 * GigaChat API Integration
 * 
 * Для работы с API GigaChat необходимо:
 * 1. Зарегистрироваться на https://developers.sber.ru/gigachat
 * 2. Получить Client ID и Client Secret
 * 3. Добавить их в .env файл:
 *    VITE_GIGACHAT_CLIENT_ID=your_client_id
 *    VITE_GIGACHAT_CLIENT_SECRET=your_client_secret
 * 
 * Система автоматически получает токен доступа при первом запросе
 */

interface GigaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GigaChatRequest {
  model: string;
  messages: GigaChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface GigaChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface TokenResponse {
  access_token: string;
  expires_at: string;
}

// Кэш для токена
let cachedToken: TokenResponse | null = null;

// Таймауты (в миллисекундах)
const OAUTH_TIMEOUT = 10000; // 10 секунд для OAuth
const API_TIMEOUT = 60000; // 60 секунд для API запросов

// Базовые URL для API (используем proxy в development для решения CORS)
const isDevelopment = import.meta.env.DEV;
const GIGACHAT_OAUTH_URL = isDevelopment 
  ? '/api/gigachat-oauth/api/v2/oauth'  // Через Vite proxy
  : 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';  // Прямой вызов (нужен backend proxy в production)

const GIGACHAT_API_URL = isDevelopment
  ? '/api/gigachat-api/api/v1/chat/completions'  // Через Vite proxy
  : 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';

/**
 * Создаёт fetch с таймаутом
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GigaChatError(
        'TIMEOUT',
        `Запрос превысил максимальное время ожидания (${timeout / 1000} секунд)`
      );
    }
    throw error;
  }
}

/**
 * Пользовательская ошибка для GigaChat API
 */
class GigaChatError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'GigaChatError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Получает токен доступа GigaChat API через OAuth
 * 
 * Данные которые вам нужны от GigaChat:
 * 1. Client ID (получите при регистрации)
 * 2. Client Secret (получите при регистрации)
 * 
 * Эти данные нужно закодировать в Base64 и отправить в OAuth endpoint
 */
async function getAccessToken(): Promise<string> {
  const clientId = import.meta.env.VITE_GIGACHAT_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GIGACHAT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new GigaChatError(
      'NO_CREDENTIALS',
      'Учетные данные GigaChat не настроены. Добавьте VITE_GIGACHAT_CLIENT_ID и VITE_GIGACHAT_CLIENT_SECRET в файл .env'
    );
  }

  // Проверяем кэш токена
  if (cachedToken && cachedToken.expires_at) {
    const expiresAt = new Date(cachedToken.expires_at).getTime();
    const now = Date.now();
    // Если токен еще действителен (с запасом в 1 минуту), используем его
    if (expiresAt > now + 60000) {
      return cachedToken.access_token;
    }
  }

  try {
    // Кодируем credentials в Base64
    const credentials = btoa(`${clientId}:${clientSecret}`);
    
    // Генерируем уникальный RqUID
    const rqUID = crypto.randomUUID();

    const response = await fetchWithTimeout(
      GIGACHAT_OAUTH_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': rqUID,
          'Authorization': `Basic ${credentials}`,
        },
        body: 'scope=GIGACHAT_API_PERS',
      },
      OAUTH_TIMEOUT
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GigaChat OAuth error:', response.status, errorText);
      
      let errorMessage = 'Не удалось получить токен доступа';
      if (response.status === 401) {
        errorMessage = 'Неверные учетные данные. Проверьте Client ID и Client Secret';
      } else if (response.status === 429) {
        errorMessage = 'Превышен лимит запросов. Попробуйте позже';
      } else if (response.status >= 500) {
        errorMessage = 'Ошибка сервера GigaChat. Попробуйте позже';
      }
      
      throw new GigaChatError(`OAUTH_${response.status}`, errorMessage, { status: response.status, details: errorText });
    }

    const data = await response.json();
    
    if (!data.access_token) {
      throw new GigaChatError('INVALID_RESPONSE', 'Неожиданный формат ответа от сервера');
    }
    
    // Кэшируем токен (действителен 30 минут)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    cachedToken = {
      access_token: data.access_token,
      expires_at: expiresAt.toISOString(),
    };

    return data.access_token;
  } catch (error) {
    if (error instanceof GigaChatError) {
      throw error;
    }
    
    if (error instanceof Error) {
      // Проверяем на сетевые ошибки и CORS
      if (error.message.includes('fetch') || error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        throw new GigaChatError('NETWORK_ERROR', 'Ошибка сети. Проверьте подключение к интернету или перезапустите dev server для применения proxy настроек');
      }
      throw new GigaChatError('UNKNOWN_ERROR', `Неожиданная ошибка: ${error.message}`, error);
    }
    
    throw new GigaChatError('UNKNOWN_ERROR', 'Неизвестная ошибка при получении токена');
  }
}

/**
 * Генерирует текст используя GigaChat API
 * 
 * Данные для отправки в GigaChat API:
 * - model: название модели (например, "GigaChat")
 * - messages: массив сообщений с ролями:
 *   - role: "system" | "user" | "assistant"
 *   - content: текст сообщения
 * - temperature: креативность ответа (0.0-1.0, по умолчанию 0.7)
 * - max_tokens: максимальная длина ответа (по умолчанию 2000)
 * 
 * Авторизация:
 * Сначала получаем access_token через OAuth
 * Затем используем его в заголовке Authorization: Bearer {access_token}
 */
export async function generateTextWithGigaChat(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const messages: GigaChatMessage[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: prompt });

  try {
    // Получаем токен доступа
    const accessToken = await getAccessToken();

    const response = await fetchWithTimeout(
      GIGACHAT_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          model: 'GigaChat',
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        } as GigaChatRequest),
      },
      API_TIMEOUT
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GigaChat API error:', response.status, errorText);
      
      let errorMessage = 'Ошибка при генерации текста';
      if (response.status === 401) {
        errorMessage = 'Токен доступа устарел. Попробуйте снова';
        // Сбрасываем кэш токена при 401
        cachedToken = null;
      } else if (response.status === 429) {
        errorMessage = 'Превышен лимит запросов. Подождите немного';
      } else if (response.status >= 500) {
        errorMessage = 'Ошибка сервера GigaChat. Попробуйте позже';
      } else if (response.status === 400) {
        errorMessage = 'Неверный запрос. Проверьте входные данные';
      }
      
      throw new GigaChatError(`API_${response.status}`, errorMessage, { status: response.status, details: errorText });
    }

    const data: GigaChatResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new GigaChatError('EMPTY_RESPONSE', 'Пустой ответ от GigaChat');
    }

    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof GigaChatError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new GigaChatError('NETWORK_ERROR', 'Ошибка сети. Проверьте подключение к интернету');
      }
      throw new GigaChatError('UNKNOWN_ERROR', `Неожиданная ошибка: ${error.message}`, error);
    }
    
    throw new GigaChatError('UNKNOWN_ERROR', 'Неизвестная ошибка при генерации текста');
  }
}

/**
 * Типы документов и их характеристики
 */
export const documentTypes = {
  essay: { 
    name: 'Реферат', 
    minSections: 3, 
    maxSections: 7, 
    targetChars: 5000,
    description: 'Краткий обзор темы с основными выводами'
  },
  courseWork: { 
    name: 'Курсовая работа', 
    minSections: 5, 
    maxSections: 10, 
    targetChars: 15000,
    description: 'Исследование с практической частью'
  },
  diploma: { 
    name: 'Дипломная работа', 
    minSections: 8, 
    maxSections: 15, 
    targetChars: 40000,
    description: 'Полноценное исследование с глубоким анализом'
  },
  article: { 
    name: 'Научная статья', 
    minSections: 3, 
    maxSections: 6, 
    targetChars: 12000,
    description: 'Краткое исследование для публикации'
  },
  report: { 
    name: 'Отчёт', 
    minSections: 4, 
    maxSections: 8, 
    targetChars: 10000,
    description: 'Структурированный отчёт о проделанной работе'
  },
} as const;

export type DocumentType = keyof typeof documentTypes;

/**
 * Генерирует структуру документа на основе темы и типа документа
 */
export async function generateDocumentStructure(
  theme: string,
  docType: DocumentType,
  sourceMaterials?: string
): Promise<Array<{
  title: string;
  description: string;
  estimatedChars: number;
  subsections: string[];
}>> {
  const docTypeInfo = documentTypes[docType];
  
  let materialsPrompt = "";
  if (sourceMaterials && sourceMaterials.trim()) {
    materialsPrompt = `

Исходные материалы и данные:
${sourceMaterials}

Учти эти материалы при формировании структуры документа.`;
  }
  
  const prompt = `Создай детальную структуру ${docTypeInfo.name.toLowerCase()} на тему: "${theme}"${materialsPrompt}

Требования к структуре:
- Количество разделов: ${docTypeInfo.minSections}-${docTypeInfo.maxSections}
- Целевой объём: ${docTypeInfo.targetChars.toLocaleString('ru-RU')} символов
- Стиль: академический, научный

Верни только JSON массив объектов с полями:
- title: название раздела
- description: подробное описание содержания раздела
- estimatedChars: ориентировочный объём раздела в символах
- subsections: массив подразделов или ключевых пунктов

Формат JSON:
[
  {
    "title": "Введение",
    "description": "Актуальность темы, цели и задачи исследования...",
    "estimatedChars": 1000,
    "subsections": ["Актуальность темы", "Цель исследования", "Задачи"]
  },
  {
    "title": "Основная часть",
    "description": "...",
    "estimatedChars": 3000,
    "subsections": [...]
  }
]

ВАЖНО: Последний раздел должен быть "Список использованной литературы" с описанием "Список источников по ГОСТ/APA".

Не добавляй никакого дополнительного текста, только JSON.`;

  const systemPrompt = `Ты - эксперт по созданию академических документов. Создавай профессиональные, структурированные разделы в соответствии с требованиями к типу документа.`;

  try {
    const response = await generateTextWithGigaChat(prompt, systemPrompt);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new GigaChatError('PARSE_ERROR', 'Не удалось распарсить структуру документа');
    }

    const structure = JSON.parse(jsonMatch[0]);
    
    // Валидация структуры
    if (!Array.isArray(structure) || structure.length === 0) {
      throw new GigaChatError('INVALID_STRUCTURE', 'Неверная структура документа');
    }

    // Добавляем библиографию если её нет
    const hasBibliography = structure.some(s => 
      s.title.toLowerCase().includes('литература') || 
      s.title.toLowerCase().includes('источники')
    );
    
    if (!hasBibliography) {
      structure.push({
        title: 'Список использованной литературы',
        description: 'Перечень источников, использованных в работе, оформленных по ГОСТ или APA',
        estimatedChars: 1000,
        subsections: ['Отечественные источники', 'Зарубежные источники']
      });
    }
    
    return structure;
  } catch (error) {
    if (error instanceof GigaChatError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new GigaChatError('JSON_PARSE_ERROR', 'Ошибка парсинга JSON ответа');
    }
    
    throw error;
  }
}

/**
 * Генерирует содержание для раздела документа
 */
export async function generateSectionContent(
  title: string,
  description: string,
  theme: string
): Promise<string> {
  const prompt = `Напиши подробное содержание для раздела "${title}" документа на тему: "${theme}"

Описание раздела: ${description}

Напиши развернутый текст на 300-400 слов. Используй академический стиль. Структурируй текст на абзацы.`;

  const systemPrompt = `Ты - опытный писатель академических текстов. Пиши четко, профессионально и структурированно. Избегай шаблонных фраз, используй разнообразие в формулировках.`;

  const content = await generateTextWithGigaChat(prompt, systemPrompt);
  return content;
}

/**
 * Очеловечивает текст - делает его более естественным и менее похожим на AI-сгенерированный
 */
export async function humanizeText(text: string): Promise<string> {
  const prompt = `Переформулируй следующий текст, сделав его более естественным и "человеческим". 
Сохрани смысл и академический стиль, но:
- Разнообразь формулировки
- Избегай шаблонных AI-фраз
- Добавь немного вариативности в построение предложений
- Сделай текст похожим на написанный человеком

Текст для обработки:
${text}`;

  const systemPrompt = `Ты - опытный редактор академических текстов. Твоя задача - улучшить стиль текста, сохранив смысл.`;

  const humanized = await generateTextWithGigaChat(prompt, systemPrompt);
  return humanized;
}

// Экспортируем класс ошибки для использования в других модулях
export { GigaChatError };
