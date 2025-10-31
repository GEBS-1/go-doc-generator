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
    throw new Error('GigaChat credentials not configured. Please set VITE_GIGACHAT_CLIENT_ID and VITE_GIGACHAT_CLIENT_SECRET in .env');
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

    const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rqUID,
        'Authorization': `Basic ${credentials}`,
      },
      body: 'scope=GIGACHAT_API_PERS',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GigaChat OAuth error:', response.status, errorText);
      throw new Error(`Failed to get access token: ${response.status}`);
    }

    const data = await response.json();
    
    // Кэшируем токен (действителен 30 минут)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    cachedToken = {
      access_token: data.access_token,
      expires_at: expiresAt.toISOString(),
    };

    return data.access_token;
  } catch (error) {
    console.error('Error getting GigaChat token:', error);
    throw error;
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

    const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GigaChat API error:', response.status, errorText);
      throw new Error(`GigaChat API error: ${response.status}`);
    }

    const data: GigaChatResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from GigaChat');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling GigaChat API:', error);
    throw error;
  }
}

/**
 * Генерирует структуру документа на основе темы
 */
export async function generateDocumentStructure(theme: string): Promise<Array<{
  title: string;
  description: string;
}>> {
  const prompt = `Создай структуру академического документа на тему: "${theme}"

Верни только JSON массив объектов с полями:
- title: название раздела
- description: краткое описание содержания раздела

Формат JSON:
[
  {"title": "Введение", "description": "..."},
  {"title": "Основная часть", "description": "..."},
  {"title": "Заключение", "description": "..."}
]

Не добавляй никакого дополнительного текста, только JSON.`;

  const systemPrompt = `Ты - помощник для создания академических документов. Создавай структурированные, профессиональные разделы для документов.`;

  const response = await generateTextWithGigaChat(prompt, systemPrompt);
  
  // Extract JSON from response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse structure from response');
  }

  const structure = JSON.parse(jsonMatch[0]);
  return structure;
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

  const systemPrompt = `Ты - опытный писатель академических текстов. Пиши четко, профессионально и структурированно.`;

  const content = await generateTextWithGigaChat(prompt, systemPrompt);
  return content;
}
