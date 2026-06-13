import { describe, expect, it } from "vitest";
import { createShareCardData } from "./shareCard";

describe("createShareCardData", () => {
  it("formats a bureaucratic result", () => {
    const data = createShareCardData({
      mode: "to_bureaucratic",
      activeBranch: "СБС",
      reportData: {
        report: "ДІЙСНИМ ДОПОВІДАЮ: тест.",
        resolution: "Розглянути.",
        order: "Виконати.",
        approvers: [],
        regulation: "Статут",
        authorized_by: "Командир",
        operation_code: "ТЕСТ-01",
      },
    });

    expect(data.eyebrow).toContain("СБС");
    expect(data.body).toContain("ДІЙСНИМ ДОПОВІДАЮ");
    expect(data.details).toEqual(["РЕЗОЛЮЦІЯ: Розглянути.", "НАКАЗ: Виконати."]);
    expect(data.code).toBe("ТЕСТ-01");
  });

  it("limits plain-language facts to three", () => {
    const data = createShareCardData({
      mode: "to_plain",
      plainData: {
        summary: "Коротке пояснення.",
        key_facts: ["Один", "Два", "Три", "Чотири"],
        consequences: [],
        actions: [],
        uncertainties: [],
      },
    });

    expect(data.details).toEqual(["Один", "Два", "Три"]);
    expect(data.code).toBe("ЛЮДСЬКОЮ МОВОЮ");
  });
});
