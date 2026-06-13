import type { PlainLanguageResponse, TranslationResponse } from "./types";

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

const PLAIN_ACTION_STATUSES = new Set(["done", "required", "proposed", "unclear"]);

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

const isPlainLanguageResponse = (value: unknown): value is PlainLanguageResponse => {
  if (!isRecord(value) || typeof value.summary !== "string") return false;

  const hasActions = Array.isArray(value.actions) && value.actions.every((action) => {
    return (
      isRecord(action) &&
      typeof action.action === "string" &&
      (typeof action.owner === "string" || action.owner === null) &&
      (typeof action.deadline === "string" || action.deadline === null) &&
      typeof action.status === "string" &&
      PLAIN_ACTION_STATUSES.has(action.status)
    );
  });

  return (
    isStringArray(value.key_facts) &&
    isStringArray(value.consequences) &&
    hasActions &&
    isStringArray(value.uncertainties)
  );
};

const parseResponse = <T,>(
  text: string,
  validator: (value: unknown) => value is T,
  schemaName: string,
): T => {
  const jsonText = extractJsonText(text);
  const parseCandidates = [jsonText, repairCommonJsonIssues(jsonText)];
  let lastError: unknown;

  for (const candidate of parseCandidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;

      if (!validator(parsed)) {
        throw new Error(`Provider JSON did not match the ${schemaName} schema`);
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

export const parseTranslationResponse = (text: string): TranslationResponse => {
  return parseResponse(text, isTranslationResponse, "bureaucratic translation");
};

export const parsePlainLanguageResponse = (text: string): PlainLanguageResponse => {
  return parseResponse(text, isPlainLanguageResponse, "plain-language translation");
};
