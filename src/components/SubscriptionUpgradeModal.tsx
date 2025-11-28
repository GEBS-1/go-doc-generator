import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, CreditCard, ArrowRight } from "lucide-react";
import { subscriptionPlans, formatPlanAmount } from "@/lib/plans";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaymentResponse {
  status: "activated" | "pending";
  confirmationUrl?: string | null;
}

interface SubscriptionUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanId?: string;
}

export function SubscriptionUpgradeModal({
  open,
  onOpenChange,
  currentPlanId,
}: SubscriptionUpgradeModalProps) {
  const { token, refreshProfile } = useAuth();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (!token) {
      toast.error("Не удалось определить токен авторизации");
      return;
    }

    setProcessingPlan(planId);
    try {
      const response = await apiFetch<PaymentResponse>("/api/payments/create", {
        method: "POST",
        token,
        body: JSON.stringify({ planId }),
      });

      if (response.status === "activated") {
        toast.success("Подписка активирована");
        await refreshProfile();
        onOpenChange(false);
        return;
      }

      if (response.confirmationUrl) {
        window.open(response.confirmationUrl, "_blank", "noopener,noreferrer");
        toast.info("Оплата откроется в новой вкладке YooKassa");
        onOpenChange(false);
      } else {
        toast.message("Платёж создан", {
          description: "Перейдите по ссылке YooKassa для завершения оплаты.",
        });
      }
    } catch (error) {
      console.error("Failed to create payment:", error);
      if (error instanceof ApiError) {
        toast.error(error.message || "Не удалось оформить подписку");
      } else {
        toast.error("Не удалось оформить подписку");
      }
    } finally {
      setProcessingPlan(null);
    }
  };

  // Показываем только платные планы, которые выше текущего
  const availablePlans = subscriptionPlans.filter((plan) => {
    if (plan.id === currentPlanId) return false;
    if (plan.amount === 0) return false; // Не показываем бесплатный
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Обновить подписку</DialogTitle>
          <DialogDescription>
            Превышен лимит документов для вашего текущего тарифа. Выберите подходящий план для продолжения работы.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {availablePlans.map((plan) => {
            const isProcessing = processingPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`flex flex-col ${plan.highlight ? "border-primary shadow-lg shadow-primary/10" : ""}`}
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                    {plan.badge && (
                      <Badge className="bg-primary/10 text-primary">{plan.badge}</Badge>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{formatPlanAmount(plan.amount)}</span>
                    {plan.type === "subscription" && (
                      <span className="text-sm text-muted-foreground">в месяц</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isProcessing}
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Выбрать план
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

