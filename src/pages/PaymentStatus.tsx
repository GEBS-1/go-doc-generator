import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

const PaymentStatus = () => {
  const { state } = useParams<{ state: string }>();

  const { isSuccess, title, description, actionLabel, actionLink } = useMemo(() => {
    if (state === "success") {
      return {
        isSuccess: true,
        title: "Оплата успешно проведена",
        description:
          "Подписка активирована. Мы уже отправили чек на вашу почту и обновили доступ к документам.",
        actionLabel: "Перейти в генератор",
        actionLink: "/generator",
      };
    }

    return {
      isSuccess: false,
      title: "Оплата не завершена",
      description:
        "Кажется, платёж не прошёл. Проверьте данные карты или попробуйте ещё раз — мы сохранили ваш выбор тарифа.",
      actionLabel: "Вернуться к тарифам",
      actionLink: "/#pricing",
    };
  }, [state]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-muted/20 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl rounded-3xl border bg-background p-12 text-center shadow-lg">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isSuccess ? <CheckCircle2 className="h-12 w-12" /> : <XCircle className="h-12 w-12 text-destructive" />}
            </div>
            <h1 className="mb-4 text-3xl font-bold">{title}</h1>
            <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground">{description}</p>
            <div className="flex justify-center">
              <Button asChild size="lg">
                <Link to={actionLink}>{actionLabel}</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentStatus;

