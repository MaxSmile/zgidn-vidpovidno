import { AlertTriangle, BookmarkCheck, CheckCircle2, ClipboardList, Copy, LoaderCircle, RefreshCw, Share2 } from "lucide-react";
import { CLS_ACTION_BTN, PLAIN_LOADING_MESSAGES } from "./constants";
import type { PlainLanguageActionStatus, PlainLanguageResponse } from "./types";

type PlainLanguageOutputProps = {
  actionNotice: string | null;
  data: PlainLanguageResponse | null;
  isLoading: boolean;
  isShareLoading: boolean;
  loadingStep: number;
  savedCaseId: string | null;
  onCopy: () => void;
  onShare: () => void;
};

const STATUS_LABELS: Record<PlainLanguageActionStatus, string> = {
  done: "Виконано",
  required: "Потрібно виконати",
  proposed: "Запропоновано",
  unclear: "Статус незрозумілий",
};

function TextList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-[#5c7056]">У документі не зазначено.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-relaxed text-[#d8e2d4]">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#00ff66]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlainLanguageOutput({
  actionNotice,
  data,
  isLoading,
  isShareLoading,
  loadingStep,
  savedCaseId,
  onCopy,
  onShare,
}: PlainLanguageOutputProps) {
  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded border border-[#22321e] bg-[#0f1510] p-6 text-center">
        <RefreshCw size={30} className="animate-spin text-[#00ff66]" />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#00ff66] animate-pulse">
          {PLAIN_LOADING_MESSAGES[loadingStep % PLAIN_LOADING_MESSAGES.length]}
        </p>
        <p className="mt-2 text-[0.68rem] uppercase tracking-[0.12em] text-[#5c7056]">
          Без вигадування відсутніх фактів
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded border border-[#22321e] bg-[#0f1510] p-6 text-center text-[#5c7056]">
        <ClipboardList size={40} className="mb-3 opacity-30 text-[#94aa8c]" />
        <p className="text-xs font-bold uppercase tracking-[0.2em]">Очікування документа...</p>
        <p className="mt-1.5 max-w-sm text-[0.68rem] uppercase tracking-[0.12em]">
          Вставте текст ліворуч, щоб отримати коротке пояснення, факти та перелік дій.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded border border-[#22321e] border-t-4 border-t-[#00ff66] bg-[#0f1510] p-5 shadow-[0_0_20px_rgba(0,0,0,0.4)] sm:p-8">
        {savedCaseId && (
          <div className="mb-5 flex items-center gap-2 border border-[#00ff66]/35 bg-[#00ff66]/5 px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-[#00ff66]">
            <BookmarkCheck size={14} />
            Збережений результат · ID {savedCaseId}
          </div>
        )}
        <div className="border-b border-[#22321e] pb-5">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#5c7056]">
            Переклад з бюрократичної
          </p>
          <h3 className="mt-2 text-lg font-bold uppercase tracking-[0.22em] text-[#00ff66]">
            Коротко
          </h3>
          <p className="mt-4 font-sans text-base leading-relaxed text-[#e9f0e6]">
            {data.summary}
          </p>
        </div>

        <div className="grid gap-6 py-6 md:grid-cols-2">
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#94aa8c]">
              <CheckCircle2 size={14} className="text-[#00ff66]" />
              Ключові факти
            </h4>
            <TextList items={data.key_facts} />
          </div>
          <div>
            <h4 className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#94aa8c]">
              Наслідки
            </h4>
            <TextList items={data.consequences} />
          </div>
        </div>

        <div className="border-t border-[#22321e] py-6">
          <h4 className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#94aa8c]">
            Дії
          </h4>
          {data.actions.length === 0 ? (
            <p className="text-xs text-[#5c7056]">У документі не зазначено.</p>
          ) : (
            <div className="space-y-2">
              {data.actions.map((item, index) => (
                <div key={`${item.action}-${index}`} className="border border-[#22321e] bg-[#070a08]/50 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-sans text-sm leading-relaxed text-[#d8e2d4]">{item.action}</p>
                    <span className="shrink-0 border border-[#00ff66]/40 px-2 py-1 text-[0.6rem] uppercase tracking-[0.1em] text-[#00ff66]">
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  {(item.owner || item.deadline) && (
                    <p className="mt-2 text-[0.68rem] text-[#5c7056]">
                      {item.owner && `Відповідальний: ${item.owner}`}
                      {item.owner && item.deadline && " · "}
                      {item.deadline && `Строк: ${item.deadline}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {data.uncertainties.length > 0 && (
          <div className="border-t border-[#22321e] pt-6">
            <h4 className="mb-3 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#f19f38]">
              <AlertTriangle size={14} />
              Що залишилося незрозумілим
            </h4>
            <TextList items={data.uncertainties} />
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={onCopy} className={CLS_ACTION_BTN}>
          <Copy size={13} />
          Копіювати пояснення
        </button>
        <button type="button" disabled={isShareLoading} onClick={onShare} className={`${CLS_ACTION_BTN} disabled:cursor-wait disabled:opacity-60`}>
          {isShareLoading ? <LoaderCircle size={13} className="animate-spin" /> : <Share2 size={13} />}
          {isShareLoading ? "Створення посилання..." : "Поділитися"}
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
