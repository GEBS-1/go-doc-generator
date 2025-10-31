import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileCheck } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  title: string;
  content?: string;
}

interface TitlePageProps {
  sections: Section[];
  theme: string;
  onBack: () => void;
}

export const TitlePage = ({ sections, theme, onBack }: TitlePageProps) => {
  const [formData, setFormData] = useState({
    organization: "",
    department: "",
    title: theme,
    author: "",
    city: "",
    year: new Date().getFullYear().toString(),
    supervisor: "",
    template: "gost",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.organization || !formData.title || !formData.author) {
      toast.error("Заполните обязательные поля");
      return;
    }

    toast.success("Документ готов к скачиванию!");
    toast.info("В демо-режиме файл будет содержать водяной знак");
    
    // Simulate download
    setTimeout(() => {
      toast.success("Документ скачан успешно!");
    }, 1000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium">
          <FileCheck className="h-4 w-4" />
          Финальный этап
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Оформление титульного листа
        </h2>
        <p className="text-lg text-muted-foreground">
          Заполните данные для титульной страницы документа
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Основная информация</h3>
              
              <div className="space-y-2">
                <Label htmlFor="organization">
                  Организация <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => handleInputChange("organization", e.target.value)}
                  placeholder="Название учебного заведения или организации"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Подразделение</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  placeholder="Кафедра или отдел"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Тема <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Название работы"
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Автор и место</h3>
              
              <div className="space-y-2">
                <Label htmlFor="author">
                  Автор <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => handleInputChange("author", e.target.value)}
                  placeholder="ФИО автора"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supervisor">Руководитель</Label>
                <Input
                  id="supervisor"
                  value={formData.supervisor}
                  onChange={(e) => handleInputChange("supervisor", e.target.value)}
                  placeholder="ФИО и должность"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Город</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Москва"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Год</Label>
                  <Input
                    id="year"
                    value={formData.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                    placeholder="2025"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Шаблон оформления</h3>
              
              <div className="space-y-2">
                <Label htmlFor="template">Стиль документа</Label>
                <Select
                  value={formData.template}
                  onValueChange={(value) => handleInputChange("template", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gost">ГОСТ (академический)</SelectItem>
                    <SelectItem value="business">Деловой стиль</SelectItem>
                    <SelectItem value="free">Свободный формат</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <div className="flex gap-4">
              <Button 
                type="button" 
                onClick={onBack} 
                variant="outline" 
                size="lg" 
                className="flex-1"
              >
                Назад
              </Button>
              <Button 
                type="submit" 
                variant="success" 
                size="lg" 
                className="flex-1"
              >
                <Download className="mr-2 h-5 w-5" />
                Скачать .docx
              </Button>
            </div>
          </form>
        </div>

        <div>
          <Card className="p-8 bg-secondary/30 sticky top-24">
            <h3 className="text-lg font-semibold mb-6">Предпросмотр</h3>
            <div className="space-y-8 text-center border-2 border-dashed border-border p-8 rounded-lg">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">
                  {formData.organization || "НАЗВАНИЕ ОРГАНИЗАЦИИ"}
                </p>
                {formData.department && (
                  <p className="text-xs text-muted-foreground">
                    {formData.department}
                  </p>
                )}
              </div>

              <div className="space-y-4 py-8">
                <p className="text-xs uppercase text-muted-foreground">
                  {formData.template === "gost"
                    ? "Курсовая работа"
                    : formData.template === "business"
                    ? "Аналитический отчёт"
                    : "Документ"}
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formData.title || "ТЕМА ДОКУМЕНТА"}
                </p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                {formData.supervisor && (
                  <p>Руководитель: {formData.supervisor}</p>
                )}
                {formData.author && <p>Автор: {formData.author}</p>}
              </div>

              <div className="pt-8">
                <p className="text-sm text-muted-foreground">
                  {formData.city || "Город"}, {formData.year || "2025"}
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-accent/10 border border-accent text-sm text-center">
              <p className="font-semibold text-accent mb-1">Демо-режим</p>
              <p className="text-muted-foreground text-xs">
                Документ будет содержать водяной знак
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
