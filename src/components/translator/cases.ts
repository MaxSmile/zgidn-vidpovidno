import { BRANCHES, GENERATION_LENGTH_OPTIONS, WORKER_URL } from "./constants";
import { parsePlainLanguageResponse, parseTranslationResponse } from "./responseParsing";
import type {
  Branch,
  GenerationLength,
  PlainLanguageResponse,
  TranslationMode,
  TranslationResponse,
} from "./types";

const CASE_ID_PATTERN = /^[a-f0-9]{20}$/;

type CaseResult = TranslationResponse | PlainLanguageResponse;

export type CaseUi = {
  branch?: Branch;
  generationLength?: GenerationLength;
  docNumber?: string;
  docDate?: string;
};

export type SharedCase = {
  id: string;
  mode: TranslationMode;
  sourceText: string;
  result: CaseResult;
  ui: CaseUi;
  createdAt: string;
};

type CreateCaseParams = {
  mode: TranslationMode;
  sourceText: string;
  result: CaseResult;
  ui: CaseUi;
};

type CreateCaseResponse = {
  id: string;
  url: string;
};

const caseEndpoint = (path = "") => {
  return new URL(`cases${path}`, WORKER_URL).toString();
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const parseCaseResult = (mode: TranslationMode, result: unknown): CaseResult => {
  const serialized = JSON.stringify(result);
  return mode === "to_plain"
    ? parsePlainLanguageResponse(serialized)
    : parseTranslationResponse(serialized);
};

const parseCaseUi = (value: unknown): CaseUi => {
  if (!isRecord(value)) return {};

  const branch = typeof value.branch === "string" && BRANCHES.includes(value.branch as Branch)
    ? value.branch as Branch
    : undefined;
  const generationLength =
    typeof value.generationLength === "string" &&
    GENERATION_LENGTH_OPTIONS.some((option) => option.value === value.generationLength)
      ? value.generationLength as GenerationLength
      : undefined;

  return {
    branch,
    generationLength,
    docNumber: typeof value.docNumber === "string" ? value.docNumber : undefined,
    docDate: typeof value.docDate === "string" ? value.docDate : undefined,
  };
};

export const setCaseIdInCurrentUrl = (id: string | null): void => {
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set("case", id);
  } else {
    url.searchParams.delete("case");
  }
  window.history.replaceState({}, "", url);
};

export const getCaseIdFromLocation = (search: string): string | null => {
  const id = new URLSearchParams(search).get("case");
  return id && CASE_ID_PATTERN.test(id) ? id : null;
};

export const createSharedCase = async (
  params: CreateCaseParams,
): Promise<CreateCaseResponse> => {
  const response = await fetch(caseEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Case creation failed (HTTP ${response.status})`);
  }

  const data = await response.json() as unknown;
  if (
    !isRecord(data) ||
    typeof data.id !== "string" ||
    !CASE_ID_PATTERN.test(data.id) ||
    typeof data.url !== "string"
  ) {
    throw new Error("Case creation returned an invalid response");
  }

  return { id: data.id, url: data.url };
};

export const loadSharedCase = async (id: string): Promise<SharedCase> => {
  if (!CASE_ID_PATTERN.test(id)) {
    throw new Error("Invalid case ID");
  }

  const response = await fetch(caseEndpoint(`/${id}`));
  if (!response.ok) {
    throw new Error(response.status === 404 ? "Case not found" : `Case request failed (HTTP ${response.status})`);
  }

  const data = await response.json() as unknown;
  if (
    !isRecord(data) ||
    data.id !== id ||
    (data.mode !== "to_bureaucratic" && data.mode !== "to_plain") ||
    typeof data.sourceText !== "string" ||
    typeof data.createdAt !== "string"
  ) {
    throw new Error("Stored case has an invalid response");
  }

  return {
    id,
    mode: data.mode,
    sourceText: data.sourceText,
    result: parseCaseResult(data.mode, data.result),
    ui: parseCaseUi(data.ui),
    createdAt: data.createdAt,
  };
};
