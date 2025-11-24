import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface TelegramLoginButtonProps {
  botName: string;
  disabled?: boolean;
}

export const TelegramLoginButton = ({ botName, disabled }: TelegramLoginButtonProps) => {
  if (!botName) {
    return (
      <Button type="button" variant="outline" disabled className="w-full justify-center gap-2 text-muted-foreground">
        <Send className="h-4 w-4" />
        Telegram не настроен
      </Button>
    );
  }

  const cleanBotName = botName.replace('@', '');
  const botUrl = `https://t.me/${cleanBotName}?start=web`;

  return (
    <Button
      type="button"
      variant="default"
      disabled={disabled}
      className="w-full justify-center gap-2"
      onClick={() => {
        window.open(botUrl, '_blank', 'noopener,noreferrer');
      }}
    >
      <Send className="h-4 w-4" />
      Войти через Telegram
    </Button>
  );
};

