import type { PlainLanguageResponse, TranslationResponse } from "./types";

export const countWords = (text: string): number => {
  const words = text
    .trim()
    .match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu);

  return words?.length || 0;
};

export const countResponseWords = (response: TranslationResponse): number => {
  return countWords([
    response.report,
    response.resolution,
    response.order,
    response.regulation,
    response.authorized_by,
    response.operation_code,
    ...(response.approvers || []).flatMap((approver) => [approver.role, approver.status]),
  ].join(" "));
};

export const countPlainResponseWords = (response: PlainLanguageResponse): number => {
  return countWords([
    response.summary,
    ...response.key_facts,
    ...response.consequences,
    ...response.actions.flatMap((action) => [
      action.action,
      action.owner || "",
      action.deadline || "",
      action.status,
    ]),
    ...response.uncertainties,
  ].join(" "));
};
