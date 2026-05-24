import { useState } from "react";
import { Copy, Share2, WandSparkles } from "lucide-react";

type Branch =
  | "СБС"
  | "Повітряні Сили"
  | "Війська Зв'язку"
  | "Сухопутні Війська"
  | "ВМС";

type TranslationResponse = {
  report: string;
  regulation: string;
  authorized_by: string;
  operation_code: string;
};

const BRANCHES: Branch[] = [
  "СБС",
  "Повітряні Сили",
  "Війська Зв'язку",
  "Сухопутні Війська",
  "ВМС",
];

const PRESETS = ["Купити хліба", "Лягти спати", "Зробити каву"];
const APP_VERSION = "v2.4";

export default function Translator() {
  const [activeBranch, setActiveBranch] = useState<Branch>("СБС");
  const [inputText, setInputText] = useState("");
  const [reportData, setReportData] = useState<TranslationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const isInputReady = inputText.trim().length > 0;

  const runTranslation = async () => {
    if (!isInputReady || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch: activeBranch,
          input: inputText,
        }),
      });

      if (!response.ok) {
        throw new Error("Translation request failed");
      }

      const data: TranslationResponse = await response.json();
      setReportData(data);
    } catch {
      setReportData({
        report:
          "ПОМИЛКА ЗВ'ЯЗКУ З ШТРУМЕЛЬ-ІНТЕЛЕКТОМ. ПОВТОРІТЬ ЗАПИТ ПІСЛЯ ВІДНОВЛЕННЯ КАНАЛУ.",
        regulation: "R-ERR-17",
        authorized_by: "Система аварійного реагування",
        operation_code: "FAILSAFE-000",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onCopy = async () => {
    if (!reportData) return;

    const output = `${reportData.report}

Регламент: ${reportData.regulation}
Відповідальний: ${reportData.authorized_by}
Код операції: ${reportData.operation_code}`;

    try {
      await navigator.clipboard.writeText(output);
      setActionNotice("СКОПІЙОВАНО ДО БУФЕРА ОБМІНУ.");
    } catch {
      setActionNotice("НЕ ВДАЛОСЯ СКОПІЮВАТИ. ПЕРЕВІРТЕ ДОСТУП ДО БУФЕРА.");
    }
  };

  const onShare = async () => {
    if (!reportData) return;

    const payload = {
      title: "Zgidno-Vidpovidno",
      text: `${reportData.report}\n[${reportData.operation_code}]`,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        setActionNotice("НАДСИЛАННЯ ІНІЦІЙОВАНО.");
        return;
      }

      await navigator.clipboard.writeText(payload.text);
      setActionNotice("ДАНІ ПІДГОТОВЛЕНО ТА СКОПІЙОВАНО.");
    } catch {
      setActionNotice("НЕ ВДАЛОСЯ НАДІСЛАТИ/СКОПІЮВАТИ ДАНІ.");
    }
  };

  return (
    <main className="min-h-screen bg-[#131a10] px-4 py-8 font-mono text-[#a3b899] sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="rounded-md border border-[#3b4d35] bg-[#1a2416] p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold uppercase tracking-[0.24em] text-green-400 sm:text-2xl">
                Zgidno-Vidpovidno
              </h1>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#79906f]">{APP_VERSION}</p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded border border-[#3b4d35] px-3 py-2 text-xs uppercase tracking-[0.18em] text-red-400 sm:self-auto">
              <span className="animate-pulse text-green-400">●</span>
              БОЙОВА ГОТОВНІСТЬ
            </div>
          </div>
        </header>

        <section className="rounded-md border border-[#3b4d35] bg-[#1a2416] p-4 sm:p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#79906f]">Рід військ</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {BRANCHES.map((branch) => {
              const isActive = activeBranch === branch;
              return (
                <button
                  key={branch}
                  type="button"
                  onClick={() => setActiveBranch(branch)}
                  className={`border px-3 py-2 text-xs uppercase tracking-[0.12em] transition-colors ${
                    isActive
                      ? "border-green-400 bg-green-400/10 text-green-400"
                      : "border-[#3b4d35] bg-transparent text-[#a3b899] hover:border-green-500 hover:text-green-400"
                  }`}
                >
                  {branch}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-md border border-[#3b4d35] bg-[#1a2416] p-4 sm:p-6">
          <label
            htmlFor="civil-input"
            className="mb-3 block text-xs uppercase tracking-[0.22em] text-[#79906f]"
          >
            Цивільний текст
          </label>
          <textarea
            id="civil-input"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="Введіть цивільний запит..."
            className="h-36 w-full resize-y border border-[#3b4d35] bg-[#131a10] p-3 text-sm text-[#a3b899] outline-none transition-colors placeholder:text-[#5e7058] focus:border-green-400"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setInputText(preset)}
                className="border border-[#3b4d35] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[#a3b899] transition-colors hover:border-green-500 hover:text-green-400"
              >
                {preset}
              </button>
            ))}
          </div>
          {!isInputReady && (
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-red-400">
              Введіть текст для запуску перекладу.
            </p>
          )}
        </section>

        <button
          type="button"
          disabled={isLoading || !isInputReady}
          aria-label={
            isInputReady
              ? "Запустити процедуру перекладу"
              : "Введіть текст перед запуском процедури перекладу"
          }
          onClick={runTranslation}
          className={`flex w-full items-center justify-center gap-2 border px-4 py-3 text-xs uppercase tracking-[0.22em] transition-colors ${
            isLoading || !isInputReady
              ? "cursor-not-allowed border-[#4d5e46] bg-[#263120] text-[#8fa082]"
              : "border-green-400 bg-green-400/10 text-green-400 hover:bg-green-400/20"
          }`}
        >
          <span className={isLoading ? "animate-pulse" : ""}>
            <WandSparkles size={16} />
          </span>
          {isLoading
            ? "ОБРОБКА ДАНИХ ШТРУМЕЛЬ-ІНТЕЛЕКТОМ..."
            : "ЗАПУСТИТИ ПРОЦЕДУРУ ПЕРЕКЛАДУ"}
        </button>

        {reportData && (
          <section className="rounded-md border border-dashed border-[#4a6140] bg-[#1a2416] p-4 sm:p-6">
            <p className="text-sm italic leading-relaxed text-[#bed1b6]">{reportData.report}</p>

            <div className="mt-5 grid gap-4 border-t border-[#3b4d35] pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#79906f]">regulation</p>
                <p className="mt-1 text-sm text-green-400">{reportData.regulation}</p>
              </div>

              <div className="relative border border-[#5b6f53] px-3 py-2 text-right text-xs uppercase tracking-[0.14em] text-[#d2dbc7] [transform:skew(-6deg)]">
                <p>{reportData.authorized_by}</p>
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[0.6rem] tracking-[0.3em] text-red-400/80 [transform:rotate(-12deg)]">
                  ЗАТВЕРДЖЕНО
                </span>
              </div>
            </div>

            <div className="mt-4 border-l-2 border-green-400 pl-3">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[#79906f]">operation code</p>
              <p className="mt-1 text-base font-semibold uppercase tracking-[0.18em] text-green-400">
                {reportData.operation_code}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-2 border border-[#3b4d35] px-3 py-2 text-xs uppercase tracking-[0.14em] transition-colors hover:border-green-500 hover:text-green-400"
              >
                <Copy size={14} />
                Copy
              </button>
              <button
                type="button"
                onClick={onShare}
                className="inline-flex items-center gap-2 border border-[#3b4d35] px-3 py-2 text-xs uppercase tracking-[0.14em] transition-colors hover:border-green-500 hover:text-green-400"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>
            {actionNotice && (
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#99b78d]">{actionNotice}</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
