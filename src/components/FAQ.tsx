import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Как работает AI-генерация документов?",
    answer: "Наш AI анализирует вашу тему, создаёт структуру документа на основе тысяч примеров, генерирует содержание для каждого раздела и оформляет всё в соответствии со стандартами ГОСТ.",
  },
  {
    question: "Нужно ли регистрироваться?",
    answer: "Да, для сохранения прогресса и доступа к подписке достаточно войти через Telegram или Google. Регистрация занимает менее 10 секунд и не требует пароля.",
  },
  {
    question: "Можно ли редактировать структуру документа?",
    answer: "Да, после генерации структуры вы можете добавлять, удалять или изменять разделы, редактировать названия и описания каждой части документа.",
  },
  {
    question: "Какие форматы документов поддерживаются?",
    answer: "На данный момент мы генерируем документы в формате .docx (Microsoft Word), который можно открыть в любом текстовом редакторе.",
  },
  {
    question: "Соответствуют ли документы стандартам ГОСТ?",
    answer: "Да, все документы автоматически оформляются по ГОСТу: правильные отступы, межстрочные интервалы, шрифты и структура титульного листа.",
  },
  {
    question: "Есть ли демо-версия или пробный период?",
    answer: "После входа доступен бесплатный тариф: один документ в месяц с водяным знаком. Подписка снимает ограничения, убирает водяные знаки и добавляет таблицы и графики.",
  },
  {
    question: "Как проходит оплата и выдаётся чек?",
    answer: "Платежи обрабатываются через YooKassa. После выбора тарифа вы переходите на защищённую страницу оплаты, а фискальный чек автоматически отправляется на почту.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Вопросы и ответы
          </h2>
          <p className="text-xl text-muted-foreground">
            Ответы на часто задаваемые вопросы
          </p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border rounded-lg px-6 bg-card"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
