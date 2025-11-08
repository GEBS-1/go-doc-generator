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

    window.handleTelegramAuth = handleTelegramAuth;

    const container = containerRef.current;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = botName;
    script.dataset.size = "large";
    script.dataset.userpic = "false";
    script.dataset.onauth = "handleTelegramAuth";
    script.dataset.requestAccess = "write";

    container.appendChild(script);

    return () => {
      if (container.contains(script)) {
        container.removeChild(script);
      }
      if (window.handleTelegramAuth === handleTelegramAuth) {
        delete window.handleTelegramAuth;
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
      <div ref={containerRef} className="flex justify-center" />
      <p className="text-center text-xs text-muted-foreground">
        Авторизация произойдёт в Telegram, мы получим только имя и username.
      </p>
    </div>
  );
};

