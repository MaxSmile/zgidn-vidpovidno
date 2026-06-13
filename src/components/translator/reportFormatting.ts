import type { Branch, PlainLanguageResponse, TranslationResponse } from "./types";

export const createGatewayErrorResponse = (): TranslationResponse => ({
  report:
    "ДІЙСНИМ ДОПОВІДАЮ: у зв'язку з виникненням критичної помилки при взаємодії з Cloudflare Worker проксі-сервером, передачу даних призупинено. Перевірте працездатність проксі-каналу та повторіть спробу.",
  regulation: "Стаття 503 Тимчасового регламенту шлюзів",
  authorized_by: "Системний термінал проксі / cloudflare.proxy",
  operation_code: "КОД-ШЛЮЗ-ПОМИЛКА-503",
  resolution: "Начальнику зв'язку здійснити перевірку працездатності Cloudflare Worker.",
  order: "Особовому складу перейти в автономний режим радіомовчання.",
  approvers: [
    { role: "Користувач системи", status: "ШЛЮЗ ЗАБЛОКОВАНО" },
    { role: "Черговий інженер Cloudflare", status: "ПОМИЛКА З'ЄДНАННЯ" },
  ],
});

export const createPlainGatewayErrorResponse = (): PlainLanguageResponse => ({
  summary: "Не вдалося отримати пояснення через помилку з'єднання з AI-шлюзом.",
  key_facts: [],
  consequences: [],
  actions: [],
  uncertainties: ["Повторіть спробу після відновлення з'єднання з Cloudflare Worker."],
});

export const formatReportForCopy = ({
  reportData,
  docNumber,
  docDate,
  activeBranch,
}: {
  reportData: TranslationResponse;
  docNumber: string;
  docDate: string;
  activeBranch: Branch;
}): string => {
  const approversStr = reportData.approvers
    ? reportData.approvers.map((approver) => `- ${approver.role}: [${approver.status}]`).join("\n")
    : "";

  return `--- МІНІСТЕРСТВО ОБОРОНИ УКРАЇНИ ---
Реєстраційний №: ${docNumber}
Дата: ${docDate}
Рід військ: ${activeBranch}

РАПОРТ

${reportData.report}

РЕЗОЛЮЦІЯ:
${reportData.resolution}

НАКАЗ:
${reportData.order}

ПОГОДЖУВАЧІ:
${approversStr}

Регламент: ${reportData.regulation}
Затвердив: ${reportData.authorized_by}
Код операції: ${reportData.operation_code}`;
};

export const formatPlainLanguageForCopy = (data: PlainLanguageResponse): string => {
  const formatList = (items: string[]) =>
    items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- Не зазначено";
  const actions = data.actions.length > 0
    ? data.actions.map((item) => {
      const details = [
        item.owner ? `відповідальний: ${item.owner}` : null,
        item.deadline ? `строк: ${item.deadline}` : null,
        `статус: ${item.status}`,
      ].filter(Boolean).join("; ");
      return `- ${item.action} (${details})`;
    }).join("\n")
    : "- Не зазначено";

  return `КОРОТКО

${data.summary}

КЛЮЧОВІ ФАКТИ:
${formatList(data.key_facts)}

НАСЛІДКИ:
${formatList(data.consequences)}

ДІЇ:
${actions}

НЕВИЗНАЧЕНОСТІ:
${formatList(data.uncertainties)}`;
};
