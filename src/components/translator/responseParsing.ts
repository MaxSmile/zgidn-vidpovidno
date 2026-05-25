import type { TranslationResponse } from "./types";

const TOP_LEVEL_FIELDS = [
  "resolution",
  "order",
  "approvers",
  "regulation",
  "authorized_by",
  "operation_code",
] as const;

const STRING_FIELDS = [
  "report",
  "resolution",
  "order",
  "regulation",
  "authorized_by",
  "operation_code",
] as const;

const extractJsonText = (text: string): string => {
  const trimmed = text.trim();
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedJson?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Provider response did not contain a JSON object");
  }

  return candidate.slice(firstBrace, lastBrace + 1).trim();
};

const repairCommonJsonIssues = (jsonText: string): string => {
  return TOP_LEVEL_FIELDS.reduce((repaired, field) => {
    const smartQuoteBeforeField = new RegExp(`([”»])\\s*\\n\\s*"${field}"\\s*:`, "g");
    const missingCommaBeforeField = new RegExp(`(["}\\]])\\s*\\n\\s*"${field}"\\s*:`, "g");
    return repaired
      .replace(smartQuoteBeforeField, `$1",\n  "${field}":`)
      .replace(missingCommaBeforeField, `$1,\n  "${field}":`);
  }, jsonText)
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isTranslationResponse = (value: unknown): value is TranslationResponse => {
  if (!isRecord(value)) return false;

  const hasStringFields = STRING_FIELDS.every((field) => typeof value[field] === "string");
  const hasApprovers = Array.isArray(value.approvers) && value.approvers.every((approver) => {
    return (
      isRecord(approver) &&
      typeof approver.role === "string" &&
      typeof approver.status === "string"
    );
  });

  return hasStringFields && hasApprovers;
};

export const parseTranslationResponse = (text: string): TranslationResponse => {
  const jsonText = extractJsonText(text);
  const parseCandidates = [jsonText, repairCommonJsonIssues(jsonText)];
  let lastError: unknown;

  for (const candidate of parseCandidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;

      if (!isTranslationResponse(parsed)) {
        throw new Error("Provider JSON did not match the translation schema");
      }

      return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Provider response could not be parsed as translation JSON");
};
