import { useEffect, useState } from "react";
import { TranslatorControls } from "./translator/TranslatorControls";
import { TranslatorOutput } from "./translator/TranslatorOutput";
import {
  APP_VERSION,
  GENERATION_LENGTH_OPTIONS,
  LOADING_MESSAGES,
  NOTICE_COPIED,
  NOTICE_COPY_FAILED,
  NOTICE_SHARED,
  NOTICE_SHARE_FAILED,
  NOTICE_SHARE_FALLBACK,
} from "./translator/constants";
import { createDocumentMeta } from "./translator/documentMeta";
import { generateTranslation } from "./translator/generation";
import { checkRateLimit, updateRateLimit } from "./translator/rateLimit";
import { createGatewayErrorResponse, formatReportForCopy } from "./translator/reportFormatting";
import { countResponseWords, countWords } from "./translator/textMetrics";
import type { Branch, GenerationLength, TranslationResponse } from "./translator/types";
import {
  trackCopyReport,
  trackGenerateAttempt,
  trackGenerateError,
  trackGenerateSuccess,
  trackRateLimitBlocked,
  trackShareReport,
} from "../firebase/analytics";

function SupportUkraineBanner() {
  const [isHover, setIsHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onFocusCapture={() => setIsHover(true)}
      onBlurCapture={() => setIsHover(false)}
      style={{
        position: "relative",
        left: 0,
        top: 0,
        right: 0,
        background: "#000",
        display: "flex",
        justifyContent: "center",
        padding: "5px",
        zIndex: 10000,
        fontFamily: "arial",
      }}
    >
      <a
        href="https://u24.gov.ua"
        target="_blank"
        rel="noopener noreferrer"
        title="Donate to support freedom."
        style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
      >
        <div
          role="img"
          aria-label="Flag of Ukraine"
          style={{ height: "25px", marginRight: "10px" }}
        >
          <div style={{ width: "40px", height: "12.5px", background: "#005BBB" }} />
          <div style={{ width: "40px", height: "12.5px", background: "#FFD500" }} />
        </div>
        <div style={{ color: "white", fontSize: "12px", lineHeight: "25px" }}>
          Donate to support freedom.
        </div>
      </a>
      <a
        href="https://www.npmjs.com/package/react-support-ukraine-banner"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get the same banner on npm"
        title="Get the same: react-support-ukraine-banner"
        style={{
          position: "absolute",
          right: "10px",
          top: 0,
          height: "100%",
          display: "flex",
          alignItems: "center",
          fontSize: "12px",
          lineHeight: "25px",
          color: isHover ? "#fff" : "#000",
          transition: "color 150ms ease",
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        Get the same
      </a>
    </div>
  );
}

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
  const selectedLengthOption =
    GENERATION_LENGTH_OPTIONS.find((option) => option.value === generationLength) ||
    GENERATION_LENGTH_OPTIONS[0];
  const inputWordCount = countWords(inputText);
  const generatedWordCount = reportData ? countResponseWords(reportData) : 0;
  const generatedTargetPercent = reportData
    ? Math.min(100, Math.round((generatedWordCount / selectedLengthOption.minWords) * 100))
    : 0;
  const isGeneratedTargetMet = generatedWordCount >= selectedLengthOption.minWords;

  useEffect(() => {
    const initialDocumentMeta = createDocumentMeta();
    setDocNumber(initialDocumentMeta.docNumber);
    setDocDate(initialDocumentMeta.docDate);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoading]);

  const runTranslation = async () => {
    if (!isInputReady || isLoading) return;

    const limitCheck = checkRateLimit();
    if (!limitCheck.allowed) {
      setRateError(limitCheck.message || "АНТИСПАМ-ФІЛЬТР: ДОСТУП ТИМЧАСОВО ОБМЕЖЕНО.");
      trackRateLimitBlocked();
      return;
    }

    const documentMeta = createDocumentMeta();

    setRateError(null);
    setIsLoading(true);
    setActionNotice(null);
    setDocNumber(documentMeta.docNumber);
    setDocDate(documentMeta.docDate);
    trackGenerateAttempt(activeBranch, generationLength);

    try {
      const parsedResponse = await generateTranslation({
        activeBranch,
        inputText,
        selectedLengthOption,
        documentMeta,
      });

      setReportData(parsedResponse);
      updateRateLimit();
      trackGenerateSuccess(activeBranch, generationLength, countResponseWords(parsedResponse));
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      trackGenerateError(activeBranch, generationLength, errorMessage);
      setReportData(createGatewayErrorResponse());
    } finally {
      setIsLoading(false);
    }
  };

  const onCopy = async () => {
    if (!reportData) return;

    try {
      await navigator.clipboard.writeText(
        formatReportForCopy({
          reportData,
          docNumber,
          docDate,
          activeBranch,
        }),
      );
      setActionNotice(NOTICE_COPIED);
      trackCopyReport();
    } catch {
      setActionNotice(NOTICE_COPY_FAILED);
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
        setActionNotice(NOTICE_SHARED);
        trackShareReport();
        return;
      }

      await navigator.clipboard.writeText(payload.text);
      setActionNotice(NOTICE_SHARE_FALLBACK);
      trackShareReport();
    } catch {
      setActionNotice(NOTICE_SHARE_FAILED);
    }
  };

  return (
    <main className="min-h-screen bg-[#070a08] px-4 py-8 font-mono text-[#94aa8c] sm:px-6 relative">
      <div className="relative z-20 -mx-4 -mt-8 mb-8 sm:-mx-6">
        <SupportUkraineBanner />
      </div>

      <div className="crt-overlay" />
      <div className="screen-vignette" />

      <div className="mx-auto w-full max-w-6xl space-y-6 relative z-10">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
          <TranslatorControls
            activeBranch={activeBranch}
            generationLength={generationLength}
            inputText={inputText}
            inputWordCount={inputWordCount}
            isInputReady={isInputReady}
            isLoading={isLoading}
            rateError={rateError}
            onBranchChange={setActiveBranch}
            onGenerationLengthChange={setGenerationLength}
            onInputTextChange={setInputText}
            onSubmit={runTranslation}
          />

          <div className="space-y-4">
            <TranslatorOutput
              activeBranch={activeBranch}
              actionNotice={actionNotice}
              docDate={docDate}
              docNumber={docNumber}
              generatedTargetPercent={generatedTargetPercent}
              generatedWordCount={generatedWordCount}
              isGeneratedTargetMet={isGeneratedTargetMet}
              isLoading={isLoading}
              loadingStep={loadingStep}
              reportData={reportData}
              selectedLengthOption={selectedLengthOption}
              onCopy={onCopy}
              onShare={onShare}
            />
          </div>
        </div>

        <footer className="space-y-3 border-t border-[#22321e] pt-4 text-center text-[0.68rem] uppercase tracking-[0.16em] text-[#5c7056]">
          <p>
            <span>Потрібен AI-проєкт для бізнесу?</span>{" "}
            <a
              href="https://vasilkoff.com/"
              target="_blank"
              rel="noopener"
              className="text-[#00ff66] underline decoration-[#00ff66]/30 underline-offset-4 transition-colors hover:text-[#e9f0e6]"
            >
              Vasilkoff Ltd builds practical AI, web, and automation products
            </a>
          </p>
          <p>
            <span>Відкритий код:</span>{" "}
            <a
              href="https://github.com/MaxSmile/zgidn-vidpovidno/"
              target="_blank"
              rel="noreferrer"
              className="text-[#00ff66] underline decoration-[#00ff66]/30 underline-offset-4 transition-colors hover:text-[#e9f0e6]"
            >
              MaxSmile/zgidn-vidpovidno
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
