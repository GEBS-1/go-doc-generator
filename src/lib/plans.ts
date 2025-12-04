export type PlanType = "free" | "subscription" | "one-time";

export interface SubscriptionPlan {
  id: "free" | "basic" | "premium" | "single";
  name: string;
  amount: number;
  currency: "RUB";
  type: PlanType;
  period?: "monthly";
  documentsLimit: number | null;
  description: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Бесплатный",
    // amount: 0, // старое значение
    amount: 0,
    currency: "RUB",
    type: "free",
    documentsLimit: 1,
    description: "Попробуйте платформу и сгенерируйте один документ с водяным знаком.",
    features: [
      "1 документ в месяц",
      "Оформление по ГОСТ",
      "Базовая проверка ссылок",
      "Водяной знак на выгрузке",
    ],
  },
  {
    id: "basic",
    name: "Базовый",
    // amount: 199, // старое значение
    amount: 179, // цена из DOCUMENT_PRICES (статья, отчёт, курсовая)
    currency: "RUB",
    type: "subscription",
    period: "monthly",
    documentsLimit: 5,
    description: "Для регулярной учебной нагрузки: таблицы, графики и чистый DOCX без водяных знаков.",
    features: [
      "5 документов в месяц",
      "Генерация таблиц и графиков",
      "Документы без водяного знака",
      "Уведомления в Telegram о готовности",
    ],
    highlight: true,
    badge: "Популярный выбор",
  },
  {
    id: "premium",
    name: "Премиум",
    // amount: 499, // старое значение
    amount: 299, // цена из DOCUMENT_PRICES (дипломная работа)
    currency: "RUB",
    type: "subscription",
    period: "monthly",
    documentsLimit: null,
    description: "Для активных студентов и авторов: безлимит, приоритет и гибкие шаблоны.",
    features: [
      "Безлимит документов",
      "Приоритетная генерация",
      "Кастомные шаблоны и стили",
      "Персональная поддержка",
    ],
    badge: "Максимум возможностей",
  },
  {
    id: "single",
    name: "Разовый документ",
    // amount: 99, // цена из DOCUMENT_PRICES (реферат)
    amount: 99,
    currency: "RUB",
    type: "one-time",
    documentsLimit: 1,
    description: "Нужно быстро один раз — оплачивайте по факту и получайте готовый файл.",
    features: [
      "1 документ без подписки",
      "Таблицы и графики включены",
      "Экспорт без водяного знака",
      "Доступ в течение 7 дней",
    ],
  },
];

export const formatPlanAmount = (amount: number, currency: "RUB" = "RUB") => {
  if (amount === 0) {
    return "0 ₽";
  }
  const formatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
};

