import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";

interface Section {
  id: string;
  title: string;
  description: string;
}

interface TextGenerationProps {
  sections: Section[];
  onComplete: () => void;
}

export const TextGeneration = ({ sections, onComplete }: TextGenerationProps) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalSections = sections.length;
    const timePerSection = 2000; // 2 seconds per section

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / totalSections / 20);
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => onComplete(), 500);
          return 100;
        }
        return newProgress;
      });

      if (currentSection < totalSections - 1) {
        const sectionInterval = timePerSection / (100 / totalSections);
        if (progress >= ((currentSection + 1) * 100) / totalSections) {
          setCurrentSection((prev) => prev + 1);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [sections.length, onComplete, currentSection, progress]);

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
        <p className="text-muted-foreground">
          Пожалуйста, подождите. Это займёт несколько секунд...
        </p>
      </div>
    </div>
  );
};
