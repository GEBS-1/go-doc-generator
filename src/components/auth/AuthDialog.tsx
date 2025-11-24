import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { TelegramLoginButton } from "./TelegramLoginButton";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  telegramBotName?: string;
}

export const AuthDialog = ({
  open,
  onOpenChange,
  loading,
  telegramBotName,
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
        </DialogHeader>

        {providersAvailable.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center">
            <LogIn className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Авторизация временно недоступна: добавьте TELEGRAM_BOT_USERNAME в .env.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {telegramBotName ? (
              <TelegramLoginButton
                botName={telegramBotName}
                disabled={loading}
              />
            ) : null}
          </div>
        )}

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
