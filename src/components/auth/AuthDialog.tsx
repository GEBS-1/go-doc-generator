import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { TelegramLoginButton } from "./TelegramLoginButton";
import type { TelegramAuthPayload } from "@/types/auth";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  telegramBotName?: string;
  onTelegramAuth: (payload: TelegramAuthPayload) => Promise<void>;
}

export const AuthDialog = ({
  open,
  onOpenChange,
  loading,
  telegramBotName,
  onTelegramAuth,
}: AuthDialogProps) => {
  const providersAvailable = useMemo(() => {
    const providers: Array<"telegram"> = [];
    if (telegramBotName) {
      providers.push("telegram");
    }
    return providers;
  }, [telegramBotName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle>Войдите, чтобы сохранять прогресс</DialogTitle>
          <DialogDescription>
            Используйте Telegram — мы моментально создадим аккаунт и привяжем подписку.
          </DialogDescription>
        </DialogHeader>

        {providersAvailable.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center">
            <LogIn className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Авторизация временно недоступна: добавьте TELEGRAM_BOT_USERNAME в .env.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {telegramBotName ? (
              <TelegramLoginButton
                botName={telegramBotName}
                disabled={loading}
                onAuth={onTelegramAuth}
              />
            ) : null}
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>Продолжая, вы соглашаетесь с условиями сервиса и политикой обработки данных.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/40 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Выполняем авторизацию…
          </div>
        ) : null}

        <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => onOpenChange(false)}>
          Закрыть
        </Button>
      </DialogContent>
    </Dialog>
  );
};

