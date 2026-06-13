import { FileOutput, ScanText } from "lucide-react";
import type { TranslationMode } from "./types";

type TranslationModeTabsProps = {
  isLoading: boolean;
  mode: TranslationMode;
  onChange: (mode: TranslationMode) => void;
};

const MODES = [
  {
    value: "to_bureaucratic" as const,
    label: "На бюрократичну",
    description: "Створити формальний рапорт зі звичайного опису",
    icon: FileOutput,
  },
  {
    value: "to_plain" as const,
    label: "На людську",
    description: "Пояснити службовий документ простою мовою",
    icon: ScanText,
  },
];

export function TranslationModeTabs({ isLoading, mode, onChange }: TranslationModeTabsProps) {
  return (
    <section
      aria-label="Напрямок перекладу"
      className="rounded border border-[#22321e] bg-[#0f1510] p-2"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="tablist">
        {MODES.map((item) => {
          const isActive = mode === item.value;
          const Icon = item.icon;

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={isLoading}
              onClick={() => onChange(item.value)}
              className={`group flex min-h-20 items-center gap-3 border px-4 py-3 text-left transition-all disabled:cursor-wait disabled:opacity-60 ${
                isActive
                  ? "border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66] shadow-[0_0_12px_rgba(0,255,102,0.12)]"
                  : "border-[#22321e] bg-[#070a08]/50 text-[#94aa8c] hover:border-[#00ff66]/50 hover:text-[#e9f0e6]"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center border ${
                  isActive ? "border-[#00ff66]" : "border-[#22321e]"
                }`}
              >
                <Icon size={17} />
              </span>
              <span>
                <span className="block text-xs font-bold uppercase tracking-[0.16em]">
                  {item.label}
                </span>
                <span className="mt-1 block text-[0.68rem] normal-case leading-relaxed tracking-normal text-[#5c7056] group-hover:text-[#94aa8c]">
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
