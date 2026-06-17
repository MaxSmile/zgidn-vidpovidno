import { describe, expect, it } from "vitest";

describe("pdfGenerator", () => {
  it("can be imported successfully", async () => {
    const { generatePdf } = await import("./pdfGenerator");
    expect(generatePdf).toBeTypeOf("function");
  });
});
