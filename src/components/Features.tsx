import { Zap, ShieldCheck, LayoutDashboard, BellRing, Wallet } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "AI-генерация за минуты",
    description: "Полноценные курсовые, отчёты и презентации — без ручного форматирования и копирования.",
  },
  {
    icon: ShieldCheck,
    title: "Строго по ГОСТ",
    description: "Автоматические титульные листы, таблицы и список литературы в соответствии с российскими стандартами.",
  },
  {
    icon: LayoutDashboard,
    title: "DOCX с таблицами и графиками",
    description: "Готовые фигуры, подписи «Таблица N — ...» и диаграммы с реалистичными данными прямо внутри документа.",
  },
  {
    icon: BellRing,
    title: "Telegram-уведомления",
    description: "Узнавайте о готовности документов, статусе генерации и оплате прямо в Telegram.",
  },
  {
    icon: Wallet,
    title: "Официальные платежи",
    description: "Подписки и разовые документы через YooKassa с фискальными чеками и безопасной оплатой.",
  },
];

export const Features = () => {
  return (
    <section id="features" className="bg-secondary/30 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-4xl font-bold text-foreground md:text-5xl">Преимущества платформы</h2>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Всё необходимое для создания профессиональных документов и управления подпиской в одном месте.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex flex-col space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-7 w-7" />
                </div>
                
                <h3 className="text-xl font-bold text-card-foreground">{feature.title}</h3>
                
                <p className="leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
