import { Link } from "react-router-dom";
import { FileText, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">DocuGen AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Профессиональная генерация документов с помощью искусственного интеллекта
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Продукт</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Как работает
                </Link>
              </li>
              <li>
                <Link to="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Преимущества
                </Link>
              </li>
              <li>
                <Link to="/generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Начать создание
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Поддержка</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Вопросы и ответы
                </Link>
              </li>
              <li>
                <a href="mailto:support@docugen.ai" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Связаться с нами
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Контакты</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a href="mailto:support@docugen.ai" className="hover:text-foreground transition-colors">
                support@docugen.ai
              </a>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          © 2025 DocuGen AI. Все права защищены.
        </div>
      </div>
    </footer>
  );
};
