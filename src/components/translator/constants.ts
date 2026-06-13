import type { Branch, GenerationLengthOption } from "./types";

export const BRANCHES: Branch[] = [
  "СБС",
  "Повітряні Сили",
  "ППО",
  "Війська Зв'язку",
  "Сухопутні Війська",
  "ВМС",
  "ДШВ",
  "ССО",
  "Тероборона",
  "Морська піхота",
];

export const BRANCH_TO_VOCABULARY_NAME: Record<Branch, string> = {
  "СБС": "Сили безпілотних систем",
  "Повітряні Сили": "Повітряні Сили",
  "ППО": "Протиповітряна оборона",
  "Війська Зв'язку": "Війська зв'язку та кібербезпеки",
  "Сухопутні Війська": "Сухопутні війська",
  "ВМС": "Військово-Морські Сили",
  "ДШВ": "Десантно-штурмові війська",
  "ССО": "Сили спеціальних операцій",
  "Тероборона": "Тероборона",
  "Морська піхота": "Морська піхота",
};

export const GENERATION_LENGTH_OPTIONS: GenerationLengthOption[] = [
  { value: "s", label: "S", minWords: 100, maxWords: 199 },
  { value: "m", label: "M", minWords: 200, maxWords: 299 },
  { value: "l", label: "L", minWords: 300, maxWords: 399 },
  { value: "xl", label: "XL", minWords: 400, maxWords: 499 },
  { value: "xxl", label: "XXL", minWords: 500 },
];

export const formatGenerationWordTarget = (option: GenerationLengthOption): string => {
  return option.maxWords
    ? `${option.minWords}-${option.maxWords} words`
    : `${option.minWords}+ words`;
};

export const formatGenerationWordMinimum = (option: GenerationLengthOption): string => {
  return `${option.minWords}+ words`;
};

export const PRESETS = [
  "Старлінк обісцяли собаки",
  "Забув пароль від пошти",
  "Вимкнули світло, здох безперебійник",
  "Пролив каву на клавіатуру",
  "Комар залетів у кімнату і пищить",
  "Фарбуємо траву перед приїздом генерала",
];

export const APP_VERSION = "v2.4.0-CLOUDFLARE";
export const WORKER_URL = "https://zgidno-vidpovidno.vasilkoff-dev.workers.dev/";

export const LOADING_MESSAGES = [
  "СИСТЕМНИЙ ЗБІР МАТЕРІАЛІВ...",
  "НАДСИЛАННЯ ПАКЕТУ ДАНИХ КРІЗЬ CLOUDFLARE SHIELD...",
  "ФОРМУВАННЯ СТРУКТУРОВАНОГО JSON ПАКЕТУ ЗГІДНО СТАНДАРТІВ...",
  "АКТИВАЦІЯ СЕД ТА СИМУЛЯЦІЯ ПОСАДОВИХ ОСІБ...",
  "ВЕРИФІКАЦІЯ БЮРОКРАТИЧНОГО РІВНЯ...",
  "УЗГОДЖЕННЯ З ВІДПОВІДАЛЬНИМИ ПОСАДОВИМИ ОСОБАМИ...",
  "КАЛІБРУВАННЯ КАНЦЕЛЯРСЬКОГО ТОНУ ДОКУМЕНТА...",
  "ОЧІКУВАННЯ ПІДПИСУ НАЧАЛЬНИКА ЗМІНИ...",
];

export const NOTICE_COPIED = "СКОПІЙОВАНО ДО БУФЕРА ОБМІНУ (ФОРМАТОВАНИЙ РАПОРТ).";
export const NOTICE_COPY_FAILED = "НЕ ВДАЛОСЯ СКОПІЮВАТИ. НАДАЙТЕ ДОСТУП ДО БУФЕРА.";
export const NOTICE_SHARED = "МЕНЮ НАДСИЛАННЯ ВІДКРИТО.";
export const NOTICE_SHARE_FALLBACK = "НАДСИЛАННЯ НЕПІДТРИМУЄТЬСЯ. КОРОТКИЙ ТЕКСТ СКОПІЙОВАНО.";
export const NOTICE_SHARE_FAILED = "НЕ ВДАЛОСЯ НАДІСЛАТИ ДАНІ.";

export const CLS_PANEL = "rounded border border-[#22321e] bg-[#0f1510] p-4 sm:p-5";
export const CLS_SECTION_HEADING = "text-xs uppercase tracking-[0.2em] font-semibold text-[#00ff66]";
export const CLS_BRANCH_BTN_ACTIVE = "border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.15)]";
export const CLS_ITEM_ACTIVE = "border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66]";
export const CLS_ITEM_INACTIVE = "border-[#22321e] bg-[#070a08]/50 text-[#94aa8c] hover:border-[#00ff66]/50 hover:text-[#00ff66]";
export const CLS_ACTION_BTN = "flex-1 flex items-center justify-center gap-2 border border-[#22321e] bg-[#0f1510] py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#94aa8c] transition-all hover:border-[#00ff66] hover:text-[#00ff66] hover:bg-[#00ff66]/5 rounded-sm";
