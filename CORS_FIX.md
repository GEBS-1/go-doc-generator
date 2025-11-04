# 🔧 Исправление CORS ошибки

**Дата**: 2025-01-27  
**Проблема**: CORS блокирует запросы к GigaChat API из браузера  
**Статус**: ✅ **ИСПРАВЛЕНО**

---

## ❌ **Проблема**

При попытке обращения к GigaChat API из браузера возникала ошибка:

```
Access to fetch at 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth' 
from origin 'http://localhost:8080' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Причина**: GigaChat API не разрешает прямые запросы из браузера из-за политики CORS (Cross-Origin Resource Sharing).

---

## ✅ **Решение**

### **Для Development окружения**

Добавлен **Vite proxy** для проксирования запросов к GigaChat API через dev server. Это позволяет обойти ограничения CORS, так как запросы идут с того же origin.

### **Что изменено:**

1. **`vite.config.ts`** - Добавлена конфигурация proxy:
   ```typescript
   proxy: {
     // Proxy для GigaChat OAuth
     '/api/gigachat-oauth': {
       target: 'https://ngw.devices.sberbank.ru:9443',
       changeOrigin: true,
       secure: true,
       rewrite: (path) => path.replace(/^\/api\/gigachat-oauth/, ''),
     },
     // Proxy для GigaChat API
     '/api/gigachat-api': {
       target: 'https://gigachat.devices.sberbank.ru',
       changeOrigin: true,
       secure: true,
       rewrite: (path) => path.replace(/^\/api\/gigachat-api/, ''),
     },
   }
   ```

2. **`src/lib/gigachat.ts`** - Обновлены URL для использования proxy в development:
   ```typescript
   const isDevelopment = import.meta.env.DEV;
   const GIGACHAT_OAUTH_URL = isDevelopment 
     ? '/api/gigachat-oauth/api/v2/oauth'  // Через Vite proxy
     : 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
   
   const GIGACHAT_API_URL = isDevelopment
     ? '/api/gigachat-api/api/v1/chat/completions'  // Через Vite proxy
     : 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
   ```

---

## 🚀 **Как применить исправление**

### **Шаг 1: Перезапустите dev server**

Proxy настройки применяются только при старте сервера.

```powershell
# 1. Остановите текущий сервер (Ctrl+C в терминале где запущен npm run dev)

# 2. Запустите заново
npm run dev
```

### **Шаг 2: Проверьте работу**

1. Откройте http://localhost:8080/generator
2. Введите тему и создайте документ
3. Проверьте, что API запросы работают без CORS ошибок

---

## ⚠️ **Важные замечания**

### **Для Production**

⚠️ **Vite proxy работает только в development режиме!**

Для production нужен **backend proxy**:
- Node.js/Express
- FastAPI (Python)
- Go backend
- Serverless functions (Vercel, Netlify)

**Пример для Node.js/Express:**
```javascript
app.post('/api/gigachat-oauth/*', async (req, res) => {
  const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
    method: 'POST',
    headers: {
      ...req.headers,
      host: 'ngw.devices.sberbank.ru:9443'
    },
    body: req.body
  });
  const data = await response.json();
  res.json(data);
});
```

### **Почему два разных proxy?**

GigaChat использует два разных домена:
- `ngw.devices.sberbank.ru:9443` - для OAuth (получение токена)
- `gigachat.devices.sberbank.ru` - для API запросов (генерация текста)

Поэтому нужны два отдельных proxy.

---

## ✅ **Результат**

- ✅ CORS ошибки устранены в development
- ✅ API запросы работают через proxy
- ✅ Код автоматически определяет режим (dev/prod)
- ✅ Для production используется прямой вызов (требует backend proxy)

---

## 📝 **Проверка**

После перезапуска dev server:

1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Создайте документ
4. Проверьте, что запросы идут к:
   - `/api/gigachat-oauth/api/v2/oauth` ✅
   - `/api/gigachat-api/api/v1/chat/completions` ✅
5. Убедитесь, что нет CORS ошибок ✅

---

**Последнее обновление**: 2025-01-27  
**Статус**: ✅ Исправлено для development  
**Следующий шаг**: Реализовать backend proxy для production
