import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface ThemeInputProps {
  onNext: (theme: string) => void;
}

const exampleThemes = [
  "Анализ цифровых трендов в современном бизнесе",
  "Влияние искусственного интеллекта на экономику",
  "Устойчивое развитие и зелёные технологии",
  "Кибербезопасность в корпоративной среде",
];

export const ThemeInput = ({ onNext }: ThemeInputProps) => {
  const [theme, setTheme] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!theme.trim()) {
      toast.error("Пожалуйста, введите тему документа");
      return;
    }
    
    if (theme.trim().length < 10) {
      toast.error("Тема слишком короткая. Добавьте больше деталей");
      return;
    }
    
    toast.success("Генерируем структуру документа...");
    onNext(theme);
  };

  const handleExampleClick = (example: string) => {
    setTheme(example);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Шаг 1: Определение темы
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          О чём ваш документ?
        </h2>
        <p className="text-lg text-muted-foreground">
          Опишите тему — AI создаст профессиональную структуру
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="theme" className="text-base font-semibold">
            Тема документа
          </Label>
          <Input
            id="theme"
            placeholder="Например: Анализ цифровых трендов в современном бизнесе"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="h-14 text-base"
          />
          <p className="text-sm text-muted-foreground">
            Чем подробнее опишете тему, тем точнее будет структура документа
          </p>
        </div>

        <div className="p-6 rounded-xl bg-secondary/50 border border-border space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-5 w-5 text-accent" />
            Примеры тем
          </div>
          <div className="grid gap-2">
            {exampleThemes.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleExampleClick(example)}
                className="text-left text-sm p-3 rounded-lg bg-card hover:bg-accent/10 border border-border hover:border-accent transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <Button 
          type="submit" 
          size="xl" 
          className="w-full"
          variant="hero"
        >
          Создать структуру
          <Sparkles className="ml-2 h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};
