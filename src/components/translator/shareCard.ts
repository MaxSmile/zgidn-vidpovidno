import type { Branch, PlainLanguageResponse, TranslationResponse } from "./types";

export type ShareCardData = {
  eyebrow: string;
  title: string;
  body: string;
  details: string[];
  code: string;
};

type CreateShareCardDataParams =
  | {
      mode: "to_bureaucratic";
      activeBranch: Branch;
      reportData: TranslationResponse;
    }
  | {
      mode: "to_plain";
      plainData: PlainLanguageResponse;
    };

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 1500;
const CARD_PADDING = 92;

export function createShareCardData(params: CreateShareCardDataParams): ShareCardData {
  if (params.mode === "to_plain") {
    return {
      eyebrow: "ПЕРЕКЛАД З БЮРОКРАТИЧНОЇ",
      title: "КОРОТКО",
      body: params.plainData.summary,
      details: params.plainData.key_facts.slice(0, 3),
      code: "ЛЮДСЬКОЮ МОВОЮ",
    };
  }

  return {
    eyebrow: `${params.activeBranch} · АВТОМАТИЗОВАНИЙ РАПОРТ`,
    title: "Р А П О Р Т",
    body: params.reportData.report,
    details: [
      `РЕЗОЛЮЦІЯ: ${params.reportData.resolution}`,
      `НАКАЗ: ${params.reportData.order}`,
    ],
    code: params.reportData.operation_code,
  };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = word;

    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && line) lines.push(line);

  const usedWordCount = lines.join(" ").split(" ").length;
  if (usedWordCount < words.length && lines.length > 0) {
    const lastIndex = lines.length - 1;
    let shortened = lines[lastIndex];
    while (
      shortened.length > 1 &&
      context.measureText(`${shortened}...`).width > maxWidth
    ) {
      shortened = shortened.slice(0, -1);
    }
    lines[lastIndex] = `${shortened.trimEnd()}...`;
  }

  return lines;
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
}

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  await document.fonts?.ready;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  const background = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, "#101a12");
  background.addColorStop(0.55, "#070a08");
  background.addColorStop(1, "#11180f");
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.strokeStyle = "rgba(0, 255, 102, 0.08)";
  context.lineWidth = 1;
  for (let y = 0; y < CARD_HEIGHT; y += 8) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(CARD_WIDTH, y);
    context.stroke();
  }

  context.strokeStyle = "#22321e";
  context.lineWidth = 3;
  roundedRect(
    context,
    CARD_PADDING / 2,
    CARD_PADDING / 2,
    CARD_WIDTH - CARD_PADDING,
    CARD_HEIGHT - CARD_PADDING,
    24,
  );
  context.stroke();

  context.fillStyle = "#00ff66";
  context.fillRect(CARD_PADDING, CARD_PADDING, 12, 92);
  context.font = '700 48px "JetBrains Mono", monospace';
  context.fillText("ЗГІДНО-", CARD_PADDING + 38, CARD_PADDING + 42);
  context.fillText("ВІДПОВІДНО", CARD_PADDING + 38, CARD_PADDING + 94);

  context.fillStyle = "#5c7056";
  context.font = '700 22px "JetBrains Mono", monospace';
  context.textAlign = "right";
  context.fillText("zgidno-vidpovidno.web.app", CARD_WIDTH - CARD_PADDING, CARD_PADDING + 50);
  context.fillText("ШТРУМЕЛЬ-ІНТЕЛЕКТ", CARD_WIDTH - CARD_PADDING, CARD_PADDING + 86);
  context.textAlign = "left";

  context.strokeStyle = "#22321e";
  context.beginPath();
  context.moveTo(CARD_PADDING, 246);
  context.lineTo(CARD_WIDTH - CARD_PADDING, 246);
  context.stroke();

  context.fillStyle = "#94aa8c";
  context.font = '700 22px "JetBrains Mono", monospace';
  context.fillText(data.eyebrow, CARD_PADDING, 302);

  context.fillStyle = "#00ff66";
  context.font = '700 42px "JetBrains Mono", monospace';
  context.fillText(data.title, CARD_PADDING, 370);

  context.fillStyle = "#e9f0e6";
  context.font = '400 31px "Space Grotesk", Arial, sans-serif';
  const bodyLines = fitText(context, data.body, CARD_WIDTH - CARD_PADDING * 2, 18);
  drawTextLines(context, bodyLines, CARD_PADDING, 438, 47);

  let detailY = 438 + bodyLines.length * 47 + 46;
  context.font = '400 23px "Space Grotesk", Arial, sans-serif';

  for (const detail of data.details) {
    if (detailY > 1250) break;
    const detailLines = fitText(context, detail, CARD_WIDTH - CARD_PADDING * 2 - 52, 3);
    const boxHeight = detailLines.length * 35 + 42;

    context.fillStyle = "rgba(0, 255, 102, 0.04)";
    context.strokeStyle = "#22321e";
    roundedRect(
      context,
      CARD_PADDING,
      detailY,
      CARD_WIDTH - CARD_PADDING * 2,
      boxHeight,
      8,
    );
    context.fill();
    context.stroke();
    context.fillStyle = "#00ff66";
    context.fillRect(CARD_PADDING + 22, detailY + 26, 8, 8);
    context.fillStyle = "#94aa8c";
    drawTextLines(context, detailLines, CARD_PADDING + 52, detailY + 31, 35);
    detailY += boxHeight + 18;
  }

  context.strokeStyle = "#22321e";
  context.beginPath();
  context.moveTo(CARD_PADDING, 1360);
  context.lineTo(CARD_WIDTH - CARD_PADDING, 1360);
  context.stroke();

  context.fillStyle = "#5c7056";
  context.font = '700 20px "JetBrains Mono", monospace';
  context.fillText("OPERATION CODE", CARD_PADDING, 1413);
  context.fillStyle = "#00ff66";
  context.font = '700 25px "JetBrains Mono", monospace';
  context.textAlign = "right";
  context.fillText(data.code.slice(0, 38), CARD_WIDTH - CARD_PADDING, 1413);
  context.textAlign = "left";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create PNG"))),
      "image/png",
      0.95,
    );
  });
}

