import { useState } from "react";
import { Check, Shield, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, ApiError } from "@/lib/api";
import { subscriptionPlans, formatPlanAmount } from "@/lib/plans";
import { toast } from "sonner";

interface PaymentResponse {
  status: "activated" | "pending";
  confirmationUrl?: string | null;
}

export const Pricing = () => {
  const { user, token, promptLogin, refreshProfile, loading, isAuthenticated } = useAuth();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (!isAuthenticated) {
      promptLogin();
      return;
    }

    if (!token) {
      toast.error("Не удалось определить токен авторизации");
      return;
    }

    setProcessingPlan(planId);
    try {
      const response = await apiFetch<PaymentResponse>("/api/payments/create", {
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

  const activePlanId = user?.subscription?.planId;

  return (
    <section id="pricing" className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">
            Тарифы для любой нагрузки
          </Badge>
          <h2 className="text-3xl font-bold md:text-4xl">Выберите подходящий формат работы</h2>
          <p className="mt-4 text-muted-foreground">
            Пробуйте бесплатно, переходите на подписку, когда нужно больше отчётов, курсовых и презентаций.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {subscriptionPlans.map((plan) => {
            const isActive = plan.id === activePlanId && user?.subscription?.status === "active";
            const isProcessing = processingPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`flex flex-col justify-between ${plan.highlight ? "border-primary shadow-lg shadow-primary/10" : ""}`}
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    {plan.badge ? <Badge className="bg-primary/10 text-primary">{plan.badge}</Badge> : null}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{formatPlanAmount(plan.amount)}</span>
                    {plan.type === "subscription" && plan.period === "monthly" ? <span className="text-sm text-muted-foreground">в месяц</span> : null}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-1 h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                  <Button
                    variant={plan.highlight ? "default" : "secondary"}
                    className="w-full"
                    size="lg"
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading || isProcessing || isActive}
                  >
                    {isActive ? "Текущий тариф" : isProcessing ? "Создаём платёж…" : "Выбрать"}
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Платежи через YooKassa, чек приходит на почту.
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center md:flex-row md:gap-6">
          <Sparkles className="h-8 w-8 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Нужна корпоративная лицензия или безлимит для команды?</p>
            <p className="text-xs text-muted-foreground">Напишите нам на team@docugen.ai — подберём решение под задачи.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

