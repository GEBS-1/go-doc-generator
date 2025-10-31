import { Zap, Shield, Layout, Database } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Быстрая генерация",
    description: "Создайте полноценный документ за несколько минут вместо часов ручной работы",
  },
  {
    icon: Shield,
    title: "Соответствие ГОСТ",
    description: "Автоматическое оформление по стандартам ГОСТ для академических и деловых документов",
  },
  {
    icon: Layout,
    title: "Готовые шаблоны",
    description: "Библиотека профессиональных шаблонов для различных типов документов",
  },
  {
    icon: Database,
    title: "База знаний",
    description: "AI обучен на тысячах примеров качественных документов и научных работ",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-20 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Преимущества платформы
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Всё необходимое для создания профессиональных документов
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all">
                  <feature.icon className="h-7 w-7" />
                </div>
                
                <h3 className="text-xl font-bold text-card-foreground">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
