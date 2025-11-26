import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, SectionType, Table, TableRow, TableCell, WidthType, ImageRun, Footer, PageNumber, Header, LevelFormat } from "docx";
import { saveAs } from "file-saver";
import { TableData, ChartData } from "@/lib/gigachat";
import { chartToImage } from "@/lib/chartUtils";
import { renderTitleTemplate, defaultTitleFields, TitleTemplateData } from "@/lib/titleTemplate";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const DOC_TYPE_OPTIONS = [
  { value: "essay", label: "Реферат", templateValue: "РЕФЕРАТ" },
  { value: "courseWork", label: "Курсовая работа", templateValue: "КУРСОВАЯ РАБОТА" },
  {
    value: "diploma",
    label: "Выпускная квалификационная работа",
    templateValue: "ВЫПУСКНАЯ КВАЛИФИКАЦИОННАЯ РАБОТА",
  },
  { value: "article", label: "Научная статья", templateValue: "НАУЧНАЯ СТАТЬЯ" },
  { value: "report", label: "Отчёт", templateValue: "ОТЧЁТ" },
] as const;

type DocTypeOption = (typeof DOC_TYPE_OPTIONS)[number];
type DocTypeValue = DocTypeOption["value"];

interface Section {
  id: string;
  title: string;
  content?: string;
  description?: string;
  tables?: TableData[];
  charts?: ChartData[];
}

interface SubscriptionUsage {
  planId: string;
  planName: string;
  type: string | null;
  status: string;
  docsGenerated: number;
  docsLimit: number | null;
  resetDate: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
}

interface ConsumeResponse {
  allowed: boolean;
  subscription: SubscriptionUsage | null;
}

interface TitlePageProps {
  sections: Section[];
  theme: string;
  onBack: () => void;
}

export const TitlePage = ({ sections, theme, onBack }: TitlePageProps) => {
  const { token, refreshProfile } = useAuth();
  const authRequired = import.meta.env.VITE_REQUIRE_AUTH !== "false";
  const [titleFields, setTitleFields] = useState<{
    theme: string;
    documentType: DocTypeValue;
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
  }>({
    theme: theme || "",
    documentType: "courseWork",
    year: new Date().getFullYear().toString(),
    university: defaultTitleFields.UNIVERSITY,
    faculty: defaultTitleFields.FACULTY,
    department: defaultTitleFields.DEPARTMENT,
    direction: defaultTitleFields.DIRECTION,
    profile: defaultTitleFields.PROFILE,
    author: "",
    group: defaultTitleFields.GROUP,
    supervisor: defaultTitleFields.SUPERVISOR,
    supervisorPosition: defaultTitleFields.SUPERVISOR_POSITION,
    city: defaultTitleFields.CITY,
  });
  const formatUsageDescription = (usage?: SubscriptionUsage | null) => {
    if (!usage || usage.docsLimit == null) {
      return undefined;
    }

    const remaining = Math.max(usage.docsLimit - usage.docsGenerated, 0);
    const resetLabel = usage.resetDate
      ? new Date(usage.resetDate).toLocaleDateString("ru-RU")
      : "обновления лимита";

    return `Осталось ${remaining} из ${usage.docsLimit} документов до ${resetLabel}.`;
  };
  const mapQuotaErrorMessage = (code?: string) => {
    switch (code) {
      case "limit_exceeded":
        return "Превышен лимит документов для текущего тарифа";
      case "no_subscription":
        return "Не найдена активная подписка. Обновите страницу или войдите снова.";
      default:
        return "Не удалось проверить лимит документов";
    }
  };
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const selectedDocType =
    DOC_TYPE_OPTIONS.find((option) => option.value === titleFields.documentType) ?? DOC_TYPE_OPTIONS[0];

  // Функция для конвертации base64 в Uint8Array для docx
  const base64ToUint8Array = (base64: string): Uint8Array => {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const buildFallbackTitlePage = (data: TitleTemplateData): Paragraph[] => {
    const paragraphs: Paragraph[] = [];

    const pushCentered = (
      text: string | undefined,
      options: { size?: number; bold?: boolean; spacingAfter?: number } = {},
    ) => {
      if (!text) {
        return;
      }
      const { size = 28, bold = false, spacingAfter = 200 } = options;
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: spacingAfter },
          children: [
            new TextRun({
              text,
              size,
              bold,
              font: "Times New Roman",
              color: "000000",
            }),
          ],
        }),
      );
    };

    const pushLeft = (
      text: string | undefined,
      options: { spacingAfter?: number; size?: number } = {},
    ) => {
      if (!text) {
        return;
      }
      const { spacingAfter = 200, size = 24 } = options;
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: spacingAfter },
          children: [
            new TextRun({
              text,
              size,
              font: "Times New Roman",
              color: "000000",
            }),
          ],
        }),
      );
    };

    pushCentered("МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ", { bold: true, spacingAfter: 80 });
    pushCentered("РОССИЙСКОЙ ФЕДЕРАЦИИ", { bold: true, spacingAfter: 160 });
    pushCentered(data.UNIVERSITY, { spacingAfter: 80 });
    pushCentered(data.FACULTY, { spacingAfter: 80, size: 26 });
    pushCentered(data.DEPARTMENT, { spacingAfter: 200, size: 26 });
    pushCentered(data.DIRECTION, { spacingAfter: 120, size: 24 });
    pushCentered(data.PROFILE, { spacingAfter: 320, size: 24 });
    pushCentered(data.DOC_TYPE, { bold: true, spacingAfter: 320 });
    pushCentered(`«${data.THEME}»`, { bold: true, spacingAfter: 400 });

    pushLeft(data.AUTHOR_LINE ?? (data.AUTHOR ? `Выполнил: ${data.AUTHOR}` : undefined), {
      spacingAfter: 80,
      size: 26,
    });
    pushLeft(data.GROUP_LINE ?? (data.GROUP ? `Группа: ${data.GROUP}` : undefined), {
      spacingAfter: 160,
    });
    pushLeft(
      data.SUPERVISOR_LINE ?? (data.SUPERVISOR ? `Руководитель: ${data.SUPERVISOR}` : undefined),
      { spacingAfter: 80 },
    );
    pushLeft(
      data.SUPERVISOR_POSITION_LINE ?? data.SUPERVISOR_POSITION,
      { spacingAfter: 160 },
    );
    pushLeft(
      data.DIRECTION_LINE ?? (data.DIRECTION ? `Направление подготовки: ${data.DIRECTION}` : undefined),
      { spacingAfter: 120 },
    );
    pushLeft(
      data.PROFILE_LINE ?? (data.PROFILE ? `Профиль: ${data.PROFILE}` : undefined),
      { spacingAfter: 220 },
    );

    const locationLine = data.LOCATION_LINE ?? [data.CITY, data.YEAR].filter(Boolean).join(", ");
    if (locationLine) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: locationLine,
              size: 26,
              font: "Times New Roman",
              color: "000000",
            }),
          ],
        }),
      );
    }

    return paragraphs;
  };

  // Функция для создания таблицы из TableData
  const createTableFromData = (tableData: TableData): Table => {
    const rows: TableRow[] = [];

    // Заголовки
    const headerRow = new TableRow({
      children: tableData.headers.map(header =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: header, bold: true, color: "000000" })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: {
            fill: "D3D3D3",
          },
        })
      ),
    });
    rows.push(headerRow);

    // Данные
    tableData.rows.forEach(row => {
      const dataRow = new TableRow({
        children: row.map(cell =>
          new TableCell({
            children: [
              new Paragraph({
              children: [new TextRun({ text: cell, color: "000000" })],
              }),
            ],
          })
        ),
      });
      rows.push(dataRow);
    });

    return new Table({
      rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
    });
  };

  // Функция для создания изображения из графика
  const createImageFromChart = async (chartData: ChartData): Promise<ImageRun> => {
    const imageBase64 = await chartToImage(chartData);
    const imageData = base64ToUint8Array(imageBase64);
    
    // docx работает с Uint8Array в браузере
    // В Node.js можно использовать Buffer, но в браузере используем Uint8Array
    return new ImageRun({
      data: imageData,
      transformation: {
        width: 600,
        height: 400,
      },
    } as any);
  };

  const generateDocxDocument = async () => {
    let preCheckUsage: SubscriptionUsage | null = null;
    let postConsumeUsage: SubscriptionUsage | null = null;
    const quotaEnabled = authRequired && Boolean(token);

    try {
      if (!titleFields.theme.trim() || !titleFields.author.trim()) {
        toast.error("Заполните тему и автора");
        return;
      }

      if (authRequired && !token) {
        toast.error("Не удалось подтвердить авторизацию. Войдите снова.");
        return;
      }

      if (quotaEnabled) {
        try {
          const response = await apiFetch<ConsumeResponse>("/api/subscription/consume", {
            method: "POST",
            token,
            body: JSON.stringify({ consume: false }),
          });
          preCheckUsage = response.subscription ?? null;
        } catch (quotaError) {
          if (quotaError instanceof ApiError) {
            const errorData =
              (quotaError.data as { error?: string; subscription?: SubscriptionUsage | null }) || undefined;
            const errorCode =
              typeof errorData?.error === "string" ? errorData.error : undefined;
            toast.error(mapQuotaErrorMessage(errorCode), {
              description: formatUsageDescription(errorData?.subscription ?? null),
            });
          } else if (quotaError instanceof Error) {
            toast.error("Не удалось проверить лимит документов", {
              description: quotaError.message,
            });
          } else {
            toast.error("Не удалось проверить лимит документов");
          }
          return;
        }
      }

      toast.loading("Создание документа...");

      const docTypeConfig =
        DOC_TYPE_OPTIONS.find((option) => option.value === titleFields.documentType) ?? DOC_TYPE_OPTIONS[0];

      const normalizedYear =
        titleFields.year && titleFields.year.trim().length > 0
          ? titleFields.year.trim()
          : new Date().getFullYear().toString();

      const normalizedCity =
        titleFields.city && titleFields.city.trim().length > 0
          ? titleFields.city.trim()
          : defaultTitleFields.CITY;

      const templateData: TitleTemplateData = {
        THEME: titleFields.theme.trim(),
        DOC_TYPE: docTypeConfig.templateValue,
        YEAR: normalizedYear,
        UNIVERSITY: titleFields.university?.trim() || defaultTitleFields.UNIVERSITY,
        FACULTY: titleFields.faculty?.trim() || defaultTitleFields.FACULTY,
        DEPARTMENT: titleFields.department?.trim() || defaultTitleFields.DEPARTMENT,
        DIRECTION: titleFields.direction?.trim() || defaultTitleFields.DIRECTION,
        PROFILE: titleFields.profile?.trim() || defaultTitleFields.PROFILE,
        AUTHOR: titleFields.author.trim(),
        GROUP: titleFields.group?.trim() || "",
        SUPERVISOR: titleFields.supervisor?.trim() || "",
        SUPERVISOR_POSITION: titleFields.supervisorPosition?.trim() || "",
        CITY: normalizedCity,
        AUTHOR_LINE: `Выполнил: ${titleFields.author.trim()}`,
        GROUP_LINE: titleFields.group?.trim() ? `Группа: ${titleFields.group.trim()}` : "",
        SUPERVISOR_LINE: titleFields.supervisor?.trim()
          ? `Руководитель: ${titleFields.supervisor.trim()}`
          : "",
        SUPERVISOR_POSITION_LINE: titleFields.supervisorPosition?.trim() || "",
        DIRECTION_LINE: titleFields.direction?.trim()
          ? `Направление подготовки: ${titleFields.direction.trim()}`
          : defaultTitleFields.DIRECTION
          ? `Направление подготовки: ${defaultTitleFields.DIRECTION}`
          : "",
        PROFILE_LINE: titleFields.profile?.trim()
          ? `Профиль: ${titleFields.profile.trim()}`
          : defaultTitleFields.PROFILE
          ? `Профиль: ${defaultTitleFields.PROFILE}`
          : "",
        LOCATION_LINE: [normalizedCity, normalizedYear].filter(Boolean).join(", "),
      };

      let titlePageContent: Paragraph[];

      if (templateFile) {
        try {
          const buffer = await templateFile.arrayBuffer();
          titlePageContent = await renderTitleTemplate(templateData, buffer);
        } catch (templateError) {
          console.error("Title template render error", templateError);
          toast.error("Не удалось применить загруженный шаблон титульного листа.", {
            description: "Проверьте, что каждый плейсхолдер вида {{FIELD}} встречается только один раз и не разбит на части.",
          });
          titlePageContent = buildFallbackTitlePage(templateData);
        }
      } else {
        titlePageContent = buildFallbackTitlePage(templateData);
      }

      const numberingConfigs: any[] = [];
      let bulletListCounter = 0;
      let numberedListCounter = 0;

      const createBulletList = (items: string[]): Paragraph[] => {
        bulletListCounter += 1;
        const reference = `custom-bullet-${bulletListCounter}`;
        numberingConfigs.push({
          reference,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        });

        return items.map((item) =>
          new Paragraph({
            children: [
              new TextRun({
                text: item,
                font: "Times New Roman",
                size: 28,
                color: "000000",
              }),
            ],
            numbering: { reference, level: 0 },
            spacing: { after: 200, line: 360 },
          })
        );
      };

      const createNumberedList = (items: string[]): Paragraph[] => {
        numberedListCounter += 1;
        const reference = `custom-numbered-${numberedListCounter}`;
        numberingConfigs.push({
          reference,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        });

        return items.map((item) =>
          new Paragraph({
            children: [
              new TextRun({
                text: item,
                font: "Times New Roman",
                size: 28,
                color: "000000",
              }),
            ],
            numbering: { reference, level: 0 },
            spacing: { after: 200, line: 360 },
          })
        );
      };

      const citationMapping = new Map<string, number>();
      const citationNumbers = new Set<number>();
      let generatedCitationCounter = 0;
      const ensureCitationNumber = (original: string): number => {
        const numeric = Number(original);
        if (Number.isFinite(numeric) && numeric > 0) {
          citationNumbers.add(numeric);
          return numeric;
        }

        if (!citationMapping.has(original)) {
          generatedCitationCounter += 1;
          citationMapping.set(original, generatedCitationCounter);
          citationNumbers.add(generatedCitationCounter);
        }
        return citationMapping.get(original)!;
      };

      const bibliographyEntries = new Map<string, string>();
      let bibliographyAutoKey = 0;
      let bibliographyInsertIndex: number | null = null;
      let bibliographySectionTitle: string | null = null;

      // Prepare table of contents
      const tableOfContents: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({
              text: "Содержание",
              font: "Times New Roman",
              size: 32,
              bold: true,
              color: "000000",
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 800, after: 400 },
        })
      ];

      let tocSectionNumber = 0;
      sections.forEach((section) => {
        const titleLower = (section.title || '').toLowerCase();
        const isBibliographySection = titleLower.includes('литератур') ||
          titleLower.includes('источники') ||
          titleLower.includes('библиография');

        if (isBibliographySection) {
          return;
        }

        tocSectionNumber += 1;

        tableOfContents.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${tocSectionNumber}. ${section.title}`,
                font: "Times New Roman",
                size: 28,
                color: "000000",
              }),
            ],
            spacing: { after: 200 },
          })
        );
      });

      // Prepare document sections (может содержать Paragraph и Table)
      const documentSections: (Paragraph | Table)[] = [];

      // Глобальные счётчики для таблиц и рисунков
      let tableCounter = 0;
      let figureCounter = 0;

      let visibleSectionNumber = 0;

      // Add each section with its content
      for (let index = 0; index < sections.length; index++) {
        const section = sections[index];
        const titleLower = (section.title || '').toLowerCase();
        const isBibliography = titleLower.includes('литератур') ||
          titleLower.includes('источники') ||
          titleLower.includes('библиография');

        if (!isBibliography) {
          visibleSectionNumber += 1;
          const sectionNumber = visibleSectionNumber;
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${sectionNumber}. ${section.title}`,
                  font: "Times New Roman",
                  size: 32,
                  color: "000000",
                  bold: true,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            })
          );
        }

        // Section content
        if (section.content) {
          if (isBibliography) {
            bibliographyInsertIndex = bibliographyInsertIndex ?? documentSections.length;
            bibliographySectionTitle = "Список литературы";

            const sources = section.content
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line.length > 0);

            sources.forEach((sourceLine) => {
              const cleaned = sourceLine
                .replace(/^[-*+]{1,2}\s*/, '')
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/[|]/g, ' ')
                .trim();

              if (cleaned.length < 5) {
                return;
              }

              const hasYear = /(1[89]\d{2}|20\d{2}|21\d{2})/.test(cleaned);
              const endsWithTerminal = /[.;)]$/.test(cleaned);
              const looksLikeReference = hasYear && endsWithTerminal;
              const isWater = cleaned.length > 320 || /^(Рассмотрим|Важно|Следует|Необходимо|В данном|Для составления|Таким образом)/i.test(cleaned);

              if (/^(\s*\[\d+\][^[]+)+\s*$/.test(cleaned)) {
                const bracketEntries = cleaned.match(/\[(\d+)\]\s*([^[]+)/g) || [];
                bracketEntries.forEach((entry) => {
                  const bracketMatch = entry.match(/\[(\d+)\]\s*([^[]+)/);
                  if (!bracketMatch) {
                    return;
                  }
                  const assignedKey = String(ensureCitationNumber(bracketMatch[1]));
                  const entryValue = bracketMatch[2].trim().replace(/^[-–—\.:\s]+/, '');
                  if (entryValue) {
                    bibliographyEntries.set(assignedKey, entryValue);
                  }
                });
                return;
              }

              const numberedMatch = cleaned.match(/^(\d+)(?:[\.)]|\s+)\s*(.+)$/);
              if (numberedMatch) {
                const assignedKey = String(ensureCitationNumber(numberedMatch[1]));
                const entryText = numberedMatch[2].trim();
                if (entryText) {
                  bibliographyEntries.set(assignedKey, entryText);
                }
                return;
              }

              const bracketLeadingMatch = cleaned.match(/^\[(\d+)\]\s*(.+)$/);
              if (bracketLeadingMatch) {
                const assignedKey = String(ensureCitationNumber(bracketLeadingMatch[1]));
                const entryText = bracketLeadingMatch[2].trim();
                if (entryText) {
                  bibliographyEntries.set(assignedKey, entryText);
                }
                return;
              }

              if (/https?:\/\//i.test(cleaned) && !isWater) {
                const generatedKey = `auto-${++bibliographyAutoKey}`;
                const assignedKey = String(ensureCitationNumber(generatedKey));
                if (!bibliographyEntries.has(assignedKey)) {
                  bibliographyEntries.set(assignedKey, cleaned);
                }
      return;
    }

              if (looksLikeReference && !isWater) {
                const generatedKey = `auto-${++bibliographyAutoKey}`;
                const assignedKey = String(ensureCitationNumber(generatedKey));
                if (!bibliographyEntries.has(assignedKey)) {
                  bibliographyEntries.set(assignedKey, cleaned);
                }
              }
            });

            continue;
          }

          const rawParagraphBlocks = section.content
            .split(/\n\s*\n/)
            .map((block) => block.trim())
            .filter((block) => block.length > 0);

          let pendingTableTitle: string | null = null;
          const standaloneSectionHeadingPattern = /^(?:введение|основная часть|заключение)(?:[:.]?)$/i;

          for (let paraIndex = 0; paraIndex < rawParagraphBlocks.length; paraIndex++) {
            const rawBlock = rawParagraphBlocks[paraIndex];
            const originalLines = rawBlock
              .split(/\n+/)
              .map((line) => line.trim())
              .filter((line) => line.length > 0);

            if (originalLines.length === 0) {
              continue;
            }

            if (/^ссылки[:]?/i.test(originalLines[0])) {
              pendingTableTitle = null;
              continue;
            }

            const firstLineMatch = originalLines[0].match(/^таблица\s*\d+\.?\s*(.*)$/i);
            if (firstLineMatch) {
              pendingTableTitle = firstLineMatch[1].trim() || null;
              originalLines.shift();
              if (originalLines.length === 0) {
                continue;
              }
            }

            const cleanedLines = originalLines.map((line) =>
              line
                .replace(/^#{1,6}\s+/, '')
                .replace(/\*\*(.+?)\*\*/g, '$1')
                .replace(/\*(.+?)\*/g, '$1')
                .replace(/^>\s+/, '')
            );

            const lines = cleanedLines
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
              .filter((line) => !standaloneSectionHeadingPattern.test(line));

            if (lines.length === 0) {
              continue;
            }

            const isBulletList = lines.every((line) => /^[-*•]\s+/.test(line));
            const isNumberedList = lines.every((line) => /^\d+[\.)]\s+/.test(line));
            const isAsciiTable = lines.some((line) => /\|/.test(line)) && lines.filter((line) => !/^[-+\s|]+$/.test(line)).length >= 2;

            if (isBulletList) {
              const items = lines
                .map((line) => line.replace(/^[-*•]\s+/, '').trim())
                .map((item) => item.replace(/\[(\d+)\]/g, (_, num: string) => `[${ensureCitationNumber(num)}]`));

              const bulletParagraphs = createBulletList(items);
              bulletParagraphs.forEach((p) => documentSections.push(p));
              pendingTableTitle = null;
              continue;
            }

            if (isNumberedList) {
              const items = lines
                .map((line) => line.replace(/^\d+[\.)]\s+/, '').trim())
                .map((item) => item.replace(/\[(\d+)\]/g, (_, num: string) => `[${ensureCitationNumber(num)}]`));

              const numberedParagraphs = createNumberedList(items);
              numberedParagraphs.forEach((p) => documentSections.push(p));
              pendingTableTitle = null;
              continue;
            }

            if (isAsciiTable) {
              const tableRows = lines
                .filter((line) => !/^[-+\s|]+$/.test(line))
                .map((line) =>
                  line
                    .replace(/^\|/, '')
                    .replace(/\|$/, '')
                    .split(/\|/)
                    .map((cell) =>
                      cell
                        .replace(/\[(\d+)\]/g, (_, num: string) => `[${ensureCitationNumber(num)}]`)
                        .replace(/\s{2,}/g, ' ')
                        .trim()
                    )
                )
                .filter((row) => row.some((cell) => cell.length > 0));

              if (tableRows.length >= 2) {
                tableCounter += 1;
                const headers = tableRows[0];
                const dataRows = tableRows.slice(1);

                const baseTitle = pendingTableTitle || '';
                const normalizedTitle = baseTitle.replace(/^(таблица|table)\s*\d+\.?\s*/i, '').trim();
                const titleSuffix = normalizedTitle || baseTitle || `Описание таблицы ${tableCounter}`;
                const finalTitle = titleSuffix ? `Таблица ${tableCounter} – ${titleSuffix}` : `Таблица ${tableCounter}`;

                documentSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: finalTitle,
                        font: "Times New Roman",
                        size: 28,
                        color: "000000",
                      }),
                    ],
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 400, after: 200 },
                  })
                );

                const asciiTable = createTableFromData({
                  type: "comparative",
                  headers,
                  rows: dataRows,
                  title: finalTitle,
                });

                documentSections.push(asciiTable);

                pendingTableTitle = null;
                continue;
              }
            }

            if (/^(\s*\[\d+\][^[]+)+\s*$/.test(rawBlock)) {
              const inlineSources = rawBlock.match(/\[(\d+)\][^[]+/g) || [];
              inlineSources.forEach((source) => {
                const sourceMatch = source.match(/\[(\d+)\]\s*(.+)/);
                if (!sourceMatch) {
                  return;
                }
                const assignedKey = String(ensureCitationNumber(sourceMatch[1]));
                const entry = sourceMatch[2].trim().replace(/^[-–—\.:\s]+/, '');
                if (entry && !bibliographyEntries.has(assignedKey)) {
                  bibliographyEntries.set(assignedKey, entry);
                }
              });
              pendingTableTitle = null;
              continue;
            }

            const paragraphText = lines
              .join(' ')
              .replace(/\s{2,}/g, ' ')
              .replace(/\s*Таблица\s*(\d+)\s*-?\s*(?=Таблица\s*\d+)/gi, '')
              .replace(/Таблица\s*(\d+)\s*-?\s*(Таблица\s*\d+)/gi, '$2')
              .replace(/\[(\d+)\]/g, (_, num: string) => `[${ensureCitationNumber(num)}]`);

            documentSections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: paragraphText,
                    font: "Times New Roman",
                    size: 28,
                    color: "000000",
                  }),
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: {
                  after: paraIndex < rawParagraphBlocks.length - 1 ? 240 : 400,
                  line: 360,
                },
                indent: {
                  firstLine: 709,
                },
              })
            );
            pendingTableTitle = null;
          }
        } else if (!isBibliography) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: section.description || "",
                  italics: true,
                  font: "Times New Roman",
                  size: 28,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 400 },
            })
          );
        }

        // Добавляем таблицы
        if (section.tables && section.tables.length > 0) {
          for (const tableData of section.tables) {
            tableCounter += 1;
            const rawTitle = tableData.title?.trim() || section.title || `Таблица ${tableCounter}`;
            const normalizedTitle = rawTitle.replace(/^(таблица|table)\s*\d+\.?\s*/i, '').trim();
            const rawCaption = tableData.caption?.trim();
            const normalizedCaption = rawCaption
              ? rawCaption.replace(/^Таблица\s*\d+\.?\s*/i, '').trim()
              : '';
            const titleBody = normalizedTitle || normalizedCaption || rawTitle;
            const finalTitle = titleBody ? `Таблица ${tableCounter} – ${titleBody}` : `Таблица ${tableCounter}`;

            documentSections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: finalTitle,
                    font: "Times New Roman",
                    size: 28,
                    color: "000000",
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 400, after: 200 },
              })
            );

            // Таблица
            const table = createTableFromData(tableData);
            documentSections.push(table);
          }
        }

        // Добавляем графики
        if (section.charts && section.charts.length > 0) {
          for (const chartData of section.charts) {
            try {
              figureCounter += 1;
              const rawChartTitle = chartData.title?.trim() || `График ${figureCounter}`;
              const normalizedChartTitle = rawChartTitle.replace(/^(рисунок|figure)\s*\d+\.?\s*/i, '').trim();
              // Изображение графика
              const imageRun = await createImageFromChart(chartData);
              documentSections.push(
                new Paragraph({
                  children: [imageRun],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 400, after: 200 },
                })
              );

              // Подпись под графиком (обязательна по ГОСТ)
              const rawChartCaption = chartData.caption?.trim();
              const normalizedChartCaption = rawChartCaption
                ? rawChartCaption.replace(/^Рисунок\s*\d+\.?\s*/i, '').trim()
                : '';
              const captionBody = normalizedChartCaption || normalizedChartTitle || rawChartTitle;
              const finalChartCaption = captionBody
                ? `Рисунок ${figureCounter} – ${captionBody}`
                : `Рисунок ${figureCounter}`;

              documentSections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: finalChartCaption,
                      font: "Times New Roman",
                      size: 28, // 14 пт
                      color: "000000",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 120, after: 400 },
                })
              );
            } catch (error) {
              console.error('Error creating chart image:', error);
              // Если не удалось создать график, добавляем заголовок с ошибкой
              const fallbackTitle = chartData.title?.trim() || `График ${figureCounter}`;
              documentSections.push(
                new Paragraph({
                  text: `Рисунок ${figureCounter} – ${fallbackTitle} (ошибка создания изображения)`,
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 400 },
                })
              );
            }
          }
        }
      }

      const buildBibliographyParagraphs = (): Paragraph[] => {
        const sortedNumbers = Array.from(citationNumbers).sort((a, b) => a - b);
        const maxCitationNumber = sortedNumbers.length > 0 ? sortedNumbers[sortedNumbers.length - 1] : 0;
        const finalEntries: string[] = maxCitationNumber > 0 ? new Array(maxCitationNumber).fill('') : [];

        const referencedCitationNumbers = new Set(sortedNumbers);

        bibliographyEntries.forEach((entry, key) => {
          const numericKey = Number(key);
          if (Number.isFinite(numericKey) && numericKey > 0) {
            const normalizedIndex = numericKey - 1;
            const isReferenced = referencedCitationNumbers.has(numericKey);
            const normalizedEntry = isReferenced ? entry : `${entry} [не упомянут в тексте]`;
            finalEntries[normalizedIndex] = normalizedEntry;
          } else {
            finalEntries.push(entry);
          }
        });

        const filledEntries = finalEntries.length > 0
          ? finalEntries.map((entry, idx) => entry || `Источник ${idx + 1}. Данные отсутствуют`)
          : Array.from(bibliographyEntries.values());

        return filledEntries.length > 0 ? createNumberedList(filledEntries) : [];
      };

      const bibliographyParagraphs = buildBibliographyParagraphs();

      if (bibliographyParagraphs.length > 0) {
        bibliographySectionTitle = bibliographySectionTitle || "Список литературы";
        const bibliographyHeadingNumber = visibleSectionNumber + 1;

        const headingParagraph = new Paragraph({
          children: [
            new TextRun({
              text: `${bibliographyHeadingNumber}. ${bibliographySectionTitle}`,
              font: "Times New Roman",
              size: 32,
              color: "000000",
              bold: true,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        });

        const insertIndex = bibliographyInsertIndex ?? documentSections.length;
        documentSections.splice(insertIndex, 0, headingParagraph, ...bibliographyParagraphs);

        tableOfContents.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${bibliographyHeadingNumber}. ${bibliographySectionTitle}`,
                font: "Times New Roman",
                size: 28,
                color: "000000",
              }),
            ],
            spacing: { after: 200 },
          })
        );

        tocSectionNumber = bibliographyHeadingNumber;
      }

      // Настройки ГОСТ для документа
      // Поля: левое 3 см (8508 twips), остальные 1.5 см (850 twips)
      // 1 см = 567 twips (приблизительно)
      const marginLeft = 3 * 567; // 3 см = 1701 twips
      const marginRight = 1.5 * 567; // 1.5 см = 850.5 twips
      const marginTop = 2 * 567; // 2 см = 1134 twips
      const marginBottom = 2 * 567; // 2 см = 1134 twips

      // Нумерация страниц (начиная с оглавления, титульный лист не нумеруется)
      const pageNumberFooter = new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                children: [PageNumber.CURRENT],
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      });

      // Create the document
      const doc = new Document({
        creator: "DocuGen AI",
        title: titleFields.theme,
        description: `Документ на тему: ${theme}`,
        numbering: {
          config: numberingConfigs,
        },
        sections: [
          {
            properties: {
              type: SectionType.NEXT_PAGE,
              page: {
                margin: {
                  top: marginTop,
                  right: marginRight,
                  bottom: marginBottom,
                  left: marginLeft,
                },
              },
              // Титульный лист без нумерации
            },
            children: [
              // Title page
              ...titlePageContent,
            ],
          },
          {
            properties: {
              type: SectionType.NEXT_PAGE,
              page: {
                margin: {
                  top: marginTop,
                  right: marginRight,
                  bottom: marginBottom,
                  left: marginLeft,
                },
              },
              pageNumberStart: 2,
            } as any,
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    text: "",
                  }),
                ],
              }),
            },
            footers: {
              default: pageNumberFooter,
            },
            children: [
              // Table of contents
              ...tableOfContents,
            ],
          },
          {
            properties: {
              page: {
                margin: {
                  top: marginTop,
                  right: marginRight,
                  bottom: marginBottom,
                  left: marginLeft,
                },
              },
            },
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    text: "",
                  }),
                ],
              }),
            },
            footers: {
              default: pageNumberFooter,
            },
            children: [
              // Content sections
              ...documentSections,
            ],
          },
        ],
      });

      // Generate and save the document
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${titleFields.theme || "document"}.docx`);

      toast.dismiss();

      if (quotaEnabled) {
        try {
          const consumeResponse = await apiFetch<ConsumeResponse>("/api/subscription/consume", {
            method: "POST",
            token,
            body: JSON.stringify({ consume: true }),
          });
          postConsumeUsage = consumeResponse.subscription ?? null;
          await refreshProfile();
        } catch (consumeError) {
          console.error("Document quota consume error:", consumeError);
        }
      }

      const usageDescription = quotaEnabled
        ? formatUsageDescription(postConsumeUsage ?? preCheckUsage)
        : authRequired
          ? undefined
          : "Демо-режим: генерация без авторизации.";

      toast.success("Документ скачан успешно!", {
        description: usageDescription,
      });
    } catch (error) {
      toast.dismiss();
      
      // Улучшенная обработка ошибок
      let errorMessage = "Ошибка при создании документа";
      if (error instanceof Error) {
        if (error.message.includes("Blob")) {
          errorMessage = "Недостаточно памяти для создания документа";
        } else if (error.message.includes("saveAs")) {
          errorMessage = "Проблема с сохранением файла. Проверьте настройки браузера";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error("Ошибка при создании документа", {
        description: errorMessage
      });
      console.error("Error generating document:", error);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateDocxDocument();
  };

  const handleFieldChange = (field: keyof typeof titleFields, value: string) => {
    setTitleFields((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTemplateUpload = (file: File | null) => {
    if (!file) {
      setTemplateFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Загрузите файл в формате .docx");
      return;
    }

    setTemplateFile(file);
    toast.success("Шаблон успешно загружен");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium">
          <FileCheck className="h-4 w-4" />
          Финальный этап
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Оформление титульного листа
        </h2>
        <p className="text-lg text-muted-foreground">
          Заполните данные для титульной страницы документа
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Основная информация</h3>
              
              <div className="space-y-2">
                <Label htmlFor="theme">
                  Тема <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="theme"
                  value={titleFields.theme}
                  onChange={(e) => handleFieldChange("theme", e.target.value)}
                  placeholder="Название работы"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentType">Тип документа</Label>
                <Select
                  value={titleFields.documentType}
                  onValueChange={(value) => handleFieldChange("documentType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип документа" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Год</Label>
                <Input
                  id="year"
                  value={titleFields.year}
                  onChange={(e) => handleFieldChange("year", e.target.value)}
                  placeholder={new Date().getFullYear().toString()}
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Учебное заведение</h3>

              <div className="space-y-2">
                <Label htmlFor="university">Организация</Label>
                <Input
                  id="university"
                  value={titleFields.university}
                  onChange={(e) => handleFieldChange("university", e.target.value)}
                  placeholder="Казанский (Приволжский) федеральный университет"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faculty">Факультет / институт</Label>
                <Input
                  id="faculty"
                  value={titleFields.faculty}
                  onChange={(e) => handleFieldChange("faculty", e.target.value)}
                  placeholder="Институт управления, экономики и финансов"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Кафедра</Label>
                <Input
                  id="department"
                  value={titleFields.department}
                  onChange={(e) => handleFieldChange("department", e.target.value)}
                  placeholder="Кафедра цифровой экономики"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction">Направление подготовки</Label>
                <Input
                  id="direction"
                  value={titleFields.direction}
                  onChange={(e) => handleFieldChange("direction", e.target.value)}
                  placeholder="38.03.02 Менеджмент"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile">Профиль</Label>
                <Input
                  id="profile"
                  value={titleFields.profile}
                  onChange={(e) => handleFieldChange("profile", e.target.value)}
                  placeholder="Цифровые технологии в бизнесе"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Город</Label>
                <Input
                  id="city"
                  value={titleFields.city}
                  onChange={(e) => handleFieldChange("city", e.target.value)}
                  placeholder={defaultTitleFields.CITY}
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Автор и научный руководитель</h3>
              
              <div className="space-y-2">
                <Label htmlFor="author">
                  Автор <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="author"
                  value={titleFields.author}
                  onChange={(e) => handleFieldChange("author", e.target.value)}
                  placeholder="Иванов Иван Иванович"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group">Группа</Label>
                <Input
                  id="group"
                  value={titleFields.group}
                  onChange={(e) => handleFieldChange("group", e.target.value)}
                  placeholder="11-903"
                />
              </div>

                <div className="space-y-2">
                <Label htmlFor="supervisor">Научный руководитель</Label>
                  <Input
                  id="supervisor"
                  value={titleFields.supervisor}
                  onChange={(e) => handleFieldChange("supervisor", e.target.value)}
                  placeholder="Петров П.П."
                  />
                </div>

                <div className="space-y-2">
                <Label htmlFor="supervisorPosition">Должность руководителя</Label>
                  <Input
                  id="supervisorPosition"
                  value={titleFields.supervisorPosition}
                  onChange={(e) => handleFieldChange("supervisorPosition", e.target.value)}
                  placeholder="к.э.н., доцент"
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Индивидуальный шаблон</h3>

              <p className="text-sm text-muted-foreground">
                По умолчанию используется универсальный титульный лист по ГОСТ. При необходимости вы можете загрузить
                собственный DOCX-шаблон и мы подставим значения в плейсхолдеры.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="templateFile">Шаблон титульного листа (DOCX)</Label>
                <Input
                  id="templateFile"
                  type="file"
                  accept=".docx"
                  onChange={(event) => handleTemplateUpload(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  {"Используйте плейсхолдеры: {{THEME}}, {{DOC_TYPE}}, {{YEAR}}, {{UNIVERSITY}}, {{FACULTY}}, {{DEPARTMENT}}, {{DIRECTION}}, {{PROFILE}}, {{AUTHOR_LINE}}, {{GROUP_LINE}}, {{SUPERVISOR_LINE}}, {{SUPERVISOR_POSITION_LINE}}, {{DIRECTION_LINE}}, {{PROFILE_LINE}}, {{LOCATION_LINE}}."}
                </p>
                {templateFile && (
                  <p className="text-xs text-muted-foreground italic">
                    Шаблон: {templateFile.name}
                  </p>
                )}
              </div>
            </Card>

            <div className="flex gap-4">
              <Button 
                type="button" 
                onClick={onBack} 
                variant="outline" 
                size="lg" 
                className="flex-1"
              >
                Назад
              </Button>
              <Button 
                type="submit" 
                variant="success" 
                size="lg" 
                className="flex-1"
              >
                <Download className="mr-2 h-5 w-5" />
                Скачать .docx
              </Button>
            </div>
          </form>
        </div>

        <div>
          <Card className="p-8 bg-secondary/30 sticky top-24">
            <h3 className="text-lg font-semibold mb-6">Предпросмотр</h3>
            <div className="space-y-8 text-center border-2 border-dashed border-border p-8 rounded-lg">
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
                  <p className="text-xs text-muted-foreground">Направление: {titleFields.direction}</p>
                )}
                {titleFields.profile && (
                  <p className="text-xs text-muted-foreground">Профиль: {titleFields.profile}</p>
                )}
              </div>

              <div className="space-y-4 py-8">
                <p className="text-xs uppercase text-muted-foreground">
                  {selectedDocType.label}
                </p>
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
                  {(titleFields.city || defaultTitleFields.CITY) + ", " + (titleFields.year || new Date().getFullYear().toString())}
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-accent/10 border border-accent text-sm text-center">
              <p className="font-semibold text-accent mb-1">Демо-режим</p>
              <p className="text-muted-foreground text-xs">
                Документ будет содержать водяной знак
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
