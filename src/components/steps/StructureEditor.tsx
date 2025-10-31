import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { GripVertical, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  title: string;
  description: string;
}

interface StructureEditorProps {
  theme: string;
  onNext: (sections: Section[]) => void;
  onBack: () => void;
}

export const StructureEditor = ({ theme, onNext, onBack }: StructureEditorProps) => {
  const [sections, setSections] = useState<Section[]>([
    {
      id: "1",
      title: "Введение",
      description: "Актуальность темы, цели и задачи исследования, краткий обзор структуры документа",
    },
    {
      id: "2",
      title: "Теоретические основы",
      description: "Анализ существующих подходов, основные понятия и определения, обзор литературы",
    },
    {
      id: "3",
      title: "Методология исследования",
      description: "Описание методов, инструментов и подходов, использованных в работе",
    },
    {
      id: "4",
      title: "Анализ и результаты",
      description: "Практический анализ по теме, полученные данные, интерпретация результатов",
    },
    {
      id: "5",
      title: "Заключение",
      description: "Основные выводы, рекомендации, перспективы дальнейших исследований",
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8 space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Структура документа
        </h2>
        <p className="text-lg text-muted-foreground">
          Тема: <span className="text-foreground font-semibold">{theme}</span>
        </p>
        <p className="text-muted-foreground">
          Отредактируйте разделы или добавьте новые
        </p>
      </div>

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

      <Button
        onClick={handleAdd}
        variant="outline"
        className="w-full mb-8"
      >
        <Plus className="h-5 w-5 mr-2" />
        Добавить раздел
      </Button>

      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" size="lg" className="flex-1">
          Назад
        </Button>
        <Button onClick={handleSubmit} variant="hero" size="lg" className="flex-1">
          Сгенерировать текст
        </Button>
      </div>
    </div>
  );
};
