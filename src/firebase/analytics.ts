import { logEvent, type Analytics } from "firebase/analytics";
import { initializeClientAnalytics } from "./client";

const getAnalytics = (): Promise<Analytics | null> => initializeClientAnalytics();

const track = (eventName: string, params?: Record<string, unknown>) => {
  getAnalytics().then((a) => {
    if (a) logEvent(a, eventName, params);
  });
};

export const trackGenerateAttempt = (branch: string, length: string, direction = "to_bureaucratic") =>
  track("generate_attempt", { branch, length, direction });

export const trackGenerateSuccess = (
  branch: string,
  length: string,
  wordCount: number,
  direction = "to_bureaucratic",
) => track("generate_success", { branch, length, word_count: wordCount, direction });

export const trackGenerateError = (
  branch: string,
  length: string,
  errorMessage: string,
  direction = "to_bureaucratic",
) => track("generate_error", {
  branch,
  length,
  direction,
  error_message: errorMessage.slice(0, 100),
});

export const trackRateLimitBlocked = (direction = "to_bureaucratic") =>
  track("rate_limit_blocked", { direction });

export const trackCopyReport = (direction = "to_bureaucratic") =>
  track("copy_report", { direction });

export const trackShareReport = (direction = "to_bureaucratic") =>
  track("share_report", { direction });
