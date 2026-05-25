export type Branch =
  | "СБС"
  | "Повітряні Сили"
  | "Війська Зв'язку"
  | "Сухопутні Війська"
  | "ВМС"
  | "ДШВ"
  | "ССО"
  | "Тероборона";

export type Approver = {
  role: string;
  status: string;
};

export type TranslationResponse = {
  report: string;
  resolution: string;
  order: string;
  approvers: Approver[];
  regulation: string;
  authorized_by: string;
  operation_code: string;
};

export type GenerationLength = "s" | "m" | "l" | "xl" | "xxl";

export type GenerationLengthOption = {
  value: GenerationLength;
  label: string;
  minWords: number;
  maxWords?: number;
};

export type DocumentMeta = {
  docNumber: string;
  docDate: string;
  currentDateTimeStr: string;
  day: string;
  month: string;
  year: number;
  hours: string;
  minutes: string;
};
