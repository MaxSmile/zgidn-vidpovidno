import { FileText, RefreshCw, ShieldAlert, WandSparkles } from "lucide-react";
import {
  BRANCHES,
  CLS_BRANCH_BTN_ACTIVE,
  CLS_ITEM_ACTIVE,
  CLS_ITEM_INACTIVE,
  CLS_PANEL,
  CLS_SECTION_HEADING,
  formatGenerationWordMinimum,
  GENERATION_LENGTH_OPTIONS,
  PLAIN_INPUT_MAX_LENGTH,
  PLAIN_LANGUAGE_PRESETS,
  PRESETS,
} from "./constants";
import type { Branch, GenerationLength, TranslationMode } from "./types";

type TranslatorControlsProps = {
  activeBranch: Branch;
  generationLength: GenerationLength;
  inputText: string;
  inputWordCount: number;
  isInputReady: boolean;
  isLoading: boolean;
  mode: TranslationMode;
  rateError: string | null;
  onBranchChange: (branch: Branch) => void;
  onGenerationLengthChange: (generationLength: GenerationLength) => void;
  onInputTextChange: (inputText: string) => void;
  onSubmit: () => void;
};

export function TranslatorControls({
  activeBranch,
  generationLength,
  inputText,
  inputWordCount,
  isInputReady,
  isLoading,
  mode,
  rateError,
  onBranchChange,
  onGenerationLengthChange,
  onInputTextChange,
  onSubmit,
}: TranslatorControlsProps) {
  const isPlainMode = mode === "to_plain";
  const presets = isPlainMode ? PLAIN_LANGUAGE_PRESETS : PRESETS;

  return (
    <div className="space-y-6">
      {!isPlainMode && (
        <>
          <section className={CLS_PANEL}>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-[#00ff66]" />
              <h2 className={CLS_SECTION_HEADING}>Вибір Роду Військ</h2>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BRANCHES.map((branch) => {
                const isActive = activeBranch === branch;
                return (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => onBranchChange(branch)}
                    className={`border px-3 py-2.5 text-left text-xs uppercase tracking-[0.1em] transition-all relative overflow-hidden ${isActive ? CLS_BRANCH_BTN_ACTIVE : CLS_ITEM_INACTIVE}`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00ff66]" />}
                    {branch}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={CLS_PANEL}>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-[#00ff66]" />
              <h2 className={CLS_SECTION_HEADING}>Довжина генерації / Minimum words</h2>
            </div>
            <div className="space-y-2">
              {GENERATION_LENGTH_OPTIONS.map((option) => {
                const isActive = generationLength === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center justify-between border px-3 py-2.5 text-xs uppercase tracking-[0.1em] cursor-pointer transition-all ${isActive ? CLS_ITEM_ACTIVE : CLS_ITEM_INACTIVE}`}
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className="text-[0.7rem] normal-case tracking-normal text-inherit/80">
                      {formatGenerationWordMinimum(option)}
                    </span>
                    <input
                      type="radio"
                      name="generation-length"
                      value={option.value}
                      checked={isActive}
                      onChange={() => onGenerationLengthChange(option.value)}
                      disabled={isLoading}
                      className="h-3.5 w-3.5 accent-[#00ff66]"
                    />
                  </label>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className={`${CLS_PANEL} relative overflow-hidden`}>
        {isLoading && <div className="scanner-line" />}

        <div className="flex justify-between items-center mb-3">
          <label htmlFor="translator-input" className={`${CLS_SECTION_HEADING} flex items-center gap-2`}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ff66]" />
            {isPlainMode ? "Текст рапорту або службового документа" : "Цивільний опис інциденту"}
          </label>
          <span className="text-right text-[0.65rem] text-[#5c7056] uppercase tracking-[0.1em]">
            {inputWordCount} слів / {inputText.length} символів
          </span>
        </div>

        {isPlainMode && (
          <div className="mb-3 flex gap-2 border border-[#f19f38]/40 bg-[#f19f38]/5 p-3 text-[0.68rem] leading-relaxed text-[#d6aa72]">
            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-[#f19f38]" />
            <p>
              Не вставляйте секретні або персональні дані без анонімізації. Текст передається
              через Cloudflare Worker до зовнішнього AI-провайдера.
            </p>
          </div>
        )}

        <textarea
          id="translator-input"
          value={inputText}
          onChange={(event) => onInputTextChange(event.target.value)}
          placeholder={
            isPlainMode
              ? "Вставте текст рапорту, наказу або службової записки..."
              : "Наприклад: Кіт скинув вазон на клавіатуру ноута..."
          }
          maxLength={isPlainMode ? PLAIN_INPUT_MAX_LENGTH : undefined}
          disabled={isLoading}
          className={`${isPlainMode ? "h-64" : "h-32"} w-full resize-none border border-[#22321e] bg-[#070a08] p-3 text-sm text-[#e9f0e6] outline-none transition-all placeholder:text-[#3d5037] focus:border-[#00ff66] focus:shadow-[0_0_8px_rgba(0,255,102,0.1)] focus:ring-1 focus:ring-[#00ff66]/20 font-sans`}
        />

        <div className="mt-4">
          <p className="mb-2 text-[0.65rem] uppercase tracking-[0.15em] text-[#5c7056]">
            {isPlainMode ? "Приклади документів" : "Швидкі шаблони (Presets)"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset, index) => (
              <button
                key={preset}
                type="button"
                disabled={isLoading}
                onClick={() => onInputTextChange(preset)}
                className="border border-[#22321e] bg-[#070a08]/30 px-2 py-1 text-[0.7rem] uppercase tracking-[0.05em] text-[#94aa8c] transition-all hover:border-[#00ff66] hover:text-[#00ff66] hover:bg-[#00ff66]/5 rounded-sm"
              >
                {isPlainMode ? `Приклад ${index + 1}` : preset}
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

      <button
        type="button"
        disabled={isLoading || !isInputReady}
        onClick={onSubmit}
        className={`flex w-full items-center justify-center gap-3 border px-4 py-3.5 text-xs font-bold uppercase tracking-[0.25em] transition-all duration-300 ${
          isLoading || !isInputReady
            ? "cursor-not-allowed border-[#22321e] bg-[#0d130e] text-[#4d5e46]"
            : "border-[#00ff66] bg-[#00ff66]/5 text-[#00ff66] hover:bg-[#00ff66]/15 hover:shadow-[0_0_15px_rgba(0,255,102,0.2)] active:scale-[0.98]"
        }`}
      >
        {isLoading ? <RefreshCw size={15} className="animate-spin text-[#00ff66]" /> : <WandSparkles size={15} />}
        {isLoading
          ? "ОБРОБКА ЗАПИТУ ШТРУМЕЛЬ-ІНТЕЛЕКТОМ..."
          : isPlainMode
            ? "ПОЯСНИТИ ЛЮДСЬКОЮ МОВОЮ"
            : "ЗГЕНЕРУВАТИ РАПОРТ"}
      </button>
    </div>
  );
}
