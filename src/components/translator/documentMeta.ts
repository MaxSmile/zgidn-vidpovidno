import type { DocumentMeta } from "./types";

export const createDocumentMeta = (): DocumentMeta => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return {
    docNumber: `ЗВ-${year}/${month}/${day}-${rand}`,
    docDate: `${day}.${month}.${year} о ${hours}:${minutes}`,
    currentDateTimeStr: `${day}.${month}.${year} ${hours}:${minutes}`,
    day,
    month,
    year,
    hours,
    minutes,
  };
};
