import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import type { TelegramAuthPayload } from "@/types/auth";

interface TelegramLoginButtonProps {
  botName: string;
  onAuth: (payload: TelegramAuthPayload) => Promise<void>;
  disabled?: boolean;
}

declare global {
  interface Document {
    _telegramLoginScriptLoaded?: boolean;
  }
}

export const TelegramLoginButton = ({ botName, onAuth, disabled }: TelegramLoginButtonProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleTelegramAuth = useCallback(
    async (payload: TelegramAuthPayload) => {
      try {
        await onAuth(payload);
      } catch (error) {
        console.error("Telegram auth failed", error);
      }
    },
    [onAuth],
  );

  useEffect(() => {
    if (!botName || !containerRef.current || disabled) {
      return;
    }

    // Убираем @ если есть
    const cleanBotName = botName.replace('@', '');
    console.log('[TelegramLoginButton] Инициализация виджета для бота:', cleanBotName);

    // Объявляем функцию глобально ДО загрузки скрипта
    // Telegram виджет ищет функцию по имени из data-onauth
    (window as any).handleTelegramAuth = (user: any) => {
      console.log('[TelegramLoginButton] Виджет вызвал handleTelegramAuth:', user);
      handleTelegramAuth(user).catch((error) => {
        console.error('[TelegramLoginButton] Ошибка в handleTelegramAuth:', error);
      });
    };

    const container = containerRef.current;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = cleanBotName;
    script.dataset.size = "large";
    script.dataset.userpic = "false";
    script.dataset.onauth = "handleTelegramAuth";
    script.dataset.requestAccess = "write";
    script.dataset.radius = "10";

    script.onerror = () => {
      console.error('[TelegramLoginButton] Ошибка загрузки скрипта Telegram Widget');
      container.innerHTML = `
        <div class="flex flex-col items-center gap-2 p-4 border border-dashed rounded-lg">
          <p class="text-sm text-muted-foreground">Не удалось загрузить виджет Telegram</p>
          <a href="https://t.me/${cleanBotName}" target="_blank" class="text-primary hover:underline">
            Открыть бота в Telegram
          </a>
        </div>
      `;
    };

    script.onload = () => {
      console.log('[TelegramLoginButton] Скрипт Telegram Widget загружен');
      console.log('[TelegramLoginButton] Проверка функции handleTelegramAuth:', typeof (window as any).handleTelegramAuth);
      // Проверяем что виджет загрузился
      setTimeout(() => {
        const widget = container.querySelector('iframe');
        if (widget) {
          console.log('[TelegramLoginButton] Виджет iframe найден');
        } else {
          console.warn('[TelegramLoginButton] Виджет iframe не найден - возможно домен не добавлен в BotFather');
        }
      }, 1000);
    };

    container.appendChild(script);

    return () => {
      if (container.contains(script)) {
        container.removeChild(script);
      }
      // Очищаем глобальную функцию только если это наша
      if ((window as any).handleTelegramAuth) {
        delete (window as any).handleTelegramAuth;
      }
    };
  }, [botName, handleTelegramAuth, disabled]);

  if (!botName) {
    return (
      <Button type="button" variant="outline" disabled className="w-full justify-center gap-2 text-muted-foreground">
        <Send className="h-4 w-4" />
        Telegram не настроен
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="flex justify-center min-h-[60px]" />
      {!botName && (
        <div className="flex flex-col items-center gap-2 p-4 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Telegram бот не настроен</p>
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Авторизация произойдёт в Telegram, мы получим только имя и username.
      </p>
      {botName && (
        <p className="text-center text-xs text-muted-foreground">
          Если виджет не загружается, откройте{' '}
          <a 
            href={`https://t.me/${botName.replace('@', '')}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            бота в Telegram
          </a>
        </p>
      )}
    </div>
  );
};

