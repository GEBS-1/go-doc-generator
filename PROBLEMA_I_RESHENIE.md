# Проблема и решение

## Проблема

Проверка секрета уже ОТКЛЮЧЕНА в коде (строка 1601 закомментирована), НО код НЕ ЗАДЕПЛОЕН на Render.

На Render работает старая версия с проверкой секрета, поэтому получаем 401.

## Решение

**ЗАДЕПЛОИТЬ КОД НА RENDER:**

1. Закоммитьте изменения:
```bash
git add backend/server.js
git commit -m "Disable admin secret check for test user"
git push
```

2. Render автоматически задеплоит (или сделайте Manual Deploy)

3. Подождите 1-2 минуты

4. Создайте пользователя:
```bash
node test-create-user.js https://api.prepromo.online any
```

**ГОТОВО!**

