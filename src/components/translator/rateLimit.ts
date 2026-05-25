type RateLimitData = {
  lastGenerated: number;
  history: number[];
};

const RATE_LIMIT_KEY = "gemini_rate_limit";
const MIN_INTERVAL_MS = 30 * 1000;
const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 15;

const readRateLimitData = (): RateLimitData => {
  const rawData = localStorage.getItem(RATE_LIMIT_KEY);

  if (!rawData) {
    return { lastGenerated: 0, history: [] };
  }

  try {
    const parsed = JSON.parse(rawData) as Partial<RateLimitData>;
    return {
      lastGenerated: parsed.lastGenerated || 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { lastGenerated: 0, history: [] };
  }
};

const getRecentHistory = (history: number[], now: number): number[] => {
  const oneHourAgo = now - HOURLY_WINDOW_MS;
  return history.filter((timestamp) => timestamp > oneHourAgo);
};

export const checkRateLimit = (): { allowed: boolean; message?: string } => {
  if (typeof window === "undefined") return { allowed: true };

  const now = Date.now();
  const data = readRateLimitData();
  const history = getRecentHistory(data.history, now);

  if (data.lastGenerated && now - data.lastGenerated < MIN_INTERVAL_MS) {
    const remainingSecs = Math.ceil((MIN_INTERVAL_MS - (now - data.lastGenerated)) / 1000);
    return {
      allowed: false,
      message: `АНТИСПАМ-ФІЛЬТР: ПЕРЕВИЩЕНО ЧАСТОТУ. Наступна подача дозволена через ${remainingSecs} сек.`,
    };
  }

  if (history.length >= MAX_REQUESTS_PER_HOUR) {
    const oldestTimestamp = history[0];
    const waitTimeMs = oldestTimestamp + HOURLY_WINDOW_MS - now;
    const remainingMins = Math.ceil(waitTimeMs / (60 * 1000));
    return {
      allowed: false,
      message: `АНТИСПАМ-ФІЛЬТР: ЛІМІТ ПЕРЕВИЩЕНО (макс. 15/год). Спробуйте через ${remainingMins} хв.`,
    };
  }

  return { allowed: true };
};

export const updateRateLimit = () => {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const data = readRateLimitData();
  const history = getRecentHistory(data.history, now);

  localStorage.setItem(
    RATE_LIMIT_KEY,
    JSON.stringify({
      lastGenerated: now,
      history: [...history, now],
    }),
  );
};
