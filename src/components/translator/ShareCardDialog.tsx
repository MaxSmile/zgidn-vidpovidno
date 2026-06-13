import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, Image, LoaderCircle, Send, X } from "lucide-react";
import { CLS_ACTION_BTN } from "./constants";
import { renderShareCard, type ShareCardData } from "./shareCard";

type ShareTarget = "x" | "telegram" | "linkedin";

type ShareCardDialogProps = {
  data: ShareCardData;
  onCreateCaseUrl: () => Promise<string | null>;
};

const SHARE_TEXT = "Мій результат у «Згідно-Відповідно»";

function createImageFileName() {
  const unixTime = Math.floor(Date.now() / 1000).toString().slice(-8);
  return `zgidno-vidpovidno-${unixTime}.png`;
}

function downloadBlob(blob: Blob, fileName = createImageFileName()) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getShareUrl(target: ShareTarget, pageUrl: string) {
  const encodedUrl = encodeURIComponent(pageUrl);
  const text = encodeURIComponent(SHARE_TEXT);

  if (target === "x") {
    return `https://x.com/intent/post?text=${text}&url=${encodedUrl}`;
  }
  if (target === "telegram") {
    return `https://t.me/share/url?url=${encodedUrl}&text=${text}`;
  }
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
}

export function ShareCardDialog({ data, onCreateCaseUrl }: ShareCardDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [sharingTarget, setSharingTarget] = useState<ShareTarget | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const file = useMemo(
    () => imageBlob ? new File([imageBlob], createImageFileName(), { type: "image/png" }) : null,
    [imageBlob],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const ensureImage = async () => {
    if (imageBlob) return imageBlob;
    setIsRendering(true);
    try {
      const blob = await renderShareCard(data);
      setImageBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      return blob;
    } finally {
      setIsRendering(false);
    }
  };

  const openDialog = async () => {
    setIsOpen(true);
    setNotice(null);
    try {
      await ensureImage();
    } catch {
      setNotice("Не вдалося створити картку в цьому браузері.");
    }
  };

  const shareFile = async () => {
    const blob = await ensureImage();
    const shareFile = new File([blob], createImageFileName(), { type: "image/png" });
    if (navigator.canShare?.({ files: [shareFile] })) {
      await navigator.share({ files: [shareFile], title: SHARE_TEXT, text: SHARE_TEXT });
      return;
    }
    downloadBlob(blob);
    setNotice("PNG завантажено. Додайте його до допису.");
  };

  const copyImage = async () => {
    const blob = await ensureImage();
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      downloadBlob(blob);
      setNotice("Копіювання зображень недоступне. PNG завантажено.");
      return;
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    setNotice("Картку скопійовано. Вставте її в допис.");
  };

  const shareTo = async (target: ShareTarget) => {
    if (!imageBlob) return;
    const shareWindow =
      target === "telegram" || target === "linkedin"
        ? window.open("about:blank", "_blank")
        : null;
    if (shareWindow) shareWindow.opener = null;

    setSharingTarget(target);
    setNotice(null);

    try {
      const pageUrl =
        target === "telegram" || target === "linkedin"
          ? await onCreateCaseUrl()
          : window.location.origin;
      if (!pageUrl) {
        shareWindow?.close();
        return;
      }

      downloadBlob(imageBlob);
      const shareUrl = getShareUrl(target, pageUrl);
      if (shareWindow) {
        shareWindow.location.href = shareUrl;
      } else {
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }
      setNotice(
        target === "telegram" || target === "linkedin"
          ? "PNG завантажено, а в допис додано публічне посилання на результат."
          : "PNG завантажено. Прикріпіть його у відкритому дописі.",
      );
    } catch {
      shareWindow?.close();
      setNotice("Не вдалося створити публічне посилання.");
    } finally {
      setSharingTarget(null);
    }
  };

  return (
    <>
      <button type="button" onClick={openDialog} className={CLS_ACTION_BTN}>
        <Image size={13} />
        Поділитися карткою
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Поділитися карткою"
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsOpen(false);
          }}
        >
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded border border-[#22321e] bg-[#0f1510] p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#00ff66]">
                  Картка результату
                </h3>
                <p className="mt-1 text-[0.68rem] text-[#5c7056]">
                  PNG 1200×1500 · генерується лише у вашому браузері
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Закрити"
                className="p-2 text-[#94aa8c] transition-colors hover:text-[#00ff66]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex min-h-80 items-center justify-center border border-[#22321e] bg-[#070a08] p-3">
                {isRendering || !previewUrl ? (
                  <LoaderCircle className="animate-spin text-[#00ff66]" />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Прев’ю картки результату"
                    className="max-h-[65vh] w-auto max-w-full"
                  />
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  disabled={!file || isRendering}
                  onClick={() => void shareFile().catch(() => setNotice("Не вдалося відкрити меню надсилання."))}
                  className={`${CLS_ACTION_BTN} w-full disabled:opacity-50`}
                >
                  <Send size={14} />
                  Надіслати PNG
                </button>
                <button
                  type="button"
                  disabled={!imageBlob || isRendering}
                  onClick={() => imageBlob && downloadBlob(imageBlob)}
                  className={`${CLS_ACTION_BTN} w-full disabled:opacity-50`}
                >
                  <Download size={14} />
                  Завантажити
                </button>
                <button
                  type="button"
                  disabled={!imageBlob || isRendering}
                  onClick={() => void copyImage().catch(() => setNotice("Не вдалося скопіювати картку."))}
                  className={`${CLS_ACTION_BTN} w-full disabled:opacity-50`}
                >
                  <Clipboard size={14} />
                  Копіювати PNG
                </button>

                <div className="border-t border-[#22321e] pt-3">
                  <p className="mb-2 text-[0.62rem] uppercase tracking-[0.14em] text-[#5c7056]">
                    Відкрити допис
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" disabled={!imageBlob || isRendering || sharingTarget !== null} onClick={() => void shareTo("x")} className={`${CLS_ACTION_BTN} disabled:opacity-50`} aria-label="Поділитися в X">
                      {sharingTarget === "x" ? <LoaderCircle size={14} className="animate-spin" /> : <span className="text-sm font-bold">X</span>}
                    </button>
                    <button type="button" disabled={!imageBlob || isRendering || sharingTarget !== null} onClick={() => void shareTo("telegram")} className={`${CLS_ACTION_BTN} disabled:opacity-50`} aria-label="Поділитися в Telegram">
                      {sharingTarget === "telegram" ? <LoaderCircle size={14} className="animate-spin" /> : <span className="text-sm font-bold">TG</span>}
                    </button>
                    <button type="button" disabled={!imageBlob || isRendering || sharingTarget !== null} onClick={() => void shareTo("linkedin")} className={`${CLS_ACTION_BTN} disabled:opacity-50`} aria-label="Поділитися в LinkedIn">
                      {sharingTarget === "linkedin" ? <LoaderCircle size={14} className="animate-spin" /> : <span className="text-sm font-bold">in</span>}
                    </button>
                  </div>
                </div>

                <p className="text-[0.65rem] leading-relaxed text-[#5c7056]">
                  Платформи не дають сайту автоматично прикріпити локальний PNG. Картка
                  копіюється або завантажується, після чого відкривається редактор допису.
                </p>

                {notice && (
                  <p className="flex gap-2 border border-[#00ff66]/30 bg-[#00ff66]/5 p-2 text-[0.68rem] leading-relaxed text-[#00ff66]">
                    <Check size={13} className="mt-0.5 shrink-0" />
                    {notice}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
