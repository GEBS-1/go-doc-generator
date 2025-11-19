import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Vite proxy - это встроенная функция, не отдельный сервер!
      // Работает внутри Vite dev сервера и решает проблему CORS
      '/api/gigachat-oauth': {
        target: 'https://ngw.devices.sberbank.ru:9443',
        changeOrigin: true,
        secure: false, // Отключаем проверку SSL для development
        rewrite: (path) => path.replace(/^\/api\/gigachat-oauth/, ''),
      },
      '/api/gigachat-api': {
        target: 'https://gigachat.devices.sberbank.ru',
        changeOrigin: true,
        secure: false, // Отключаем проверку SSL для development
        rewrite: (path) => path.replace(/^\/api\/gigachat-api/, ''),
      },
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path, // Не переписываем путь, оставляем как есть
      },
      '/api/auth/telegram-token': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/plans': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/payments': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/subscription': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Отделяем большие библиотеки UI
          'radix-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          // Отделяем UI библиотеку
          'lucide-react': ['lucide-react'],
          // Отделяем библиотеки для работы с данными
          'query': ['@tanstack/react-query'],
          // Отделяем библиотеки для документов
          'docx': ['docx', 'file-saver'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Увеличиваем лимит предупреждений
    // Копируем _redirects файл в dist для Render
    copyPublicDir: true,
  },
}));
