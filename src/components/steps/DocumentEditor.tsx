import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Eye, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { humanizeText, GigaChatError } from "@/lib/gigachat";

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

export const DocumentEditor = ({ sections: initialSections, onNext, onBack }: DocumentEditorProps) => {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [activeTab, setActiveTab] = useState("edit");
  const [humanizingId, setHumanizingId] = useState<string | null>(null);

  const handleContentChange = (id: string, content: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, content } : s));
  };

  const handleHumanize = async (id: string) => {
    const section = sections.find(s => s.id === id);
    if (!section || !section.content) {
      toast.error("Сначала сгенерируйте текст для этого раздела");
      return;
    }

    setHumanizingId(id);
    toast.loading("Очеловечиваем текст...", { id: 'humanize' });

    try {
      const humanized = await humanizeText(section.content);
      setSections(sections.map(s => s.id === id ? { ...s, content: humanized } : s));
      toast.success("Текст успешно улучшен!", { id: 'humanize' });
    } catch (error) {
      console.error('Error humanizing text:', error);
      
      if (error instanceof GigaChatError) {
        toast.error(`Ошибка: ${error.message}`, { id: 'humanize' });
      } else {
        toast.error("Не удалось улучшить текст", { id: 'humanize' });
      }
    } finally {
      setHumanizingId(null);
    }
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {index + 1}
                  </span>
                  <h3 className="text-xl font-semibold text-card-foreground">
                    {section.title}
                  </h3>
                </div>
                <Button
                  onClick={() => handleHumanize(section.id)}
                  disabled={!section.content || humanizingId !== null}
                  size="sm"
                  variant="outline"
                >
                  {humanizingId === section.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Очеловечить
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={section.content || ""}
                onChange={(e) => handleContentChange(section.id, e.target.value)}
                rows={8}
                className="font-mono text-sm"
                disabled={humanizingId === section.id}
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
