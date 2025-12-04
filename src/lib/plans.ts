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
    amount: 0,
    currency: "RUB",
    type: "free",
    documentsLimit: 1,
    description: "Попробуйте платформу и сгенерируйте один документ с водяным знаком.",
    // Старые features (закомментировано для сохранения):
    // features: [
    //   "1 документ в месяц",
    //   "Оформление по ГОСТ",
    //   "Базовая проверка ссылок",
    //   "Водяной знак на выгрузке",
    // ],
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
    amount: 179, // Цена за статью, отчёт или курсовую работу
    currency: "RUB",
    type: "subscription",
    // period: "monthly", // Убрано, так как это цена за документ, а не подписка
    documentsLimit: 5,
    description: "179 ₽ за статью, отчёт или курсовую работу.",
    // Старые features (закомментировано для сохранения):
    // features: [
    //   "5 документов в месяц",
    //   "Генерация таблиц и графиков",
    //   "Документы без водяного знака",
    //   "Уведомления в Telegram о готовности",
    // ],
    features: [
      "Статья",
      "Отчёт",
      "Курсовая работа",
      "Оформление по ГОСТ",
    ],
    highlight: true,
    badge: "Популярный выбор",
  },
  {
    id: "premium",
    name: "Премиум",
    amount: 299, // Цена за дипломную работу
    currency: "RUB",
    type: "subscription",
    // period: "monthly", // Убрано, так как это цена за документ, а не подписка
    documentsLimit: null,
    description: "299 ₽ за дипломную работу.",
    // Старые features (закомментировано для сохранения):
    // features: [
    //   "Безлимит документов",
    //   "Приоритетная генерация",
    //   "Кастомные шаблоны и стили",
    //   "Персональная поддержка",
    // ],
    features: [
      "Дипломная работа",
      "Приоритетная генерация",
      "Кастомные шаблоны и стили",
      "Оформление по ГОСТ",
    ],
    badge: "Максимум возможностей",
  },
  {
    id: "single",
    name: "Разовый документ",
    amount: 99, // Цена за реферат
    currency: "RUB",
    type: "one-time",
    documentsLimit: 1,
    description: "99 ₽ за реферат.",
    // Старые features (закомментировано для сохранения):
    // features: [
    //   "1 документ без подписки",
    //   "Таблицы и графики включены",
    //   "Экспорт без водяного знака",
    //   "Доступ в течение 7 дней",
    // ],
    features: [
      "Реферат",
      "Таблицы и графики включены",
      "Экспорт без водяного знака",
      "Оформление по ГОСТ",
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

