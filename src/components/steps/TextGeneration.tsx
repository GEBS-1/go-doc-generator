import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { generateSectionContent, GigaChatError } from "@/lib/gigachat";
import { toast } from "sonner";

interface Section {
  id: string;
  title: string;
  description: string;
  content?: string;
}

interface TextGenerationProps {
  sections: Section[];
  theme: string;
  onComplete: (generatedSections: Section[]) => void;
}

export const TextGeneration = ({ sections, theme, onComplete }: TextGenerationProps) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [progress, setProgress] = useState(0);
  const [generatedSections, setGeneratedSections] = useState<Section[]>([]);
  const [hasApiKey, setHasApiKey] = useState(true);
  const rateLimitTriggeredRef = useRef(false);
  const rateLimitToastShownRef = useRef(false);

  useEffect(() => {
    const authKey = import.meta.env.VITE_GIGACHAT_AUTH_KEY;
    const clientId = import.meta.env.VITE_GIGACHAT_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GIGACHAT_CLIENT_SECRET;
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    console.group("🔍 TextGeneration: Checking API Keys");
    console.log(
      "Backend URL:",
      backendUrl ? `✓ Found (${backendUrl})` : "✗ Not found",
    );
    console.log(
      "VITE_GIGACHAT_AUTH_KEY:",
      authKey ? `✓ Found (${authKey.substring(0, 15)}...)` : "✗ Not found",
    );
    console.log(
      "VITE_GIGACHAT_CLIENT_ID:",
      clientId ? `✓ Found (${clientId.substring(0, 15)}...)` : "✗ Not found",
    );
    console.log(
      "VITE_GIGACHAT_CLIENT_SECRET:",
      clientSecret ? "✓ Found" : "✗ Not found",
    );

    const hasDirectKeys = !!(authKey || (clientId && clientSecret));
    const canGenerate = !!backendUrl || hasDirectKeys;
    console.log("Can generate via backend:", backendUrl ? "✅ YES" : "❌ NO");
    console.log("Has direct keys:", hasDirectKeys ? "✅ YES" : "❌ NO");
    console.log(
      "Final availability:",
      canGenerate ? "✅ Backend or keys configured" : "❌ No credentials",
    );
    console.groupEnd();

    setHasApiKey(canGenerate);

    const generateContent = async () => {
      const sectionsWithContent: Section[] = [];
      let rateLimitActive = rateLimitTriggeredRef.current;
      
      for (let i = 0; i < sections.length; i++) {
        setCurrentSection(i);
        setProgress(((i + 1) / sections.length) * 90); // Leave 10% for completion

        try {
          let content: string;

          if (rateLimitActive) {
            content = generateMockContent(sections[i].title, sections[i].description);
            await new Promise(resolve => setTimeout(resolve, 800));
          } else if (backendUrl || authKey || (clientId && clientSecret)) {
            // Real AI generation
            content = await generateSectionContent(
              sections[i].title,
              sections[i].description,
              theme
            );
          } else {
            // Fallback mock content
            content = generateMockContent(sections[i].title, sections[i].description);
            // Add delay to simulate generation
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          sectionsWithContent.push({
            ...sections[i],
            content,
          });
        } catch (error) {
          console.error(`Error generating content for section ${i + 1}:`, error);
          
          // Выводим понятные сообщения об ошибках
          if (error instanceof GigaChatError) {
            const isRateLimit =
              typeof error.code === "string" && error.code.includes("429");

            if (isRateLimit || /лимит|too many/i.test(error.message)) {
              rateLimitActive = true;
              rateLimitTriggeredRef.current = true;
              if (!rateLimitToastShownRef.current) {
                toast.error("GigaChat временно ограничил запросы", {
                  description: "Подождите 1–2 минуты и попробуйте снова. Остальные разделы сформируем как черновики.",
                });
                rateLimitToastShownRef.current = true;
              }
            } else {
              toast.error(`Ошибка: ${error.message}`, {
                description: error.code === "NO_CREDENTIALS"
                  ? "Настройте API ключи в .env файле (VITE_GIGACHAT_AUTH_KEY или VITE_GIGACHAT_CLIENT_ID + SECRET)"
                  : error.code === "NETWORK_ERROR"
                  ? "Проверьте подключение к интернету"
                  : undefined,
              });
            }
          } else {
            toast.error(`Ошибка при генерации раздела: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
          }
          
          // Use mock content as fallback
          sectionsWithContent.push({
            ...sections[i],
            content: generateMockContent(sections[i].title, sections[i].description),
          });
        }
      }

      setGeneratedSections(sectionsWithContent);
      setProgress(100);
      
      // Wait a bit before completing
      setTimeout(() => {
        onComplete(sectionsWithContent);
      }, 500);
    };

    generateContent();
  }, [sections, theme, onComplete]);

  const generateMockContent = (title: string, description: string): string => {
    return `${title}

${description}

Данный раздел содержит подробный анализ заявленной темы. В рамках исследования были рассмотрены ключевые аспекты и проведён всесторонний анализ существующих подходов.

Основные положения:
• Первое ключевое положение, раскрывающее основную идею раздела
• Второе положение с детальным описанием методологии
• Третье положение о практическом применении результатов

Результаты анализа показывают значимость рассматриваемых аспектов для общего понимания темы. Детальное изучение позволило выявить ключевые закономерности и тенденции.

На основании проведённого исследования можно сделать вывод о необходимости дальнейшего изучения данного вопроса с учётом современных реалий и перспектив развития.`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin" />
          Генерация содержания
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Создаём ваш документ
        </h2>
        <p className="text-lg text-muted-foreground">
          AI генерирует профессиональный текст для каждого раздела
        </p>
      </div>

      <div className="space-y-8 mb-12">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-foreground">
              Прогресс генерации
            </span>
            <span className="text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        <div className="space-y-3">
          {sections.map((section, index) => {
            const isCompleted = index < currentSection || progress >= 100;
            const isCurrent = index === currentSection && progress < 100;

            return (
              <Card
                key={section.id}
                className={`p-4 transition-all ${
                  isCurrent ? "border-primary shadow-md" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      isCompleted
                        ? "bg-success text-success-foreground"
                        : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : isCurrent ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted
                        ? "Готово"
                        : isCurrent
                        ? "Генерируется..."
                        : "В очереди"}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="text-center p-6 rounded-xl bg-secondary/50 border border-border">
        {!hasApiKey && (
          <div className="mb-4 flex items-center gap-2 justify-center text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-semibold">
              GigaChat API ключ не настроен. Используется демо-режим.
            </p>
          </div>
        )}
        <p className="text-muted-foreground">
          Пожалуйста, подождите. Это займёт несколько секунд...
        </p>
      </div>
    </div>
  );
};
