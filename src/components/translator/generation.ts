import vocabularyData from "../../../vocabulary.json";
import { BRANCH_TO_VOCABULARY_NAME, formatGenerationWordTarget, WORKER_URL } from "./constants";
import {
  EXPANSION_SECTION_DETAILS,
  LOCATION_DETAILS,
  OBSERVATION_DETAILS,
  OFFICIAL_REFERENCE_DETAILS,
  PERSONNEL_DETAILS,
  STATUTE_CITATION_DETAILS,
  WEATHER_DETAILS,
} from "./promptDetails";
import { parseTranslationResponse } from "./responseParsing";
import type { Branch, DocumentMeta, GenerationLengthOption, TranslationResponse } from "./types";

type ProviderResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  cfResponse?: {
    choices?: Array<{
      finish_reason?: string;
      message?: {
        content?: string;
      };
    }>;
  };
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
    };
  }>;
};

type VocabularyExample = {
  branch: string;
  input: string;
  output: TranslationResponse;
};

type GenerateTranslationParams = {
  activeBranch: Branch;
  inputText: string;
  selectedLengthOption: GenerationLengthOption;
  documentMeta: DocumentMeta;
};

const pickRandom = <T,>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const pickRandomMany = <T,>(items: T[], count: number): T[] => {
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
};

const extractGeneratedText = (data: ProviderResponse): string => {
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    data.cfResponse?.choices?.[0]?.message?.content ||
    data.choices?.[0]?.message?.content ||
    ""
  );
};

const getProviderFinishReason = (data: ProviderResponse): string | undefined => {
  return data.cfResponse?.choices?.[0]?.finish_reason || data.choices?.[0]?.finish_reason;
};

const createExamplesPrompt = (targetBranch: string, minWords: number): string => {
  const typedVocabularyData = vocabularyData as VocabularyExample[];
  const isLongGeneration = minWords >= 300;
  const targetBranchExamples = typedVocabularyData
    .filter((example) => example.branch === targetBranch)
    .slice(0, isLongGeneration ? 1 : 4);
  const otherBranchExamples = typedVocabularyData
    .filter((example) => example.branch !== targetBranch)
    .slice(0, isLongGeneration ? 1 : 2);

  return [...targetBranchExamples, ...otherBranchExamples].map((example, index) => `
Example ${index + 1}:
Branch: ${example.branch}
Input: "${example.input}"
Output JSON:
${JSON.stringify(example.output, null, 2)}
`).join("\n");
};

const createPrompts = ({
  activeBranch,
  inputText,
  selectedLengthOption,
  documentMeta,
}: GenerateTranslationParams): { systemPrompt: string; userPrompt: string } => {
  const targetBranch = BRANCH_TO_VOCABULARY_NAME[activeBranch];
  const wordTargetLabel = formatGenerationWordTarget(selectedLengthOption);
  const modelTargetWords = selectedLengthOption.maxWords
    ? Math.floor((selectedLengthOption.minWords + selectedLengthOption.maxWords) / 2)
    : Math.ceil(selectedLengthOption.minWords * 1.3);
  const examplesPrompt = createExamplesPrompt(targetBranch, selectedLengthOption.minWords);
  const { currentDateTimeStr, day, month, year, hours, minutes } = documentMeta;

  const narrativeContext = {
    weather: pickRandom(WEATHER_DETAILS),
    personnel: pickRandom(PERSONNEL_DETAILS),
    location: pickRandom(LOCATION_DETAILS),
    observation: pickRandom(OBSERVATION_DETAILS),
    references: pickRandomMany(OFFICIAL_REFERENCE_DETAILS, 3),
    citations: pickRandomMany(STATUTE_CITATION_DETAILS, 4),
    sections: pickRandomMany(EXPANSION_SECTION_DETAILS, 4),
  };

  const systemPrompt = `/no_think
You are the core AI translation engine of "Програмний комплекс автоматизації бюрократії v2.4" for the Armed Forces of Ukraine (ЗСУ).
Your job is to translate mundane, civilian everyday phrases in Ukrainian into absurdly over-engineered, formal, deadpan military reports ("Рапорти") that match the exact tone of Ukrainian army paperwork and electronic document management (СЕД).

Rules:
1. The output MUST be a valid JSON object matching the schema below. Return JSON only. Do not include reasoning, analysis, commentary, markdown, or code fences.
2. The "report" field MUST start with the word "ДІЙСНИМ ДОПОВІДАЮ: ".
3. Use highly formal, passive, bureaucratic Ukrainian military jargon (e.g. "особовий склад", "несанкціоноване втручання", "деградація цифрового контуру", "вилучення", "контроль за виконанням покласти на").
4. Preserve the concrete civilian incident from the input so a reader can still understand what actually happened after reading the bureaucratic version. Do not hide the event behind only generic wording.
5. Do not quote or name the user's raw civilian phrase as a phrase/formulation/description. Reconstruct the actual event in-world. For example, do not write "формулювання «Фарбуємо траву...»"; write that personnel performed cosmetic coloring of the grass/lawn before the general's arrival.
6. Keep the absurdity grounded: add official terminology around the event, but do not erase the simple cause-and-effect of the original incident.
7. You may freely invent plausible bureaucratic surrounding facts: witnesses, responsible officers, missed instructions, logs, inspections, property condition, prior verbal orders, improvised fixes, conflicting explanations, and follow-up paperwork.
8. If appropriate, incorporate the exact date and time of the incident (provided in the user request: ${currentDateTimeStr}) into the report text (e.g., "станом на ${day}.${month}.${year} року", "о ${hours}:${minutes} відбувся інцидент...").
9. "resolution" must represent a formal command or resolution from a commanding officer addressing the situation in a bureaucratic way.
10. "order" must represent a directive to be distributed to the staff.
11. "approvers" is an array of 2-3 officers. Each object must have a "role" and "status". Keep status uppercase, and append the date and time of approval using the provided date (e.g., "ПОГОДЖЕНО ${day}.${month}.${year} о ${hours}:${minutes}", "КОНТРОЛЬ ВСТАНОВЛЕНО ${day}.${month}.${year} о ${hours}:${minutes}").
12. If the input mentions animals (dogs, cats, birds, etc.), you MUST automatically include "Начальник кінологічної служби" in the "approvers" list.
13. "regulation" must cite a funny, fictional, but very official-sounding military regulation (e.g. "Стаття X Настанови з Y").
14. "authorized_by" should be a title like "Командир військової частини" or "Начальник зв'язку" optionally signed with a username like "k.vernadska" or "gonezales1978".
15. "operation_code" should be a funny military code starting with "КОД-" (e.g. "КОД-ГІДРАНТ-СПИРТ-200").
16. WORD COUNT TARGET: the JSON response MUST be ${wordTargetLabel} total across all text fields. Aim for about ${modelTargetWords} words. Do not exceed the upper bound when one is provided.
17. Expand naturally through story-like official detail, not a checklist. Use fuller paragraphs in report, resolution, and order.
18. Treat supplied weather, location, personnel, observation, references, citations, and expansion sections as optional inspiration seeds only. NEVER copy them verbatim — always rephrase, adapt, or ignore them entirely in favour of your own invented detail.
19. For L, XL, and XXL outputs, place at least one natural statute citation inside the "report" field when citations are supplied. Additional citations may appear in "resolution" or "order" only if they fit naturally.
20. For XL and XXL output, the report may include chronology, material setting, personnel involvement, risks, documentation, and response measures where relevant, but it does not need to cover every section.

JSON Schema:
{
  "report": "string (starts with 'ДІЙСНИМ ДОПОВІДАЮ: ')",
  "resolution": "string",
  "order": "string",
  "approvers": [
    { "role": "string", "status": "string" }
  ],
  "regulation": "string",
  "authorized_by": "string",
  "operation_code": "string"
}
`;

  const userPrompt = `/no_think
Return only one complete valid JSON object. No reasoning. No commentary.

Here are some examples of translations for reference:
${examplesPrompt}

Now, translate the following request:
Branch: ${targetBranch}
Current Date & Time of Incident: ${currentDateTimeStr}
Selected Generation Size: ${selectedLengthOption.label}
Visible UI Target: ${wordTargetLabel}
Internal Writing Target: about ${modelTargetWords} words
Concrete Incident To Preserve Clearly: "${inputText}"
Important: describe the incident itself, not the user's wording. Do not quote the input phrase as a label.
Optional Official Context:
- Weather: ${narrativeContext.weather}
- Personnel: ${narrativeContext.personnel}
- Location: ${narrativeContext.location}
- Observation: ${narrativeContext.observation}
Optional Official Reference Pack:
${narrativeContext.references.map((reference) => `- ${reference}`).join("\n")}
Optional Statute Citation Pack:
${narrativeContext.citations.map((citation) => `- ${citation}`).join("\n")}
Optional Expansion Ideas For Long Outputs:
${narrativeContext.sections.map((section) => `- ${section}`).join("\n")}
Input: "${inputText}"
Output JSON:
`;

  return { systemPrompt, userPrompt };
};

export const generateTranslation = async (params: GenerateTranslationParams): Promise<TranslationResponse> => {
  const { systemPrompt, userPrompt } = createPrompts(params);
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Translation request via Cloudflare Worker failed (HTTP ${response.status})`);
  }

  const data = (await response.json()) as ProviderResponse;
  const finishReason = getProviderFinishReason(data);
  const text = extractGeneratedText(data);

  if (!text) {
    throw new Error("Invalid response structure from provider API");
  }

  if (finishReason === "length") {
    throw new Error("Provider response was truncated before JSON completed");
  }

  return parseTranslationResponse(text);
};
