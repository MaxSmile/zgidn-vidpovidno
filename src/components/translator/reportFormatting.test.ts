import { describe, expect, it } from "vitest";
import { formatPlainLanguageForCopy } from "./reportFormatting";

describe("formatPlainLanguageForCopy", () => {
  it("includes structured sections and action metadata", () => {
    const text = formatPlainLanguageForCopy({
      summary: "Обладнання зупинено.",
      key_facts: ["Електроживлення відсутнє."],
      consequences: ["Робота призупинена."],
      actions: [
        {
          action: "Підключити резервне живлення.",
          owner: "Черговий",
          deadline: "18:00",
          status: "required",
        },
      ],
      uncertainties: [],
    });

    expect(text).toContain("КОРОТКО");
    expect(text).toContain("КЛЮЧОВІ ФАКТИ:");
    expect(text).toContain("відповідальний: Черговий");
    expect(text).toContain("строк: 18:00");
  });

  it("marks empty sections as not specified", () => {
    const text = formatPlainLanguageForCopy({
      summary: "Короткий виклад.",
      key_facts: [],
      consequences: [],
      actions: [],
      uncertainties: [],
    });

    expect(text.match(/- Не зазначено/g)).toHaveLength(4);
  });
});
