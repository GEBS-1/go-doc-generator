import { FileText, Settings, Download } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Введите тему",
    description: "Опишите тему вашего документа в нескольких словах — AI поймёт контекст",
  },
  {
    icon: Settings,
    title: "Редактируйте структуру",
    description: "AI создаст структуру документа — вы можете изменить разделы и содержание",
  },
  {
    icon: Download,
    title: "Скачайте файл",
    description: "Получите готовый документ в формате .docx с оформлением по ГОСТ",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Как это работает
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Три простых шага от идеи до готового документа
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="relative group"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-xl rounded-full group-hover:opacity-30 transition-opacity" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-primary shadow-md group-hover:shadow-glow transition-all">
                    <step.icon className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-bold shadow-md">
                    {index + 1}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-foreground">
                  {step.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent -translate-x-1/2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
