import { useState, useEffect } from "react";
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
import { Loader2, CreditCard } from "lucide-react";

interface TokenUsage {
  id: number;
  documentId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costRub: number;
  createdAt: string;
}

interface UnpaidTokensResponse {
  unpaidTokens: TokenUsage[];
  summary: {
    totalCost: number;
    totalTokens: number;
    count: number;
  };
}

interface TokenPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unpaidTokens?: {
    cost: number;
    count: number;
  } | null;
}

export function TokenPaymentModal({
  open,
  onOpenChange,
  unpaidTokens: initialUnpaidTokens,
}: TokenPaymentModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unpaidTokens, setUnpaidTokens] = useState<UnpaidTokensResponse | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open && token) {
      loadUnpaidTokens();
    }
  }, [open, token]);

  const loadUnpaidTokens = async () => {
    if (!token) return;

    setLoadingTokens(true);
    try {
      const data = await apiFetch<UnpaidTokensResponse>("/api/tokens/unpaid", {
        method: "GET",
        token,
      });
      setUnpaidTokens(data);
    } catch (error) {
      console.error("Failed to load unpaid tokens:", error);
      toast.error("Не удалось загрузить неоплаченные токены");
    } finally {
      setLoadingTokens(false);
    }
  };

  const handlePay = async () => {
    if (!token) return;

    setProcessing(true);
    try {
      const response = await apiFetch<{
        paymentId: string;
        confirmationUrl: string;
        amount: number;
        tokenCount: number;
      }>("/api/payments/create-tokens", {
        method: "POST",
        token,
        body: JSON.stringify({}),
      });

      if (response.confirmationUrl) {
        // Открываем страницу оплаты в новом окне
        window.open(response.confirmationUrl, "_blank");
        toast.success("Перенаправление на страницу оплаты...");
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to create payment:", error);
      if (error instanceof ApiError) {
        toast.error(error.message || "Не удалось создать платеж");
      } else {
        toast.error("Не удалось создать платеж");
      }
    } finally {
      setProcessing(false);
    }
  };

  const summary = unpaidTokens?.summary || initialUnpaidTokens;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Оплата токенов</DialogTitle>
          <DialogDescription>
            У вас есть неоплаченные токены, использованные при генерации документов.
            Для скачивания документа необходимо произвести оплату.
          </DialogDescription>
        </DialogHeader>

        {loadingTokens ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {summary && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Количество токенов:</span>
                    <span className="text-sm font-semibold">
                      {unpaidTokens?.summary?.totalTokens.toLocaleString("ru-RU") || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Количество документов:</span>
                    <span className="text-sm font-semibold">
                      {summary.count || unpaidTokens?.summary?.count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-base font-semibold">К оплате:</span>
                    <span className="text-lg font-bold text-primary">
                      {summary.cost?.toFixed(2) ||
                        unpaidTokens?.summary?.totalCost.toFixed(2) ||
                        "0.00"}{" "}
                      ₽
                    </span>
                  </div>
                </div>
              </div>
            )}

            {unpaidTokens && unpaidTokens.unpaidTokens.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto rounded-lg border">
                <div className="divide-y">
                  {unpaidTokens.unpaidTokens.map((tokenUsage) => (
                    <div key={tokenUsage.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {new Date(tokenUsage.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                        <span className="font-medium">{tokenUsage.costRub.toFixed(2)} ₽</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {tokenUsage.totalTokens.toLocaleString("ru-RU")} токенов
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              💡 После оплаты вы сможете скачать документ. Оплата производится через
              YooKassa.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Отмена
          </Button>
          <Button
            onClick={handlePay}
            disabled={processing || loadingTokens || !summary || (summary.cost || 0) <= 0}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создание платежа...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Оплатить{" "}
                {summary?.cost?.toFixed(2) ||
                  unpaidTokens?.summary?.totalCost.toFixed(2) ||
                  "0.00"}{" "}
                ₽
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

