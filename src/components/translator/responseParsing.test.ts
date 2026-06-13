import { describe, expect, it } from "vitest";
import { parsePlainLanguageResponse } from "./responseParsing";

describe("parsePlainLanguageResponse", () => {
  it("parses a valid plain-language response", () => {
    const response = parsePlainLanguageResponse(JSON.stringify({
      summary: "Обладнання не працює через відсутність живлення.",
      key_facts: ["Живлення відсутнє."],
      consequences: ["Обладнання зупинено."],
      actions: [
        {
          action: "Підключити резервне живлення.",
          owner: "Відповідальний за енергозабезпечення",
          deadline: "до 18:00",
          status: "required",
        },
      ],
      uncertainties: [],
    }));

    expect(response.actions[0]).toEqual({
      action: "Підключити резервне живлення.",
      owner: "Відповідальний за енергозабезпечення",
      deadline: "до 18:00",
      status: "required",
    });
  });

  it("accepts null owner and deadline", () => {
    const response = parsePlainLanguageResponse(JSON.stringify({
      summary: "Потрібно провести перевірку.",
      key_facts: [],
      consequences: [],
      actions: [
        {
          action: "Провести перевірку.",
          owner: null,
          deadline: null,
          status: "required",
        },
      ],
      uncertainties: ["Виконавця і строк не зазначено."],
    }));

    expect(response.actions[0].owner).toBeNull();
    expect(response.actions[0].deadline).toBeNull();
  });

  it("rejects an unsupported action status", () => {
    expect(() => parsePlainLanguageResponse(JSON.stringify({
      summary: "Короткий виклад.",
      key_facts: [],
      consequences: [],
      actions: [
        {
          action: "Зробити щось.",
          owner: null,
          deadline: null,
          status: "maybe",
        },
      ],
      uncertainties: [],
    }))).toThrow("plain-language translation schema");
  });
});
