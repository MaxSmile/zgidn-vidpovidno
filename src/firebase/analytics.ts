import { logEvent, type Analytics } from "firebase/analytics";
import { initializeClientAnalytics } from "./client";

let analyticsInstance: Analytics | null = null;

const getAnalyticsInstance = (): Analytics | null => {
  if (!analyticsInstance) {
    analyticsInstance = initializeClientAnalytics() ?? null;
  }
  return analyticsInstance;
};

export const trackGenerateAttempt = (branch: string, length: string) => {
  const a = getAnalyticsInstance();
  if (!a) return;
  logEvent(a, "generate_attempt", { branch, length });
};

export const trackGenerateSuccess = (branch: string, length: string, wordCount: number) => {
  const a = getAnalyticsInstance();
  if (!a) return;
  logEvent(a, "generate_success", { branch, length, word_count: wordCount });
};

export const trackGenerateError = (branch: string, length: string, errorMessage: string) => {
  const a = getAnalyticsInstance();
  if (!a) return;
  logEvent(a, "generate_error", { branch, length, error_message: errorMessage.slice(0, 100) });
};

export const trackRateLimitBlocked = () => {
  const a = getAnalyticsInstance();
  if (!a) return;
  logEvent(a, "rate_limit_blocked");
};

export const trackCopyReport = () => {
  const a = getAnalyticsInstance();
  if (!a) return;
  logEvent(a, "copy_report");
};

export const trackShareReport = () => {
  const a = getAnalyticsInstance();
  if (!a) return;
  logEvent(a, "share_report");
};
