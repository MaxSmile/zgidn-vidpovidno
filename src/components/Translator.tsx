import { useState, useEffect } from "react";
import { Copy, Share2, WandSparkles, FileText, CheckCircle2, ShieldAlert, Clock, RefreshCw } from "lucide-react";
import vocabularyData from "../../vocabulary.json";

type Branch =
  | "СБС"
  | "Повітряні Сили"
  | "Війська Зв'язку"
  | "Сухопутні Війська"
  | "ВМС";

type Approver = {
  role: string;
  status: string;
};

type TranslationResponse = {
  report: string;
  resolution: string;
  order: string;
  approvers: Approver[];
  regulation: string;
  authorized_by: string;
  operation_code: string;
};

type GenerationLength = "s" | "m" | "l" | "xl" | "xxl";

const BRANCHES: Branch[] = [
  "СБС",
  "Повітряні Сили",
  "Війська Зв'язку",
  "Сухопутні Війська",
  "ВМС",
];

const GENERATION_LENGTH_OPTIONS: {
  value: GenerationLength;
  label: string;
  minWords: number;
  maxOutputTokens: number;
}[] = [
  { value: "s", label: "S", minWords: 100, maxOutputTokens: 512 },
  { value: "m", label: "M", minWords: 200, maxOutputTokens: 768 },
  { value: "l", label: "L", minWords: 300, maxOutputTokens: 1024 },
  { value: "xl", label: "XL", minWords: 400, maxOutputTokens: 1536 },
  { value: "xxl", label: "XXL", minWords: 500, maxOutputTokens: 2048 },
];

const PRESETS = [
  "Старлінк обісцяли собаки",
  "Забув пароль від пошти",
  "Вимкнули світло, здох безперебійник",
  "Пролив каву на клавіатуру",
  "Комар залетів у кімнату і пищить",
  "Фарбуємо траву перед приїздом генерала"
];

const APP_VERSION = "v2.4.0-CLOUDFLARE";
const WORKER_URL = "https://zgidno-vidpovidno.vasilkoff-dev.workers.dev/";

type RateLimitData = {
  lastGenerated: number;
  history: number[];
};

type ProviderResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  cfResponse?: {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const extractGeneratedText = (data: ProviderResponse): string => {
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    data.cfResponse?.choices?.[0]?.message?.content ||
    data.choices?.[0]?.message?.content ||
    ""
  );
};

const normalizeResponseText = (text: string): string => {
  const trimmed = text.trim();

  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  return trimmed;
};

const checkRateLimit = (): { allowed: boolean; message?: string } => {
  if (typeof window === "undefined") return { allowed: true };

  const now = Date.now();
  const rawData = localStorage.getItem("gemini_rate_limit");
  let data: RateLimitData = { lastGenerated: 0, history: [] };

  if (rawData) {
    try {
      data = JSON.parse(rawData);
    } catch {
      // Ignore
    }
  }

  const oneHourAgo = now - 60 * 60 * 1000;
  data.history = (data.history || []).filter(t => t > oneHourAgo);

  // 1. Check 30-second rule
  if (data.lastGenerated && now - data.lastGenerated < 30 * 1000) {
    const remainingSecs = Math.ceil((30 * 1000 - (now - data.lastGenerated)) / 1000);
    return {
      allowed: false,
      message: `АНТИСПАМ-ФІЛЬТР: ПЕРЕВИЩЕНО ЧАСТОТУ. Наступна подача дозволена через ${remainingSecs} сек.`
    };
  }

  // 2. Check 15-per-hour rule
  if (data.history.length >= 15) {
    const oldestTimestamp = data.history[0];
    const waitTimeMs = oldestTimestamp + 60 * 60 * 1000 - now;
    const remainingMins = Math.ceil(waitTimeMs / (60 * 1000));
    return {
      allowed: false,
      message: `АНТИСПАМ-ФІЛЬТР: ЛІМІТ ПЕРЕВИЩЕНО (макс. 15/год). Спробуйте через ${remainingMins} хв.`
    };
  }

  return { allowed: true };
};

const updateRateLimit = () => {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const rawData = localStorage.getItem("gemini_rate_limit");
  let data: RateLimitData = { lastGenerated: 0, history: [] };

  if (rawData) {
    try {
      data = JSON.parse(rawData);
    } catch {
      // Ignore
    }
  }

  const oneHourAgo = now - 60 * 60 * 1000;
  data.history = (data.history || []).filter(t => t > oneHourAgo);

  data.lastGenerated = now;
  data.history.push(now);

  localStorage.setItem("gemini_rate_limit", JSON.stringify(data));
};

export default function Translator() {
  const [activeBranch, setActiveBranch] = useState<Branch>("СБС");
  const [generationLength, setGenerationLength] = useState<GenerationLength>("s");
  const [inputText, setInputText] = useState("");
  const [reportData, setReportData] = useState<TranslationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState("");
  const [rateError, setRateError] = useState<string | null>(null);

  const isInputReady = inputText.trim().length > 0;

  // Generate initial document number and date on mount
  useEffect(() => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    setDocNumber(`ЗВ-${year}/${month}/${day}-${rand}`);
    setDocDate(`${day}.${month}.${year} о ${hours}:${minutes}`);
  }, []);

  // Loading steps text rotation
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadingMessages = [
    "НАДСИЛАННЯ ПАКЕТУ ДАНИХ КРІЗЬ CLOUDFLARE SHIELD...",
    "ОБРОБКА ЗАПИТУ ШТРУМЕЛЬ-ІНТЕЛЕКТОМ (LLM)...",
    "ФОРМУВАННЯ СТРУКТУРОВАНОГО JSON ПАКЕТУ ЗГІДНО СТАНДАРТІВ...",
    "АКТИВАЦІЯ СЕД ТА СИМУЛЯЦІЯ ПОСАДОВИХ ОСІБ..."
  ];

  const runTranslation = async () => {
    if (!isInputReady || isLoading) return;

    // Check Rate Limiting before execution
    const limitCheck = checkRateLimit();
    if (!limitCheck.allowed) {
      setRateError(limitCheck.message || "АНТИСПАМ-ФІЛЬТР: ДОСТУП ТИМЧАСОВО ОБМЕЖЕНО.");
      return;
    }
    setRateError(null);

    setIsLoading(true);
    setActionNotice(null);

    // Generate dynamic date/time for the actual translation event
    const rand = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const currentDocNumber = `ЗВ-${year}/${month}/${day}-${rand}`;
    const currentDocDate = `${day}.${month}.${year} о ${hours}:${minutes}`;
    const currentDateTimeStr = `${day}.${month}.${year} ${hours}:${minutes}`;
    
    setDocNumber(currentDocNumber);
    setDocDate(currentDocDate);

    try {
      // Map UI branch names to vocabulary.json branch names
      const branchMapping: Record<string, string> = {
        "СБС": "Сили безпілотних систем",
        "Повітряні Сили": "Повітряні Сили",
        "Війська Зв'язку": "Війська зв'язку та кібербезпеки",
        "Сухопутні Війська": "Сухопутні війська",
        "ВМС": "Військово-Морські Сили",
      };

      const targetBranch = branchMapping[activeBranch] || activeBranch;

      // Filter relevant examples from vocabulary.json for few-shot learning
      const targetBranchExamples = vocabularyData.filter(ex => ex.branch === targetBranch).slice(0, 4);
      const otherBranchExamples = vocabularyData.filter(ex => ex.branch !== targetBranch).slice(0, 2);
      const selectedExamples = [...targetBranchExamples, ...otherBranchExamples];

      const examplesPrompt = selectedExamples.map((ex, index) => `
Example ${index + 1}:
Branch: ${ex.branch}
Input: "${ex.input}"
Output JSON:
${JSON.stringify(ex.output, null, 2)}
`).join('\n');

      const selectedLengthOption =
        GENERATION_LENGTH_OPTIONS.find((option) => option.value === generationLength) ||
        GENERATION_LENGTH_OPTIONS[0];

      const systemPrompt = `
You are the core AI translation engine of "Програмний комплекс автоматизації бюрократії v2.4" for the Armed Forces of Ukraine (ЗСУ).
Your job is to translate mundane, civilian everyday phrases in Ukrainian into absurdly over-engineered, formal, deadpan military reports ("Рапорти") that match the exact tone of Ukrainian army paperwork and electronic document management (СЕД).

Rules:
1. The output MUST be a valid JSON object matching the schema below. Do not output markdown block wrappers (like \`\`\`json) inside the JSON response itself.
2. The "report" field MUST start with the word "ДІЙСНИМ ДОПОВІДАЮ: ".
3. Use highly formal, passive, bureaucratic Ukrainian military jargon (e.g. "особовий склад", "несанкціоноване втручання", "деградація цифрового контуру", "вилучення", "контроль за виконанням покласти на").
4. If appropriate, incorporate the exact date and time of the incident (provided in the user request: ${currentDateTimeStr}) into the report text (e.g., "станом на ${day}.${month}.${year} року", "о ${hours}:${minutes} відбувся інцидент...").
5. "resolution" must represent a formal command or resolution from a commanding officer addressing the situation in a bureaucratic way.
6. "order" must represent a directive to be distributed to the staff.
7. "approvers" is an array of 2-3 officers. Each object must have a "role" and "status". Keep status uppercase, and append the date and time of approval using the provided date (e.g., "ПОГОДЖЕНО ${day}.${month}.${year} о ${hours}:${minutes}", "КОНТРОЛЬ ВСТАНОВЛЕНО ${day}.${month}.${year} о ${hours}:${minutes}").
8. If the input mentions animals (dogs, cats, birds, etc.), you MUST automatically include "Начальник кінологічної служби" in the "approvers" list.
9. "regulation" must cite a funny, fictional, but very official-sounding military regulation (e.g. "Стаття X Настанови з Y").
10. "authorized_by" should be a title like "Командир військової частини" or "Начальник зв'язку" optionally signed with a username like "k.vernadska" or "gonezales1978".
11. "operation_code" should be a funny military code starting with "КОД-" (e.g. "КОД-ГІДРАНТ-СПИРТ-200").
12. The selected generation size is a minimum word target for the full JSON response, counting all text fields together. For this request, target at least ${selectedLengthOption.minWords} words total.
13. Prefer natural expansion of the report, resolution, and order to satisfy the target. Avoid filler, repetition, or placeholders just to pad length.

JSON Schema:
{
  "report": "string (starts with 'ДІЙСНИМ ДОПОВІДАЮ: ')",
  "resolution": "string",
  "order": "string",
  "approvers": [
    { "role": "string", "status": "string" }
  ],
  "regulation": "string",
  "authorized_by": "string",
  "operation_code": "string"
}
`;

      const userPrompt = `
Here are some examples of translations for reference:
${examplesPrompt}

Now, translate the following request:
Branch: ${targetBranch}
Current Date & Time of Incident: ${currentDateTimeStr}
Selected Generation Size: ${selectedLengthOption.label}
Minimum Word Target: ${selectedLengthOption.minWords} words total across the JSON response
Input: "${inputText}"
Output JSON:
`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: selectedLengthOption.maxOutputTokens
        }
      };

      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Translation request via Cloudflare Worker failed");
      }

      const data = (await response.json()) as ProviderResponse;

      const text = extractGeneratedText(data);
      if (!text) {
        throw new Error("Invalid response structure from provider API");
      }

      const parsedResponse = JSON.parse(normalizeResponseText(text)) as TranslationResponse;
      setReportData(parsedResponse);
      
      // Update Rate Limit data upon successful generation
      updateRateLimit();
    } catch (error: any) {
      console.error(error);
      setReportData({
        report:
          "ДІЙСНИМ ДОПОВІДАЮ: у зв'язку з виникненням критичної помилки при взаємодії з Cloudflare Worker проксі-сервером, передачу даних призупинено. Перевірте працездатність проксі-каналу та повторіть спробу.",
        regulation: "Стаття 503 Тимчасового регламенту шлюзів",
        authorized_by: "Системний термінал проксі / cloudflare.proxy",
        operation_code: "КОД-ШЛЮЗ-ПОМИЛКА-503",
        resolution: "Начальнику зв'язку здійснити перевірку працездатності Cloudflare Worker.",
        order: "Особовому складу перейти в автономний режим радіомовчання.",
        approvers: [
          { role: "Користувач системи", status: "ШЛЮЗ ЗАБЛОКОВАНО" },
          { role: "Черговий інженер Cloudflare", status: "ПОМИЛКА З'ЄДНАННЯ" }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onCopy = async () => {
    if (!reportData) return;

    const approversStr = reportData.approvers
      ? reportData.approvers.map(a => `- ${a.role}: [${a.status}]`).join('\n')
      : '';

    const output = `--- МІНІСТЕРСТВО ОБОРОНИ УКРАЇНИ ---
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

    try {
      await navigator.clipboard.writeText(output);
      setActionNotice("СКОПІЙОВАНО ДО БУФЕРА ОБМІНУ (ФОРМАТОВАНИЙ РАПОРТ).");
    } catch {
      setActionNotice("НЕ ВДАЛОСЯ СКОПІЮВАТИ. НАДАЙТЕ ДОСТУП ДО БУФЕРА.");
    }
  };

  const onShare = async () => {
    if (!reportData) return;

    const payload = {
      title: `Рапорт ${docNumber}`,
      text: `${reportData.report}\n[${reportData.operation_code}]`,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        setActionNotice("МЕНЮ НАДСИЛАННЯ ВІДКРИТО.");
        return;
      }

      await navigator.clipboard.writeText(payload.text);
      setActionNotice("НАДСИЛАННЯ НЕПІДТРИМУЄТЬСЯ. КОРОТКИЙ ТЕКСТ СКОПІЙОВАНО.");
    } catch {
      setActionNotice("НЕ ВДАЛОСЯ НАДІСЛАТИ ДАНІ.");
    }
  };

  const getStatusIcon = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes("погоджено") || lower.includes("затверджено")) {
      return <CheckCircle2 size={14} className="text-[#00ff66]" />;
    }
    if (lower.includes("службове") || lower.includes("пошкодження") || lower.includes("помилка") || lower.includes("відмова") || lower.includes("не")) {
      return <ShieldAlert size={14} className="text-red-400 animate-pulse" />;
    }
    return <Clock size={14} className="text-amber-400" />;
  };

  const getStatusClass = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes("погоджено") || lower.includes("затверджено")) {
      return "border-green-500/30 bg-green-500/10 text-green-400";
    }
    if (lower.includes("службове") || lower.includes("пошкодження") || lower.includes("помилка") || lower.includes("відмова") || lower.includes("не")) {
      return "border-red-500/30 bg-red-500/10 text-red-400";
    }
    return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  };

  return (
    <main className="min-h-screen bg-[#070a08] px-4 py-8 font-mono text-[#94aa8c] sm:px-6 relative">
      <div className="crt-overlay" />
      <div className="screen-vignette" />

      <div className="mx-auto w-full max-w-6xl space-y-6 relative z-10">
        
        {/* Terminal Header */}
        <header className="rounded border border-[#22321e] bg-[#0f1510] p-4 sm:p-6 shadow-[0_0_15px_rgba(15,21,16,0.5)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-500 animate-ping inline-block" />
                <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-[#00ff66] sm:text-2xl drop-shadow-[0_0_8px_rgba(0,255,102,0.4)]">
                  ЗГІДНО-ВІДПОВІДНО
                </h1>
              </div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#5c7056]">
                Автоматизований Перекладач Військової Бюрократії {APP_VERSION}
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded border border-[#22321e] bg-[#070a08] px-4 py-2 text-xs uppercase tracking-[0.15em] text-[#f19f38]">
              <span className="h-2 w-2 rounded-full bg-[#f19f38] animate-pulse" />
              БЕЗПЕКА: ПРОКСІ-З'ЄДНАННЯ CLOUDFLARE
            </div>
          </div>
        </header>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
          
          {/* Left Column: Input Form & Controls */}
          <div className="space-y-6">
            
            {/* Branch Selector */}
            <section className="rounded border border-[#22321e] bg-[#0f1510] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-[#00ff66]" />
                <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#00ff66]">
                  Вибір Роду Військ
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {BRANCHES.map((branch) => {
                  const isActive = activeBranch === branch;
                  return (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => setActiveBranch(branch)}
                      className={`border px-3 py-2.5 text-left text-xs uppercase tracking-[0.1em] transition-all relative overflow-hidden ${
                        isActive
                          ? "border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.15)]"
                          : "border-[#22321e] bg-[#070a08]/50 text-[#94aa8c] hover:border-[#00ff66]/50 hover:text-[#00ff66]"
                      }`}
                    >
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00ff66]" />}
                      {branch}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Generation Length */}
            <section className="rounded border border-[#22321e] bg-[#0f1510] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-[#00ff66]" />
                <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#00ff66]">
                  Довжина генерації / Minimum words
                </h2>
              </div>
              <div className="space-y-2">
                {GENERATION_LENGTH_OPTIONS.map((option) => {
                  const isActive = generationLength === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center justify-between border px-3 py-2.5 text-xs uppercase tracking-[0.1em] cursor-pointer transition-all ${
                        isActive
                          ? "border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66]"
                          : "border-[#22321e] bg-[#070a08]/50 text-[#94aa8c] hover:border-[#00ff66]/50 hover:text-[#00ff66]"
                      }`}
                    >
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-[0.7rem] normal-case tracking-normal text-inherit/80">
                        {option.minWords}+ words
                      </span>
                      <input
                        type="radio"
                        name="generation-length"
                        value={option.value}
                        checked={isActive}
                        onChange={() => setGenerationLength(option.value)}
                        disabled={isLoading}
                        className="h-3.5 w-3.5 accent-[#00ff66]"
                      />
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Input Textarea & Presets */}
            <section className="rounded border border-[#22321e] bg-[#0f1510] p-4 sm:p-5 relative overflow-hidden">
              {isLoading && <div className="scanner-line" />}
              
              <div className="flex justify-between items-center mb-3">
                <label
                  htmlFor="civil-input"
                  className="text-xs uppercase tracking-[0.2em] font-semibold text-[#00ff66] flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00ff66]" />
                  Цивільний опис інциденту
                </label>
                <span className="text-[0.65rem] text-[#5c7056] uppercase tracking-[0.1em]">
                  {inputText.length} символів
                </span>
              </div>
              
              <textarea
                id="civil-input"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Наприклад: Кіт скинув вазон на клавіатуру ноута..."
                disabled={isLoading}
                className="h-32 w-full resize-none border border-[#22321e] bg-[#070a08] p-3 text-sm text-[#e9f0e6] outline-none transition-all placeholder:text-[#3d5037] focus:border-[#00ff66] focus:shadow-[0_0_8px_rgba(0,255,102,0.1)] focus:ring-1 focus:ring-[#00ff66]/20 font-sans"
              />
              
              <div className="mt-4">
                <p className="mb-2 text-[0.65rem] uppercase tracking-[0.15em] text-[#5c7056]">
                  Швидкі шаблони (Presets)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setInputText(preset)}
                      className="border border-[#22321e] bg-[#070a08]/30 px-2 py-1 text-[0.7rem] uppercase tracking-[0.05em] text-[#94aa8c] transition-all hover:border-[#00ff66] hover:text-[#00ff66] hover:bg-[#00ff66]/5 rounded-sm"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              
              {!isInputReady && (
                <p className="mt-3 text-[0.68rem] uppercase tracking-[0.1em] text-[#ef4444] flex items-center gap-1.5">
                  ⚠️ ВВЕДІТЬ ОПИС ДЛЯ ІНІЦІАЛІЗАЦІЇ.
                </p>
              )}
              {rateError && (
                <p className="mt-3 text-[0.68rem] uppercase tracking-[0.1em] text-red-400 flex items-center gap-1.5">
                  ⚠️ {rateError}
                </p>
              )}
            </section>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isLoading || !isInputReady}
              onClick={runTranslation}
              className={`flex w-full items-center justify-center gap-3 border px-4 py-3.5 text-xs font-bold uppercase tracking-[0.25em] transition-all duration-300 ${
                isLoading || !isInputReady
                  ? "cursor-not-allowed border-[#22321e] bg-[#0d130e] text-[#4d5e46]"
                  : "border-[#00ff66] bg-[#00ff66]/5 text-[#00ff66] hover:bg-[#00ff66]/15 hover:shadow-[0_0_15px_rgba(0,255,102,0.2)] active:scale-[0.98]"
              }`}
            >
              {isLoading ? (
                <RefreshCw size={15} className="animate-spin text-[#00ff66]" />
              ) : (
                <WandSparkles size={15} />
              )}
              {isLoading
                ? "ОБРОБКА ЗАПИТУ ШТРУМЕЛЬ-ІНТЕЛЕКТОМ..."
                : "ЗГЕНЕРУВАТИ РАПОРТ"}
            </button>
          </div>

          {/* Right Column: Output Document */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex h-96 flex-col items-center justify-center rounded border border-[#22321e] bg-[#0f1510] p-6 text-center space-y-4 relative overflow-hidden">
                <div className="scanner-line" />
                <RefreshCw size={32} className="animate-spin text-[#00ff66]" />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#00ff66] font-bold animate-pulse">
                    СИСТЕМНИЙ ЗБІР МАТЕРІАЛІВ...
                  </p>
                  <p className="text-[0.7rem] uppercase tracking-[0.15em] text-[#5c7056] max-w-sm leading-relaxed">
                    {loadingMessages[loadingStep]}
                  </p>
                </div>
              </div>
            ) : reportData ? (
              <div className="space-y-4">
                
                {/* Official Military Blank Sheet */}
                <section className="rounded border border-[#22321e] bg-[#0f1510] p-5 sm:p-8 shadow-[0_0_20px_rgba(0,0,0,0.4)] relative overflow-hidden border-t-4 border-t-[#00ff66]">
                  
                  {/* Watermark Diagonal Stamp */}
                  <div className="absolute right-6 top-24 pointer-events-none opacity-[0.06] transform rotate-[-25deg] select-none z-0">
                    <div className="border-[6px] border-double border-[#00ff66] px-6 py-3 text-3xl font-black tracking-[0.25em] text-[#00ff66] uppercase rounded-sm">
                      {reportData.operation_code.includes("ПОМИЛКА") ? "ЗБІЙ СИСТЕМИ" : "ЗГІДНО-ВІДПОВІДНО"}
                    </div>
                  </div>

                  {/* Header Details */}
                  <div className="border-b border-[#22321e] pb-4 mb-6 z-10 relative">
                    <div className="flex justify-between items-start text-[0.68rem] text-[#5c7056] uppercase tracking-[0.12em] leading-relaxed">
                      <div>
                        <p className="font-bold text-[#94aa8c]">МІНІСТЕРСТВО ОБОРОНИ УКРАЇНИ</p>
                        <p>{activeBranch} (ЗСУ)</p>
                        <p>Військовий сегмент: СЕД V2.4</p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-[#94aa8c] font-bold">Вхідний №: <span className="text-[#00ff66]">{docNumber}</span></p>
                        <p>Дата: {docDate}</p>
                        <p className="text-[#f19f38]">ДСК (ДЛЯ СЛУЖБОВОГО КОРИСТУВАННЯ)</p>
                      </div>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="text-center my-6 z-10 relative">
                    <h3 className="text-base font-bold uppercase tracking-[0.4em] text-[#00ff66] drop-shadow-[0_0_5px_rgba(0,255,102,0.2)]">
                      Р А П О Р Т
                    </h3>
                  </div>

                  {/* Main Report Body */}
                  <div className="my-6 z-10 relative">
                    <p className="text-sm leading-relaxed text-[#e9f0e6] whitespace-pre-line font-sans indent-8">
                      {reportData.report}
                    </p>
                  </div>

                  {/* Resolution & Order */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-[#22321e] py-4 my-6 z-10 relative bg-[#070a08]/30 px-3 rounded-sm">
                    <div>
                      <h4 className="text-[0.65rem] uppercase tracking-[0.2em] text-[#5c7056] font-bold mb-1">
                        Резолюція Командування:
                      </h4>
                      <p className="text-xs text-[#94aa8c] leading-relaxed italic">
                        {reportData.resolution}
                      </p>
                    </div>
                    <div className="border-t md:border-t-0 md:border-l border-[#22321e] pt-3 md:pt-0 md:pl-4">
                      <h4 className="text-[0.65rem] uppercase tracking-[0.2em] text-[#5c7056] font-bold mb-1">
                        Вказівки / Наказ:
                      </h4>
                      <p className="text-xs text-[#94aa8c] leading-relaxed italic">
                        {reportData.order}
                      </p>
                    </div>
                  </div>

                  {/* Document Management approvals */}
                  <div className="my-6 z-10 relative">
                    <h4 className="text-[0.65rem] uppercase tracking-[0.2em] text-[#5c7056] font-bold mb-2">
                      Електронне погодження документа (СЕД):
                    </h4>
                    <div className="space-y-1.5">
                      {reportData.approvers && reportData.approvers.map((approver, index) => (
                        <div 
                          key={index}
                          className={`flex items-center justify-between border px-3 py-1.5 text-[0.7rem] rounded-sm uppercase tracking-[0.05em] ${getStatusClass(approver.status)}`}
                        >
                          <span className="font-semibold">{approver.role}</span>
                          <span className="flex items-center gap-1.5 font-bold text-[0.65rem]">
                            {getStatusIcon(approver.status)}
                            {approver.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Regulation & Sign off */}
                  <div className="mt-8 pt-4 border-t border-[#22321e] flex flex-col md:flex-row md:justify-between md:items-end gap-6 z-10 relative">
                    <div className="space-y-1">
                      <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#5c7056]">Регламентуюча база</p>
                      <p className="text-[0.75rem] text-[#00ff66]">{reportData.regulation}</p>
                    </div>

                    <div className="relative border border-[#22321e] bg-[#070a08]/80 px-4 py-2.5 text-right rounded-sm min-w-[200px]">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[#e9f0e6]">
                        {reportData.authorized_by}
                      </p>
                      <p className="text-[0.55rem] text-[#5c7056] uppercase tracking-[0.1em] mt-0.5">
                        Електронний підпис (ЕЦП)
                      </p>
                      <span className="pointer-events-none absolute -top-2.5 right-4 text-[0.58rem] font-bold tracking-[0.15em] text-[#00ff66] bg-[#0f1510] border border-[#22321e] px-1.5 py-0.5 rounded-sm">
                        ЗАТВЕРДЖЕНО
                      </span>
                    </div>
                  </div>

                  {/* Operation Code Footer */}
                  <div className="mt-6 pt-3 border-t border-dashed border-[#22321e] flex justify-between items-center text-[0.68rem] text-[#5c7056] uppercase tracking-[0.15em]">
                    <span>OPERATION CODE:</span>
                    <span className="text-sm font-bold text-[#00ff66] tracking-[0.2em]">{reportData.operation_code}</span>
                  </div>

                </section>

                {/* Document Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onCopy}
                    className="flex-1 flex items-center justify-center gap-2 border border-[#22321e] bg-[#0f1510] py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#94aa8c] transition-all hover:border-[#00ff66] hover:text-[#00ff66] hover:bg-[#00ff66]/5 rounded-sm"
                  >
                    <Copy size={13} />
                    Копіювати рапорт
                  </button>
                  <button
                    type="button"
                    onClick={onShare}
                    className="flex-1 flex items-center justify-center gap-2 border border-[#22321e] bg-[#0f1510] py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#94aa8c] transition-all hover:border-[#00ff66] hover:text-[#00ff66] hover:bg-[#00ff66]/5 rounded-sm"
                  >
                    <Share2 size={13} />
                    Поділитися
                  </button>
                </div>

                {actionNotice && (
                  <div className="rounded border border-[#22321e] bg-[#0f1510] px-4 py-2.5 text-center text-xs uppercase tracking-[0.15em] text-[#00ff66] animate-pulse">
                    {actionNotice}
                  </div>
                )}

              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center rounded border border-[#22321e] bg-[#0f1510] p-6 text-center text-[#5c7056] relative">
                <FileText size={40} className="mb-3 opacity-30 text-[#94aa8c]" />
                <p className="text-xs uppercase tracking-[0.2em] font-bold">Очікування вводу даних...</p>
                <p className="text-[0.68rem] uppercase tracking-[0.15em] mt-1.5 max-w-xs">
                  Заповніть опис події ліворуч та натисніть кнопку генерації рапорту.
                </p>
              </div>
            )}
          </div>

        </div>

        <footer className="border-t border-[#22321e] pt-4 text-center text-[0.68rem] uppercase tracking-[0.16em] text-[#5c7056]">
          <span>Відкритий код:</span>{" "}
          <a
            href="https://github.com/MaxSmile/zgidn-vidpovidno/"
            target="_blank"
            rel="noreferrer"
            className="text-[#00ff66] underline decoration-[#00ff66]/30 underline-offset-4 transition-colors hover:text-[#e9f0e6]"
          >
            MaxSmile/zgidn-vidpovidno
          </a>
        </footer>

      </div>
    </main>
  );
}
