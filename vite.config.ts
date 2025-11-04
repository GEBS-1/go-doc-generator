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
      // Proxy для GigaChat OAuth (решает проблему CORS в development)
      '/api/gigachat-oauth': {
        target: 'https://ngw.devices.sberbank.ru:9443',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/gigachat-oauth/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('Proxy error (OAuth):', err);
          });
        },
      },
      // Proxy для GigaChat API (решает проблему CORS в development)
      '/api/gigachat-api': {
        target: 'https://gigachat.devices.sberbank.ru',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/gigachat-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('Proxy error (API):', err);
          });
        },
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
  },
}));
