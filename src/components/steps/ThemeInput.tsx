import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Lightbulb, BookOpen, FileText, GraduationCap, Newspaper, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { DocumentType, documentTypes } from "@/lib/gigachat";
import { useAuth } from "@/hooks/useAuth";

interface ThemeInputProps {
  onNext: (theme: string, docType: DocumentType, sourceMaterials?: string) => void;
}

const exampleThemes = [
  "Анализ цифровых трендов в современном бизнесе",
  "Влияние искусственного интеллекта на экономику",
  "Устойчивое развитие и зелёные технологии",
  "Кибербезопасность в корпоративной среде",
];

const getDocumentTypeIcon = (type: DocumentType) => {
  const icons = {
    essay: BookOpen,
    courseWork: FileText,
    diploma: GraduationCap,
    article: Newspaper,
    report: FileCheck,
  };
  return icons[type] || FileText;
};

export const ThemeInput = ({ onNext }: ThemeInputProps) => {
  const [theme, setTheme] = useState("");
  const [docType, setDocType] = useState<DocumentType>("courseWork");
  const [sourceMaterials, setSourceMaterials] = useState("");
  const { isAuthenticated, promptLogin } = useAuth();
  const authRequired = import.meta.env.VITE_REQUIRE_AUTH !== "false";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authRequired && !isAuthenticated) {
      toast.info("Пожалуйста, войдите через Telegram, чтобы продолжить");
      promptLogin();
      return;
    }
    
    if (!theme.trim()) {
      toast.error("Пожалуйста, введите тему документа");
      return;
    }
    
    if (theme.trim().length < 10) {
      toast.error("Тема слишком короткая. Добавьте больше деталей");
      return;
    }
    
    const docTypeInfo = documentTypes[docType];
    toast.success(`Генерируем структуру ${docTypeInfo.name.toLowerCase()}...`);
    onNext(theme, docType, sourceMaterials);
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
          <Label htmlFor="docType" className="text-base font-semibold">
            Тип документа
          </Label>
          <Select value={docType} onValueChange={(value) => setDocType(value as DocumentType)}>
            <SelectTrigger className="h-14 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(documentTypes).map(([key, info]) => {
                const Icon = getDocumentTypeIcon(key as DocumentType);
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="font-semibold">{info.name}</div>
                        <div className="text-xs text-muted-foreground">{info.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {documentTypes[docType].name} • ~{documentTypes[docType].targetChars.toLocaleString('ru-RU')} символов • {documentTypes[docType].minSections}-{documentTypes[docType].maxSections} разделов
          </p>
        </div>

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

        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Исходные материалы (опционально)
          </Label>
          <Textarea
            placeholder="Добавьте дополнительные данные: результаты исследований, исходный код, требования, ссылки на источники и т.д."
            value={sourceMaterials}
            onChange={(e) => setSourceMaterials(e.target.value)}
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            AI будет использовать эти данные при генерации структуры и текста
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
