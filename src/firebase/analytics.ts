import { logEvent, type Analytics } from "firebase/analytics";
import { initializeClientAnalytics } from "./client";

const getAnalytics = (): Promise<Analytics | null> => initializeClientAnalytics();

const track = (eventName: string, params?: Record<string, unknown>) => {
  getAnalytics().then((a) => {
    if (a) logEvent(a, eventName, params);
  });
};

export const trackGenerateAttempt = (branch: string, length: string) =>
  track("generate_attempt", { branch, length });

export const trackGenerateSuccess = (branch: string, length: string, wordCount: number) =>
  track("generate_success", { branch, length, word_count: wordCount });

export const trackGenerateError = (branch: string, length: string, errorMessage: string) =>
  track("generate_error", { branch, length, error_message: errorMessage.slice(0, 100) });

export const trackRateLimitBlocked = () => track("rate_limit_blocked");

export const trackCopyReport = () => track("copy_report");

export const trackShareReport = () => track("share_report");
