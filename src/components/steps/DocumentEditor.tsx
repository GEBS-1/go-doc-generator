import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Eye } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  title: string;
  description: string;
  content?: string;
}

interface DocumentEditorProps {
  sections: Section[];
  onNext: (sections: Section[]) => void;
  onBack: () => void;
}

const generateMockContent = (title: string, description: string) => {
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

export const DocumentEditor = ({ sections: initialSections, onNext, onBack }: DocumentEditorProps) => {
  const [sections, setSections] = useState<Section[]>(
    initialSections.map((s) => ({
      ...s,
      content: generateMockContent(s.title, s.description),
    }))
  );
  const [activeTab, setActiveTab] = useState("edit");

  const handleContentChange = (id: string, content: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, content } : s));
  };

  const handleSubmit = () => {
    toast.success("Переходим к оформлению титульного листа");
    onNext(sections);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8 space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Редактор документа
        </h2>
        <p className="text-lg text-muted-foreground">
          Просмотрите и отредактируйте содержание перед экспортом
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Редактирование
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Предпросмотр
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6 mt-6">
          {sections.map((section, index) => (
            <Card key={section.id} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {index + 1}
                </span>
                <h3 className="text-xl font-semibold text-card-foreground">
                  {section.title}
                </h3>
              </div>
              <Textarea
                value={section.content || ""}
                onChange={(e) => handleContentChange(section.id, e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card className="p-8 md:p-12 bg-card prose prose-slate max-w-none">
            {sections.map((section, index) => (
              <div key={section.id} className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-card-foreground">
                  {index + 1}. {section.title}
                </h2>
                <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {section.content}
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" size="lg" className="flex-1">
          Назад
        </Button>
        <Button onClick={handleSubmit} variant="hero" size="lg" className="flex-1">
          Далее: Титульный лист
        </Button>
      </div>
    </div>
  );
};
