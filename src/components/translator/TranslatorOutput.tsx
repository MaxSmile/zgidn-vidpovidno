import { useState } from "react";
import { BookmarkCheck, Copy, FileText, LoaderCircle, RefreshCw, Share2 } from "lucide-react";
import { CLS_ACTION_BTN, formatGenerationWordMinimum, LOADING_MESSAGES } from "./constants";
import { ShareCardDialog } from "./ShareCardDialog";
import { createShareCardData } from "./shareCard";
import { getStatusClass, getStatusIcon } from "./statusStyle";
import type { Branch, GenerationLengthOption, TranslationResponse } from "./types";

type TranslatorOutputProps = {
  activeBranch: Branch;
  actionNotice: string | null;
  docDate: string;
  docNumber: string;
  generatedTargetPercent: number;
  generatedWordCount: number;
  isGeneratedTargetMet: boolean;
  isLoading: boolean;
  isShareLoading: boolean;
  loadingStep: number;
  reportData: TranslationResponse | null;
  savedCaseId: string | null;
  selectedLengthOption: GenerationLengthOption;
  onCopy: () => void;
  onCreateCaseUrl: () => Promise<string | null>;
  onShare: () => void;
};

export function TranslatorOutput({
  activeBranch,
  actionNotice,
  docDate,
  docNumber,
  generatedTargetPercent,
  generatedWordCount,
  isGeneratedTargetMet,
  isLoading,
  isShareLoading,
  loadingStep,
  reportData,
  savedCaseId,
  selectedLengthOption,
  onCopy,
  onCreateCaseUrl,
  onShare,
}: TranslatorOutputProps) {
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    if (isPdfLoading || !reportData) return;
    setIsPdfLoading(true);
    try {
      const { generatePdf } = await import("./pdfGenerator");
      await generatePdf({ activeBranch, docDate, docNumber, reportData });
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded border border-[#22321e] bg-[#0f1510] p-6 text-center space-y-4 relative overflow-hidden">
        <div className="pointer-events-none absolute left-8 right-8 top-8 h-px bg-gradient-to-r from-transparent via-[#00ff66]/40 to-transparent" />
        <RefreshCw size={32} className="relative z-10 animate-spin text-[#00ff66]" />
        <div className="relative z-10 space-y-2">
          <div className="flex h-12 items-center justify-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#00ff66] font-bold animate-pulse">
              {LOADING_MESSAGES[loadingStep]}
            </p>
          </div>
          <p className="text-[0.65rem] uppercase tracking-[0.15em] text-[#94aa8c]">
            Ціль генерації: {formatGenerationWordMinimum(selectedLengthOption)}
          </p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded border border-[#22321e] bg-[#0f1510] p-6 text-center text-[#5c7056] relative">
        <FileText size={40} className="mb-3 opacity-30 text-[#94aa8c]" />
        <p className="text-xs uppercase tracking-[0.2em] font-bold">Очікування вводу даних...</p>
        <p className="text-[0.68rem] uppercase tracking-[0.15em] mt-1.5 max-w-xs">
          Заповніть опис події ліворуч та натисніть кнопку генерації рапорту.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded border border-[#22321e] bg-[#0f1510] p-5 sm:p-8 shadow-[0_0_20px_rgba(0,0,0,0.4)] relative overflow-hidden border-t-4 border-t-[#00ff66]">
        {savedCaseId && (
          <div className="mb-5 flex items-center gap-2 border border-[#00ff66]/35 bg-[#00ff66]/5 px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-[#00ff66]">
            <BookmarkCheck size={14} />
            Збережений результат · ID {savedCaseId}
          </div>
        )}
        <div className="absolute right-6 top-24 pointer-events-none opacity-[0.06] transform rotate-[-25deg] select-none z-0">
          <div className="border-[6px] border-double border-[#00ff66] px-6 py-3 text-3xl font-black tracking-[0.25em] text-[#00ff66] uppercase rounded-sm">
            {reportData.operation_code.includes("ПОМИЛКА") ? "ЗБІЙ СИСТЕМИ" : "ЗГІДНО-ВІДПОВІДНО"}
          </div>
        </div>

        <div className="border-b border-[#22321e] pb-4 mb-6 z-10 relative">
          <div className="flex justify-between items-start text-[0.68rem] text-[#5c7056] uppercase tracking-[0.12em] leading-relaxed">
            <div>
              <p className="font-bold text-[#94aa8c]">МІНІСТЕРСТВО ОБОРОНИ УКРАЇНИ</p>
              <p>{activeBranch} (ЗСУ)</p>
              <p>Військовий сегмент: СЕД V2.4</p>
            </div>
            <div className="text-right font-mono">
              <p className="text-[#94aa8c] font-bold">
                Вхідний №: <span className="text-[#00ff66]">{docNumber}</span>
              </p>
              <p>Дата: {docDate}</p>
              <p className="text-[#f19f38]">ДСК (ДЛЯ СЛУЖБОВОГО КОРИСТУВАННЯ)</p>
            </div>
          </div>
          <div className="mt-4 border border-[#22321e] bg-[#070a08]/70 px-3 py-2">
            <div className="mb-1.5 flex flex-col gap-1 text-[0.65rem] uppercase tracking-[0.12em] sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[#5c7056]">Лічильник згенерованих слів</span>
              <span className={isGeneratedTargetMet ? "text-[#00ff66]" : "text-[#f19f38]"}>
                {generatedWordCount} / {formatGenerationWordMinimum(selectedLengthOption)}
              </span>
            </div>
            <div className="h-1.5 border border-[#22321e] bg-[#070a08]">
              <div
                className={`h-full transition-all ${isGeneratedTargetMet ? "bg-[#00ff66]" : "bg-[#f19f38]"}`}
                style={{ width: `${generatedTargetPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-center my-6 z-10 relative">
          <h3 className="text-base font-bold uppercase tracking-[0.4em] text-[#00ff66] drop-shadow-[0_0_5px_rgba(0,255,102,0.2)]">
            Р А П О Р Т
          </h3>
        </div>

        <div className="my-6 z-10 relative">
          <p className="text-sm leading-relaxed text-[#e9f0e6] whitespace-pre-line font-sans indent-8">
            {reportData.report}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-[#22321e] py-4 my-6 z-10 relative bg-[#070a08]/30 px-3 rounded-sm">
          <div>
            <h4 className="text-[0.65rem] uppercase tracking-[0.2em] text-[#5c7056] font-bold mb-1">
              Резолюція Командування:
            </h4>
            <p className="text-xs text-[#94aa8c] leading-relaxed italic">{reportData.resolution}</p>
          </div>
          <div className="border-t md:border-t-0 md:border-l border-[#22321e] pt-3 md:pt-0 md:pl-4">
            <h4 className="text-[0.65rem] uppercase tracking-[0.2em] text-[#5c7056] font-bold mb-1">
              Вказівки / Наказ:
            </h4>
            <p className="text-xs text-[#94aa8c] leading-relaxed italic">{reportData.order}</p>
          </div>
        </div>

        <div className="my-6 z-10 relative">
          <h4 className="text-[0.65rem] uppercase tracking-[0.2em] text-[#5c7056] font-bold mb-2">
            Електронне погодження документа (СЕД):
          </h4>
          <div className="space-y-1.5">
            {reportData.approvers?.map((approver, index) => (
              <div
                key={`${approver.role}-${index}`}
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

        <div className="mt-6 pt-3 border-t border-dashed border-[#22321e] flex justify-between items-center text-[0.68rem] text-[#5c7056] uppercase tracking-[0.15em]">
          <span>OPERATION CODE:</span>
          <span className="text-sm font-bold text-[#00ff66] tracking-[0.2em]">{reportData.operation_code}</span>
        </div>
      </section>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <button type="button" onClick={onCopy} className={CLS_ACTION_BTN}>
          <Copy size={13} />
          Копіювати рапорт
        </button>
        <ShareCardDialog
          data={createShareCardData({ mode: "to_bureaucratic", activeBranch, reportData })}
          onCreateCaseUrl={onCreateCaseUrl}
        />
        <button
          type="button"
          disabled={isPdfLoading}
          onClick={handleDownloadPdf}
          className={`${CLS_ACTION_BTN} disabled:cursor-wait disabled:opacity-60`}
        >
          {isPdfLoading ? <LoaderCircle size={13} className="animate-spin" /> : <FileText size={13} />}
          {isPdfLoading ? "Завантаження..." : "Завантажити PDF"}
        </button>
        <button type="button" disabled={isShareLoading} onClick={onShare} className={`${CLS_ACTION_BTN} disabled:cursor-wait disabled:opacity-60`}>
          {isShareLoading ? <LoaderCircle size={13} className="animate-spin" /> : <Share2 size={13} />}
          {isShareLoading ? "Створення посилання..." : "Публічне посилання"}
        </button>
      </div>

      {actionNotice && (
        <div className="rounded border border-[#22321e] bg-[#0f1510] px-4 py-2.5 text-center text-xs uppercase tracking-[0.15em] text-[#00ff66] animate-pulse">
          {actionNotice}
        </div>
      )}
    </div>
  );
}
