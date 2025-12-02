import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import JSZip from "jszip";
import {
  AlignmentType,
  Document,
  Paragraph,
  Packer,
  TextRun,
  IParagraphOptions,
} from "docx";

// Определяем тип SpacingOptions вручную, так как он не экспортируется
interface SpacingOptions {
  before?: number;
  after?: number;
  line?: number;
  lineRule?: "auto" | "exact" | "atLeast";
}

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const globalScope = globalThis as unknown as {
    atob?: (input: string) => string;
    Buffer?: { from: (input: string, encoding: string) => Uint8Array };
  };

  if (typeof globalScope.atob === "function") {
    const binaryString = globalScope.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  if (globalScope.Buffer) {
    const nodeBuffer = globalScope.Buffer.from(base64, "base64");
    return nodeBuffer.buffer.slice(
      nodeBuffer.byteOffset,
      nodeBuffer.byteOffset + nodeBuffer.byteLength,
    );
  }

  throw new Error("Base64 decoding is not supported in the current environment");
};

export interface TitleTemplateData {
  THEME: string;
  DOC_TYPE: string;
  YEAR: string;
  UNIVERSITY?: string;
  FACULTY?: string;
  DEPARTMENT?: string;
  DIRECTION?: string;
  PROFILE?: string;
  AUTHOR?: string;
  GROUP?: string;
  SUPERVISOR?: string;
  SUPERVISOR_POSITION?: string;
  CITY?: string;
  AUTHOR_LINE?: string;
  GROUP_LINE?: string;
  SUPERVISOR_LINE?: string;
  SUPERVISOR_POSITION_LINE?: string;
  DIRECTION_LINE?: string;
  PROFILE_LINE?: string;
  LOCATION_LINE?: string;
}

export const defaultTitleFields: Required<Pick<TitleTemplateData, "UNIVERSITY" | "FACULTY" | "DEPARTMENT" | "DIRECTION" | "PROFILE" | "AUTHOR" | "GROUP" | "SUPERVISOR" | "SUPERVISOR_POSITION" | "CITY">> = {
  UNIVERSITY: "Московский государственный университет",
  FACULTY: "Институт/Факультет",
  DEPARTMENT: "Кафедра ...",
  DIRECTION: "38.03.02 Менеджмент",
  PROFILE: "Цифровые технологии в бизнесе",
  AUTHOR: "Студент",
  GROUP: "",
  SUPERVISOR: "Научный руководитель",
  SUPERVISOR_POSITION: "",
  CITY: "Москва",
};

let defaultTemplatePromise: Promise<ArrayBuffer> | null = null;

const createDefaultTemplate = (): Document => {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ",
                bold: true,
                size: 28,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: "РОССИЙСКОЙ ФЕДЕРАЦИИ",
                bold: true,
                size: 28,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "{{UNIVERSITY}}",
                size: 28,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "{{FACULTY}}",
                size: 26,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "{{DEPARTMENT}}",
                size: 26,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "{{DIRECTION}}",
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 },
            children: [
              new TextRun({
                text: "{{PROFILE}}",
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 },
            children: [
              new TextRun({
                text: "{{DOC_TYPE}}",
                bold: true,
                size: 28,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "«{{THEME}}»",
                bold: true,
                size: 28,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 400, after: 80 },
            children: [
              new TextRun({
                text: "{{AUTHOR_LINE}}",
                size: 26,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: "{{GROUP_LINE}}",
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "{{SUPERVISOR_LINE}}",
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 320 },
            children: [
              new TextRun({
                text: "{{SUPERVISOR_POSITION_LINE}}",
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: "{{LOCATION_LINE}}",
                size: 26,
                font: "Times New Roman",
              }),
            ],
          }),
        ],
      },
    ],
  });
};

const getDefaultTemplateBuffer = async (): Promise<ArrayBuffer> => {
  if (!defaultTemplatePromise) {
    const document = createDefaultTemplate();
    defaultTemplatePromise = Packer.toBase64String(document).then((base64) =>
      base64ToArrayBuffer(base64),
    );
  }
  return defaultTemplatePromise;
};

type AlignmentVal = typeof AlignmentType[keyof typeof AlignmentType] | undefined;

const mapAlignment = (value: string | null | undefined): AlignmentVal => {
  switch (value) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "both":
      return AlignmentType.JUSTIFIED;
    case "distribute":
      return AlignmentType.DISTRIBUTE;
    default:
      return AlignmentType.LEFT;
  }
};

const extractSpacing = (spacingNode: Element | undefined | null): SpacingOptions | undefined => {
  if (!spacingNode) {
    return undefined;
  }

  const spacing: SpacingOptions = {};
  const before = spacingNode.getAttribute("w:before");
  const after = spacingNode.getAttribute("w:after");
  const line = spacingNode.getAttribute("w:line");

  if (before) {
    spacing.before = parseInt(before, 10);
  }
  if (after) {
    spacing.after = parseInt(after, 10);
  }
  if (line) {
    spacing.line = parseInt(line, 10);
  }

  return Object.keys(spacing).length > 0 ? spacing : undefined;
};

const extractTextRuns = (paragraphNode: Element): TextRun[] => {
  const runNodes = Array.from(paragraphNode.getElementsByTagName("w:r"));
  const runs: TextRun[] = [];

  runNodes.forEach((runNode) => {
    const textNodes = Array.from(runNode.getElementsByTagName("w:t"));
    const text = textNodes.map((node) => node.textContent ?? "").join("");
    const rPr = runNode.getElementsByTagName("w:rPr")[0];

    const tabNodes = Array.from(runNode.getElementsByTagName("w:tab"));

    const options: { [key: string]: unknown } = {
      text,
      font: "Times New Roman",
    };

    if (tabNodes.length > 0) {
      options.text = `${"\t".repeat(tabNodes.length)}${text}`;
    }

    if (rPr) {
      if (rPr.getElementsByTagName("w:b").length > 0) {
        options.bold = true;
      }
      if (rPr.getElementsByTagName("w:i").length > 0) {
        options.italics = true;
      }
      const sizeNode = rPr.getElementsByTagName("w:sz")[0];
      if (sizeNode) {
        const sizeVal = sizeNode.getAttribute("w:val");
        if (sizeVal) {
          options.size = parseInt(sizeVal, 10);
        }
      }
      const colorNode = rPr.getElementsByTagName("w:color")[0];
      if (colorNode) {
        const colorVal = colorNode.getAttribute("w:val");
        if (colorVal && colorVal !== "auto") {
          options.color = colorVal;
        }
      }
      const fontNode = rPr.getElementsByTagName("w:rFonts")[0];
      if (fontNode) {
        const ascii = fontNode.getAttribute("w:ascii") ?? fontNode.getAttribute("w:hAnsi");
        if (ascii) {
          options.font = ascii;
        }
      }
      const underlineNode = rPr.getElementsByTagName("w:u")[0];
      if (underlineNode) {
        const underlineVal = underlineNode.getAttribute("w:val");
        if (underlineVal && underlineVal !== "none") {
          options.underline = {};
        }
      }
    }

    const breakNodes = Array.from(runNode.getElementsByTagName("w:br"));
    if (breakNodes.length > 0) {
      options.break = breakNodes.length;
    }

    runs.push(new TextRun(options));
  });

  return runs.length > 0 ? runs : [
    new TextRun({
      text: "",
      font: "Times New Roman",
    }),
  ];
};

const convertDocumentXmlToParagraphs = (xml: string): Paragraph[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "application/xml");
  const paragraphNodes = Array.from(xmlDoc.getElementsByTagName("w:p"));

  return paragraphNodes.map((paragraphNode) => {
    const pPr = paragraphNode.getElementsByTagName("w:pPr")[0];
    const alignmentVal = pPr?.getElementsByTagName("w:jc")[0]?.getAttribute("w:val");
    const alignment = mapAlignment(alignmentVal);
    const spacingNode = pPr?.getElementsByTagName("w:spacing")[0];
    const spacing = extractSpacing(spacingNode);
    const runs = extractTextRuns(paragraphNode);

    const paragraphOptions: IParagraphOptions = {
      children: runs,
      alignment,
      ...(spacing && { spacing }),
    };

    return new Paragraph(paragraphOptions);
  });
};

export const renderTitleTemplate = async (
  data: TitleTemplateData,
  templateBuffer?: ArrayBuffer,
): Promise<Paragraph[]> => {
  const buffer = templateBuffer ?? (await getDefaultTemplateBuffer());

  try {
    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    const generatedBuffer = doc.getZip().generate({
      type: "arraybuffer",
    });

    const renderedZip = await JSZip.loadAsync(generatedBuffer);
    const documentXml = await renderedZip.file("word/document.xml")?.async("string");

    if (!documentXml) {
      throw new Error("Template document.xml not found");
    }

    return convertDocumentXmlToParagraphs(documentXml);
  } catch (error) {
    console.error("Title template rendering failed", error);
    throw error;
  }
};

