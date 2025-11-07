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
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, SectionType, Table, TableRow, TableCell, WidthType, ImageRun, Footer, PageNumber, PageNumberFormat, Header, TabStopType, TabStopPosition, FooterReference, HeaderReference, LevelFormat } from "docx";
import { saveAs } from "file-saver";
import { TableData, ChartData } from "@/lib/gigachat";
import { chartToImage } from "@/lib/chartUtils";
import JSZip from "jszip";

interface Section {
  id: string;
  title: string;
  content?: string;
  tables?: TableData[];
  charts?: ChartData[];
}

interface TitlePageProps {
  sections: Section[];
  theme: string;
  onBack: () => void;
}

export const TitlePage = ({ sections, theme, onBack }: TitlePageProps) => {
  const [formData, setFormData] = useState({
    organization: "",
    department: "",
    title: theme,
    author: "",
    city: "",
    year: new Date().getFullYear().toString(),
    supervisor: "",
    template: "gost",
  });
  const [templateFile, setTemplateFile] = useState<File | null>(null);

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
      data: imageData as any, // docx принимает Buffer или Uint8Array
      transformation: {
        width: 600,
        height: 400,
      },
    });
  };

  const generateDocxDocument = async () => {
    try {
      // Validate required fields
    if (!formData.organization || !formData.title || !formData.author) {
      toast.error("Заполните обязательные поля");
      return;
    }

      toast.loading("Создание документа...");

      const placeholderMap: Record<string, string> = {
        "{{ORGANIZATION}}": formData.organization,
        "{{DEPARTMENT}}": formData.department,
        "{{TITLE}}": formData.title,
        "{{AUTHOR}}": formData.author,
        "{{SUPERVISOR}}": formData.supervisor,
        "{{CITY}}": formData.city,
        "{{YEAR}}": formData.year,
      };

      const replacePlaceholders = (value: string): string => {
        let result = value;
        Object.entries(placeholderMap).forEach(([placeholder, replacement]) => {
          const safeReplacement = replacement || "";
          result = result.replaceAll(placeholder, safeReplacement);
          result = result.replaceAll(placeholder.toLowerCase(), safeReplacement);
        });
        return result;
      };

      const buildDefaultTitlePage = (): Paragraph[] => {
        const content: Paragraph[] = [];

        if (formData.organization) {
          content.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: formData.organization,
                  bold: true,
                  size: 28,
                  font: "Times New Roman",
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            })
          );
        }

        if (formData.department) {
          content.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: formData.department,
                  size: 24,
                  font: "Times New Roman",
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            })
          );
        }

        const docType = formData.template === "gost"
          ? "КУРСОВАЯ РАБОТА"
          : formData.template === "business"
          ? "АНАЛИТИЧЕСКИЙ ОТЧЁТ"
          : "ДОКУМЕНТ";

        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: docType,
                size: 20,
                italics: true,
                font: "Times New Roman",
                color: "000000",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200, after: 400 },
          })
        );

        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: formData.title,
                bold: true,
                size: 24,
                font: "Times New Roman",
                color: "000000",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          })
        );

        if (formData.supervisor) {
          content.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Руководитель: ${formData.supervisor}`,
                  size: 22,
                  font: "Times New Roman",
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 200 },
            })
          );
        }

        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Автор: ${formData.author}`,
                size: 22,
                font: "Times New Roman",
                color: "000000",
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 800 },
          })
        );

        const locationYear = [formData.city, formData.year].filter(Boolean).join(", ");
        if (locationYear) {
          content.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: locationYear,
                  size: 22,
                  font: "Times New Roman",
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            })
          );
        }

        return content;
      };

      const buildTitlePageFromTemplate = async (): Promise<Paragraph[]> => {
        if (!templateFile) {
          return buildDefaultTitlePage();
        }

        try {
          const buffer = await templateFile.arrayBuffer();
          const zip = await JSZip.loadAsync(buffer);
          const documentXml = await zip.file("word/document.xml")?.async("string");

          if (!documentXml) {
            throw new Error("document.xml not found in template");
          }

          const parser = new DOMParser();
          const xml = parser.parseFromString(documentXml, "application/xml");
          const paragraphs = Array.from(xml.getElementsByTagName("w:p"));

          if (paragraphs.length === 0) {
            throw new Error("Template does not contain paragraphs");
          }

          return paragraphs.map((paragraphNode) => {
            const textNodes = Array.from(paragraphNode.getElementsByTagName("w:t"));
            const combinedText = textNodes.map((node) => node.textContent ?? "").join("");
            const replacedText = replacePlaceholders(combinedText);

            const alignmentNode = paragraphNode.getElementsByTagName("w:jc")[0];
            const alignmentVal = alignmentNode?.getAttribute("w:val") ?? "left";
            let alignment: AlignmentType | undefined;
            switch (alignmentVal) {
              case "center":
                alignment = AlignmentType.CENTER;
                break;
              case "right":
                alignment = AlignmentType.RIGHT;
                break;
              case "both":
                alignment = AlignmentType.JUSTIFIED;
                break;
              default:
                alignment = AlignmentType.LEFT;
            }

            return new Paragraph({
              children: [
                new TextRun({
                  text: replacedText,
                  font: "Times New Roman",
                  size: 28,
                  color: "000000",
                }),
              ],
              alignment,
              spacing: { after: 200 },
            });
          });
        } catch (error) {
          console.error("Template parsing error", error);
          toast.error("Не удалось применить загруженный шаблон. Используется стандартный титульный лист");
          return buildDefaultTitlePage();
        }
      };

      const titlePageContent = templateFile
        ? await buildTitlePageFromTemplate()
        : buildDefaultTitlePage();

      const numberingConfigs: { reference: string; levels: Array<Record<string, unknown>> }[] = [];
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

            const lines = cleanedLines.filter((line) => line.length > 0);

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
                  firstLine: 425,
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

        bibliographyEntries.forEach((entry, key) => {
          const numericKey = Number(key);
          if (Number.isFinite(numericKey) && numericKey > 0) {
            finalEntries[numericKey - 1] = entry;
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
        title: formData.title,
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
              // Нумерация начинается с оглавления
              pageNumberStart: 2,
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
      saveAs(blob, `${formData.title || "document"}.docx`);
      
      toast.dismiss();
      toast.success("Документ скачан успешно!");
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

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
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
                <Label htmlFor="organization">
                  Организация <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => handleInputChange("organization", e.target.value)}
                  placeholder="Название учебного заведения или организации"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Подразделение</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  placeholder="Кафедра или отдел"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Тема <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Название работы"
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Автор и место</h3>
              
              <div className="space-y-2">
                <Label htmlFor="author">
                  Автор <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => handleInputChange("author", e.target.value)}
                  placeholder="ФИО автора"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supervisor">Руководитель</Label>
                <Input
                  id="supervisor"
                  value={formData.supervisor}
                  onChange={(e) => handleInputChange("supervisor", e.target.value)}
                  placeholder="ФИО и должность"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Город</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Москва"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Год</Label>
                  <Input
                    id="year"
                    value={formData.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                    placeholder="2025"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Шаблон оформления</h3>
              
              <div className="space-y-2">
                <Label htmlFor="template">Стиль документа</Label>
                <Select
                  value={formData.template}
                  onValueChange={(value) => handleInputChange("template", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gost">ГОСТ (академический)</SelectItem>
                    <SelectItem value="business">Деловой стиль</SelectItem>
                    <SelectItem value="free">Свободный формат</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateFile">Индивидуальный шаблон титульного листа (DOCX)</Label>
                <Input
                  id="templateFile"
                  type="file"
                  accept=".docx"
                  onChange={(event) => handleTemplateUpload(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  {"Загрузите ГОСТ-шаблон с плейсхолдерами вида {{ORGANIZATION}}, {{TITLE}}, {{AUTHOR}}, {{SUPERVISOR}}, {{CITY}}, {{YEAR}}. Поля будут заполнены автоматически."}
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
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">
                  {formData.organization || "НАЗВАНИЕ ОРГАНИЗАЦИИ"}
                </p>
                {formData.department && (
                  <p className="text-xs text-muted-foreground">
                    {formData.department}
                  </p>
                )}
              </div>

              <div className="space-y-4 py-8">
                <p className="text-xs uppercase text-muted-foreground">
                  {formData.template === "gost"
                    ? "Курсовая работа"
                    : formData.template === "business"
                    ? "Аналитический отчёт"
                    : "Документ"}
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formData.title || "ТЕМА ДОКУМЕНТА"}
                </p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                {formData.supervisor && (
                  <p>Руководитель: {formData.supervisor}</p>
                )}
                {formData.author && <p>Автор: {formData.author}</p>}
              </div>

              <div className="pt-8">
                <p className="text-sm text-muted-foreground">
                  {formData.city || "Город"}, {formData.year || "2025"}
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
