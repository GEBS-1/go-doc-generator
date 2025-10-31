import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GripVertical, Plus, Trash2, Edit2, Check, X, Loader2, Sparkles, Hash } from "lucide-react";
import { toast } from "sonner";
import { generateDocumentStructure, DocumentType, documentTypes, GigaChatError } from "@/lib/gigachat";

interface Section {
  id: string;
  title: string;
  description: string;
  estimatedChars?: number;
  subsections?: string[];
}

interface StructureEditorProps {
  theme: string;
  docType: DocumentType;
  onNext: (sections: Section[]) => void;
  onBack: () => void;
}

export const StructureEditor = ({ theme, docType, onNext, onBack }: StructureEditorProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);

  // Автоматически генерируем структуру при загрузке
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GIGACHAT_CLIENT_ID;
    const apiSecret = import.meta.env.VITE_GIGACHAT_CLIENT_SECRET;
    setHasApiKey(!!(apiKey && apiSecret));
    
    if (!hasApiKey) {
      // Используем дефолтную структуру если нет API ключа
      setSections(getDefaultStructure(docType));
    } else {
      // Генерируем через AI
      generateStructure();
    }
  }, [theme, docType]);

  const generateStructure = async () => {
    setIsGenerating(true);
    try {
      const generatedStructure = await generateDocumentStructure(theme, docType);
      
      // Преобразуем в нужный формат
      const formattedSections: Section[] = generatedStructure.map((section, index) => ({
        id: (index + 1).toString(),
        title: section.title,
        description: section.description,
        estimatedChars: section.estimatedChars,
        subsections: section.subsections,
      }));
      
      setSections(formattedSections);
      toast.success("Структура документа сгенерирована!");
    } catch (error) {
      console.error('Error generating structure:', error);
      
      if (error instanceof GigaChatError) {
        toast.error(`Ошибка: ${error.message}`, {
          description: error.code === 'NO_CREDENTIALS' 
            ? 'Настройте API ключи в .env файле'
            : undefined
        });
      } else {
        toast.error('Не удалось сгенерировать структуру');
      }
      
      // Fallback на дефолтную структуру
      setSections(getDefaultStructure(docType));
    } finally {
      setIsGenerating(false);
    }
  };

  const getDefaultStructure = (type: DocumentType): Section[] => {
    const structures = {
      essay: [
        { id: "1", title: "Введение", description: "Цели и задачи работы, актуальность темы" },
        { id: "2", title: "Основная часть", description: "Изложение материала по теме" },
        { id: "3", title: "Заключение", description: "Выводы и основные результаты" },
        { id: "4", title: "Список использованной литературы", description: "Перечень источников" },
      ],
      courseWork: [
        { id: "1", title: "Введение", description: "Актуальность темы, цели и задачи исследования" },
        { id: "2", title: "Теоретические основы", description: "Анализ существующих подходов и литературы" },
        { id: "3", title: "Методология исследования", description: "Описание методов и инструментов" },
        { id: "4", title: "Анализ и результаты", description: "Практический анализ и полученные данные" },
        { id: "5", title: "Заключение", description: "Выводы и рекомендации" },
        { id: "6", title: "Список использованной литературы", description: "Перечень источников" },
      ],
      diploma: [
        { id: "1", title: "Введение", description: "Актуальность, цели, задачи, объект и предмет исследования" },
        { id: "2", title: "Обзор литературы", description: "Анализ существующих исследований" },
        { id: "3", title: "Методология", description: "Методы и инструменты исследования" },
        { id: "4", title: "Анализ текущего состояния", description: "Анализ объекта исследования" },
        { id: "5", title: "Разработка решения", description: "Предлагаемое решение или подход" },
        { id: "6", title: "Реализация и тестирование", description: "Практическая реализация" },
        { id: "7", title: "Результаты и их обсуждение", description: "Полученные результаты" },
        { id: "8", title: "Заключение", description: "Выводы и перспективы" },
        { id: "9", title: "Список использованной литературы", description: "Перечень источников" },
      ],
      article: [
        { id: "1", title: "Введение", description: "Цели и задачи исследования, актуальность" },
        { id: "2", title: "Методы", description: "Методология исследования" },
        { id: "3", title: "Результаты", description: "Основные результаты" },
        { id: "4", title: "Обсуждение", description: "Интерпретация результатов" },
        { id: "5", title: "Заключение", description: "Выводы" },
        { id: "6", title: "Список литературы", description: "Источники" },
      ],
      report: [
        { id: "1", title: "Введение", description: "Цели и задачи отчёта" },
        { id: "2", title: "Основные данные", description: "Основная информация" },
        { id: "3", title: "Анализ", description: "Анализ данных" },
        { id: "4", title: "Выводы и рекомендации", description: "Заключение" },
        { id: "5", title: "Источники", description: "Список источников" },
      ],
    };
    
    return structures[type] || structures.courseWork;
  };

  const handleEdit = (section: Section) => {
    setEditingId(section.id);
    setEditTitle(section.title);
    setEditDescription(section.description);
  };

  const handleSave = () => {
    setSections(sections.map(s => 
      s.id === editingId 
        ? { ...s, title: editTitle, description: editDescription }
        : s
    ));
    setEditingId(null);
    toast.success("Раздел обновлён");
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (sections.length <= 2) {
      toast.error("Документ должен содержать минимум 2 раздела");
      return;
    }
    setSections(sections.filter(s => s.id !== id));
    toast.success("Раздел удалён");
  };

  const handleAdd = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: "Новый раздел",
      description: "Описание нового раздела",
    };
    setSections([...sections, newSection]);
    handleEdit(newSection);
  };

  const handleSubmit = () => {
    if (editingId) {
      toast.error("Сохраните или отмените редактирование текущего раздела");
      return;
    }
    toast.success("Генерируем содержание документа...");
    onNext(sections);
  };

  const totalChars = sections.reduce((sum, s) => sum + (s.estimatedChars || 0), 0);
  const docTypeInfo = documentTypes[docType];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8 space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Структура документа
        </h2>
        <p className="text-lg text-muted-foreground">
          Тема: <span className="text-foreground font-semibold">{theme}</span>
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <Badge variant="secondary">{docTypeInfo.name}</Badge>
          <span className="text-muted-foreground">
            Разделов: {sections.length}
          </span>
          {totalChars > 0 && (
            <span className="text-muted-foreground">
              Объём: ~{totalChars.toLocaleString('ru-RU')} символов
            </span>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="mb-8 space-y-4">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              AI генерирует оптимальную структуру документа...
            </p>
          </div>
          <Progress value={100} className="h-2" />
        </div>
      )}

      <div className="space-y-4 mb-8">
        {sections.map((section, index) => (
          <Card key={section.id} className="p-6 hover:shadow-md transition-shadow">
            {editingId === section.id ? (
              <div className="space-y-4">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Название раздела"
                  className="text-lg font-semibold"
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Описание раздела"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" variant="success">
                    <Check className="h-4 w-4 mr-1" />
                    Сохранить
                  </Button>
                  <Button onClick={handleCancel} size="sm" variant="outline">
                    <X className="h-4 w-4 mr-1" />
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <div className="flex items-center text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-semibold text-card-foreground">
                      {section.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground ml-11">
                    {section.description}
                  </p>
                  {section.estimatedChars && (
                    <div className="ml-11 flex items-center gap-2">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        ~{section.estimatedChars.toLocaleString('ru-RU')} символов
                      </span>
                    </div>
                  )}
                  {section.subsections && section.subsections.length > 0 && (
                    <div className="ml-11 flex flex-wrap gap-2">
                      {section.subsections.slice(0, 4).map((sub, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {sub}
                        </Badge>
                      ))}
                      {section.subsections.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{section.subsections.length - 4} ещё
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(section)}
                    size="sm"
                    variant="ghost"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(section.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex gap-4 mb-8">
        <Button
          onClick={handleAdd}
          variant="outline"
          className="flex-1"
        >
          <Plus className="h-5 w-5 mr-2" />
          Добавить раздел
        </Button>
        {hasApiKey && (
          <Button
            onClick={generateStructure}
            variant="outline"
            disabled={isGenerating}
            className="flex-1"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Регенерировать
          </Button>
        )}
      </div>

      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" size="lg" className="flex-1">
          Назад
        </Button>
        <Button onClick={handleSubmit} variant="hero" size="lg" className="flex-1" disabled={isGenerating}>
          Сгенерировать текст
        </Button>
      </div>
    </div>
  );
};
