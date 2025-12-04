import { Link } from "react-router-dom";
import { useCallback, useState } from "react";
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { subscriptionPlans, formatPlanAmount } from "@/lib/plans";
import { apiFetch, ApiError } from "@/lib/api";
import { toast } from "sonner";

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
  const { user, isAuthenticated, promptLogin, logout, token, refreshProfile } = useAuth();
  const authRequired = import.meta.env.VITE_REQUIRE_AUTH !== "false";
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  
  // Отладка для проверки переменных окружения
  if (typeof window !== 'undefined') {
    console.log('[Header] Environment check:', {
      VITE_REQUIRE_AUTH: import.meta.env.VITE_REQUIRE_AUTH,
      authRequired,
      VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
      isAuthenticated,
      hasUser: !!user,
    });
  }

  const handleStartClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (authRequired && !isAuthenticated) {
        event.preventDefault();
        promptLogin();
      }
    },
    [authRequired, isAuthenticated, promptLogin],
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

  const handleSelectPlan = async (planId: string) => {
    if (!token) {
      toast.error("Не удалось определить токен авторизации");
      return;
    }

    setProcessingPlan(planId);
    try {
      const response = await apiFetch<{
        status: "activated" | "pending";
        confirmationUrl?: string | null;
      }>("/api/payments/create", {
        method: "POST",
        token,
        body: { planId },
      });

      if (response.status === "activated") {
        toast.success("Подписка активирована");
        await refreshProfile();
        return;
      }

      if (response.confirmationUrl) {
        window.open(response.confirmationUrl, "_blank", "noopener,noreferrer");
        toast.info("Оплата откроется в новой вкладке YooKassa");
      } else {
        toast.message("Платёж создан", {
          description: "Перейдите по ссылке YooKassa для завершения оплаты.",
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Не удалось оформить подписку");
      }
    } finally {
      setProcessingPlan(null);
    }
  };

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
              <Link to="/generator" onClick={authRequired ? handleStartClick : undefined}>
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
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                      <Crown className="h-4 w-4" />
                      {user.subscription?.status === "active"
                        ? `План: ${user.subscription.planName}`
                        : "План: не активен"}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {subscriptionPlans.map((plan) => {
                        const isActive = plan.id === user?.subscription?.planId && user?.subscription?.status === "active";
                        const isProcessing = processingPlan === plan.id;
                        
                        return (
                          <DropdownMenuItem
                            key={plan.id}
                            onClick={() => handleSelectPlan(plan.id)}
                            disabled={isActive || isProcessing}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col">
                                <span className="font-medium">{plan.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPlanAmount(plan.amount)}
                                </span>
                              </div>
                              {isActive && (
                                <Badge variant="secondary" className="text-xs">Активен</Badge>
                              )}
                              {isProcessing && (
                                <Badge variant="outline" className="text-xs">Обработка...</Badge>
                              )}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
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
              {/* Всегда показываем кнопку "Войти" если требуется авторизация */}
              {authRequired && (
                <Button variant="ghost" size="sm" onClick={promptLogin}>
                  Войти
                </Button>
              )}
              <Link to="/generator" onClick={authRequired ? handleStartClick : undefined}>
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
