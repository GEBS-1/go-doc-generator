import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StepIndicator } from "@/components/StepIndicator";
import { ThemeInput } from "@/components/steps/ThemeInput";
import { StructureEditor } from "@/components/steps/StructureEditor";
import { TextGeneration } from "@/components/steps/TextGeneration";
import { DocumentEditor } from "@/components/steps/DocumentEditor";
import { TitlePage } from "@/components/steps/TitlePage";
import { DocumentType } from "@/lib/gigachat";

interface Section {
  id: string;
  title: string;
  description: string;
  content?: string;
  estimatedChars?: number;
  subsections?: string[];
}

const steps = [
  { number: 1, title: "Тема", description: "Введите тему документа" },
  { number: 2, title: "Структура", description: "Редактируйте разделы" },
  { number: 3, title: "Генерация", description: "AI создаёт текст" },
  { number: 4, title: "Редактор", description: "Доработайте содержание" },
  { number: 5, title: "Экспорт", description: "Титульный лист и скачивание" },
];

const Generator = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [theme, setTheme] = useState("");
  const [docType, setDocType] = useState<DocumentType>("courseWork");
  const [sourceMaterials, setSourceMaterials] = useState<string>("");
  const [sections, setSections] = useState<Section[]>([]);

  const handleThemeNext = (newTheme: string, newDocType: DocumentType, materials?: string) => {
    setTheme(newTheme);
    setDocType(newDocType);
    setSourceMaterials(materials || "");
    setCurrentStep(2);
  };

  const handleStructureNext = (newSections: Section[]) => {
    setSections(newSections);
    setCurrentStep(3);
  };

  const handleGenerationComplete = (generatedSections: Section[]) => {
    setSections(generatedSections);
    setCurrentStep(4);
  };

  const handleEditorNext = (editedSections: Section[]) => {
    setSections(editedSections);
    setCurrentStep(5);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto px-4">
          <StepIndicator steps={steps} currentStep={currentStep} />
          
          <div className="animate-in fade-in duration-500">
            {currentStep === 1 && <ThemeInput onNext={handleThemeNext} />}
            
            {currentStep === 2 && (
              <StructureEditor
                theme={theme}
                docType={docType}
                sourceMaterials={sourceMaterials}
                onNext={handleStructureNext}
                onBack={() => setCurrentStep(1)}
              />
            )}
            
            {currentStep === 3 && (
              <TextGeneration
                sections={sections}
                theme={theme}
                onComplete={handleGenerationComplete}
              />
            )}
            
            {currentStep === 4 && (
              <DocumentEditor
                sections={sections}
                onNext={handleEditorNext}
                onBack={() => setCurrentStep(2)}
              />
            )}
            
            {currentStep === 5 && (
              <TitlePage
                sections={sections}
                theme={theme}
                onBack={() => setCurrentStep(4)}
              />
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Generator;
