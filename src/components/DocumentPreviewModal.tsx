import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { defaultTitleFields } from "@/lib/titleTemplate";
import type { Section } from "@/components/steps/TitlePage";

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleFields: {
    theme: string;
    documentType: string;
    year: string;
    university: string;
    faculty: string;
    department: string;
    direction: string;
    profile: string;
    author: string;
    group: string;
    supervisor: string;
    supervisorPosition: string;
    city: string;
  };
  sections: Section[];
  docTypeLabel: string;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  titleFields,
  sections,
  docTypeLabel,
}: DocumentPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Предпросмотр документа</DialogTitle>
          <DialogDescription>
            Просмотрите документ перед скачиванием
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6 min-h-0">
          <ScrollAreaPrimitive.Root className="h-full w-full overflow-hidden">
            <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
              <div className="space-y-8 pr-4 pb-4">
            {/* Титульный лист */}
            <div className="space-y-6 border-b pb-8">
              <h2 className="text-2xl font-bold">Титульный лист</h2>
              <div className="space-y-8 text-center border-2 border-dashed border-border p-8 rounded-lg bg-secondary/30">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {titleFields.university || defaultTitleFields.UNIVERSITY}
                  </p>
                  {titleFields.faculty && (
                    <p className="text-xs text-muted-foreground">{titleFields.faculty}</p>
                  )}
                  {titleFields.department && (
                    <p className="text-xs text-muted-foreground">{titleFields.department}</p>
                  )}
                  {titleFields.direction && (
                    <p className="text-xs text-muted-foreground">
                      Направление: {titleFields.direction}
                    </p>
                  )}
                  {titleFields.profile && (
                    <p className="text-xs text-muted-foreground">
                      Профиль: {titleFields.profile}
                    </p>
                  )}
                </div>

                <div className="space-y-4 py-8">
                  <p className="text-xs uppercase text-muted-foreground">{docTypeLabel}</p>
                  <p className="text-lg font-bold text-foreground">
                    {titleFields.theme ? `«${titleFields.theme}»` : "«Тема документа»"}
                  </p>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Автор: {titleFields.author || "ФИО автора"}</p>
                  {titleFields.group && <p>Группа: {titleFields.group}</p>}
                  {titleFields.supervisor && <p>Руководитель: {titleFields.supervisor}</p>}
                  {titleFields.supervisorPosition && <p>{titleFields.supervisorPosition}</p>}
                </div>

                <div className="pt-8">
                  <p className="text-sm text-muted-foreground">
                    {(titleFields.city || defaultTitleFields.CITY) + ", " +
                      (titleFields.year || new Date().getFullYear().toString())}
                  </p>
                </div>
              </div>
            </div>

            {/* Оглавление */}
            <div className="space-y-4 border-b pb-8">
              <h2 className="text-2xl font-bold">Содержание</h2>
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div key={section.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {section.title || `Раздел ${index + 1}`}
                    </span>
                    <span className="text-muted-foreground">...</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Разделы документа */}
            {sections.map((section, index) => (
              <div key={section.id} className="space-y-4 border-b pb-8 last:border-b-0">
                <h2 className="text-xl font-bold">
                  {section.title || `Раздел ${index + 1}`}
                </h2>
                {section.content && (
                  <div className="space-y-3 text-sm text-foreground whitespace-pre-wrap">
                    {section.content.split("\n\n").map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-justify">
                        {paragraph.trim() || "\u00A0"}
                      </p>
                    ))}
                  </div>
                )}

                {/* Таблицы */}
                {section.tables && section.tables.length > 0 && (
                  <div className="space-y-4">
                    {section.tables.map((table, tableIndex) => (
                      <div key={tableIndex} className="border rounded-lg overflow-hidden">
                        {table.title && (
                          <div className="bg-muted px-4 py-2 font-semibold text-sm">
                            {table.title}
                          </div>
                        )}
                        {table.headers && (
                          <div className="grid border-b">
                            <div
                              className="grid gap-0"
                              style={{ gridTemplateColumns: `repeat(${table.headers.length}, 1fr)` }}
                            >
                              {table.headers.map((header, hIndex) => (
                                <div
                                  key={hIndex}
                                  className="border-r last:border-r-0 p-2 font-semibold text-sm bg-muted/50"
                                >
                                  {header}
                                </div>
                              ))}
                            </div>
                            {table.rows &&
                              table.rows.map((row, rIndex) => (
                                <div
                                  key={rIndex}
                                  className="grid gap-0 border-t"
                                  style={{
                                    gridTemplateColumns: `repeat(${table.headers.length}, 1fr)`,
                                  }}
                                >
                                  {row.map((cell, cIndex) => (
                                    <div
                                      key={cIndex}
                                      className="border-r last:border-r-0 p-2 text-sm"
                                    >
                                      {cell}
                                    </div>
                                  ))}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Графики */}
                {section.charts && section.charts.length > 0 && (
                  <div className="space-y-4">
                    {section.charts.map((chart, chartIndex) => (
                      <div key={chartIndex} className="border rounded-lg p-4">
                        {chart.title && (
                          <div className="font-semibold text-sm mb-2">{chart.title}</div>
                        )}
                        <div className="text-muted-foreground text-sm italic">
                          [График: {chart.type}]
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
              </div>
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.Scrollbar
              orientation="vertical"
              className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
            >
              <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
            </ScrollAreaPrimitive.Scrollbar>
          </ScrollAreaPrimitive.Root>
        </div>
      </DialogContent>
    </Dialog>
  );
}


