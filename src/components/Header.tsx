import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">DocuGen AI</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Как работает
          </Link>
          <Link to="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Преимущества
          </Link>
          <Link to="/#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/generator">
            <Button variant="default" size="lg">
              Начать создание
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
