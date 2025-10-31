import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
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
