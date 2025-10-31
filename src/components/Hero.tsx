import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              AI-генерация за минуты
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              AI-документы за минуту
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Введите тему, получите структуру, доработайте и скачайте профессиональный Word-файл по ГОСТ!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/generator">
                <Button variant="hero" size="xl" className="w-full sm:w-auto group">
                  Начать бесплатно
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                Смотреть пример
              </Button>
            </div>
            
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span>Без регистрации</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span>По стандартам ГОСТ</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
            <img 
              src={heroImage} 
              alt="AI Document Generation Platform" 
              className="relative rounded-2xl shadow-lg w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
