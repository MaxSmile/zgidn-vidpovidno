import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSharedCase,
  getCaseIdFromLocation,
  loadSharedCase,
} from "./cases";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shared cases", () => {
  it("extracts only valid case IDs", () => {
    expect(getCaseIdFromLocation("?case=1234567890abcdef1234")).toBe("1234567890abcdef1234");
    expect(getCaseIdFromLocation("?case=invalid")).toBeNull();
    expect(getCaseIdFromLocation("")).toBeNull();
  });

  it("creates a shared case", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "1234567890abcdef1234",
      url: "https://zgidno-vidpovidno.web.app/?case=1234567890abcdef1234",
    }), { status: 201 })));

    const created = await createSharedCase({
      mode: "to_plain",
      sourceText: "Документ",
      result: {
        summary: "Сталося щось просте.",
        key_facts: [],
        consequences: [],
        actions: [],
        uncertainties: [],
      },
      ui: {},
    });

    expect(created.id).toBe("1234567890abcdef1234");
    expect(fetch).toHaveBeenCalledWith(
      "https://zgidno-vidpovidno.vasilkoff-dev.workers.dev/cases",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("loads and validates a plain-language case", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "1234567890abcdef1234",
      mode: "to_plain",
      sourceText: "Документ",
      result: {
        summary: "Сталося щось просте.",
        key_facts: ["Факт"],
        consequences: [],
        actions: [],
        uncertainties: [],
      },
      ui: {},
      createdAt: "2026-06-13T06:00:00.000Z",
    }))));

    const savedCase = await loadSharedCase("1234567890abcdef1234");

    expect(savedCase.mode).toBe("to_plain");
    expect(savedCase.result).toMatchObject({ summary: "Сталося щось просте." });
  });

  it("rejects a missing case", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "Case not found" }),
      { status: 404 },
    )));

    await expect(loadSharedCase("1234567890abcdef1234")).rejects.toThrow("Case not found");
  });
});
