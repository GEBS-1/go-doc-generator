# DocuGen AI - Генератор академических документов

Веб-приложение для автоматической генерации академических документов с использованием AI.

## Project info

**URL**: https://lovable.dev/projects/fecc0060-36df-4c77-afdb-055a9b7b327f

## 🚀 Функциональность

- **AI-генерация структуры** - автоматическое создание структуры документа
- **Генерация содержания** - написание текста для каждого раздела
- **Редактор** - возможность редактирования сгенерированного контента
- **Экспорт в DOCX** - скачивание готового документа в формате Word

## ⚙️ Настройка GigaChat API

Для работы AI-генерации необходимо настроить API доступ к GigaChat:

### Шаг 1: Получение учетных данных
1. Зарегистрируйтесь на [developers.sber.ru/gigachat](https://developers.sber.ru/gigachat)
2. Создайте проект и получите:
   - **Client ID** — идентификатор клиента
   - **Client Secret** — секретный ключ клиента

### Шаг 2: Настройка .env файла
1. Скопируйте файл `env.example` в `.env`:
   ```bash
   copy env.example .env
   ```
2. Откройте `.env` и замените значения на свои:
   ```
   VITE_GIGACHAT_CLIENT_ID=ваш_client_id
   VITE_GIGACHAT_CLIENT_SECRET=ваш_client_secret
   ```
3. Перезапустите dev сервер

### Как работает авторизация
Приложение автоматически:
1. Получает токен доступа через OAuth (действителен 30 минут)
2. Кэширует токен для оптимизации запросов
3. Использует токен для всех запросов к GigaChat API

**Важно:** 
- Без учетных данных приложение будет работать только с демо-данными
- Не коммитьте `.env` файл в Git (он уже в .gitignore)

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fecc0060-36df-4c77-afdb-055a9b7b327f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fecc0060-36df-4c77-afdb-055a9b7b327f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
