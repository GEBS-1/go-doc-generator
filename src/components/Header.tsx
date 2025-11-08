import { Link } from "react-router-dom";
import { useCallback } from "react";
import { Crown, FileText, LogOut, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

const getInitials = (name?: string | null) => {
  if (!name) {
    return "U";
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Header = () => {
  const { user, isAuthenticated, promptLogin, logout } = useAuth();

  const handleStartClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isAuthenticated) {
        event.preventDefault();
        promptLogin();
      }
    },
    [isAuthenticated, promptLogin],
  );

  const subscriptionBadge = user?.subscription
    ? user.subscription.planId === "premium"
      ? "Премиум"
      : user.subscription.planId === "basic"
        ? "Базовый"
        : user.subscription.planId === "single"
          ? "Разовый доступ"
          : "Бесплатный"
    : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">DocuGen AI</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Как работает
          </Link>
          <Link
            to="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Преимущества
          </Link>
          <Link
            to="/#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Тарифы
          </Link>
          <Link
            to="/#faq"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <Link to="/generator" onClick={handleStartClick}>
                <Button variant="default" size="sm" className="hidden md:inline-flex">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Создать документ
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium leading-tight">{user.name}</span>
                      {subscriptionBadge ? (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wider">
                          {subscriptionBadge}
                        </Badge>
                      ) : null}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">{user.name}</span>
                      {user.email ? <span className="text-xs text-muted-foreground">{user.email}</span> : null}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2">
                    <Crown className="h-4 w-4" />
                    {user.subscription?.status === "active"
                      ? `План: ${user.subscription.planName}`
                      : "План: не активен"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" disabled>
                    <Settings className="h-4 w-4" />
                    Настройки профиля (скоро)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={promptLogin}>
                Войти
              </Button>
              <Link to="/generator" onClick={handleStartClick}>
                <Button variant="default" size="sm">
                  Начать бесплатно
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
