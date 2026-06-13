const CASE_ID_PATTERN = /^[a-f0-9]{20}$/;
const MAX_CASE_BODY_BYTES = 64 * 1024;
const MAX_SOURCE_TEXT_LENGTH = 12_000;
const CASE_PROMPT_VERSION = "shared-case-v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/cases") {
        if (request.method !== "POST") {
          return methodNotAllowed("POST");
        }

        return await createCase(request, env);
      }

      const caseId = getCaseId(url.pathname);
      if (caseId !== null) {
        if (request.method !== "GET") {
          return methodNotAllowed("GET");
        }

        return await getCase(caseId, env);
      }

      if (url.pathname !== "/") {
        return jsonResponse({ error: "Not found" }, 404);
      }

      if (request.method !== "POST") {
        return methodNotAllowed("POST");
      }

      return await generate(request, env);
    } catch (error) {
      if (error instanceof RequestError) {
        return jsonResponse({ error: error.message }, error.status);
      }

      console.error(JSON.stringify({
        event: "worker_request_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }));
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },
};

async function createCase(request, env) {
  const body = await readCaseBody(request);
  const validationError = validateCaseBody(body);
  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  const mode = body.mode;
  const sourceText = body.sourceText.trim();
  const resultJson = JSON.stringify(body.result);
  const uiJson = JSON.stringify(body.ui ?? {});
  const serializedBytes = byteLength(sourceText) + byteLength(resultJson) + byteLength(uiJson);

  if (serializedBytes > MAX_CASE_BODY_BYTES) {
    return jsonResponse({ error: "Case payload is too large" }, 413);
  }

  const now = Math.floor(Date.now() / 1000);
  let id;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    id = createCaseId();

    try {
      await env.D1DB.prepare(
        `INSERT INTO cases (
          id, request_hash, mode, source_text, result_json, ui_json,
          prompt_version, schema_version, is_public, created_at, expires_at
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, 1, 1, ?, ?)`
      )
        .bind(
          id,
          mode,
          sourceText,
          resultJson,
          uiJson,
          CASE_PROMPT_VERSION,
          now,
          null
        )
        .run();

      break;
    } catch (error) {
      if (attempt === 2 || !isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  const publicAppUrl = new URL(env.PUBLIC_APP_URL);
  publicAppUrl.searchParams.set("case", id);

  return jsonResponse(
    {
      id,
      url: publicAppUrl.toString(),
    },
    201,
    { "Cache-Control": "no-store" }
  );
}

async function getCase(id, env) {
  if (!CASE_ID_PATTERN.test(id)) {
    return caseNotFound();
  }

  const now = Math.floor(Date.now() / 1000);
  const row = await env.D1DB.prepare(
    `SELECT id, mode, source_text, result_json, ui_json, created_at, expires_at
     FROM cases
     WHERE id = ?
       AND is_public = 1
       AND (expires_at IS NULL OR expires_at > ?)`
  )
    .bind(id, now)
    .first();

  if (!row) {
    return caseNotFound();
  }

  let result;
  let ui;

  try {
    result = JSON.parse(row.result_json);
    ui = JSON.parse(row.ui_json);
  } catch {
    throw new Error("Stored case contains invalid JSON");
  }

  return jsonResponse(
    {
      id: row.id,
      mode: row.mode,
      sourceText: row.source_text,
      result,
      ui,
      createdAt: new Date(row.created_at * 1000).toISOString(),
    },
    200,
    {
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex, nofollow",
    }
  );
}

async function generate(request, env) {
  const requestData = await request.json();

  const geminiResponse = await tryGemini(requestData, env);
  if (geminiResponse) {
    return geminiResponse;
  }

  return await fallbackToCloudflareAI(requestData, env);
}

async function tryGemini(requestData, env) {
  try {
    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const googleResponse = await fetch(googleApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    if (googleResponse.ok) {
      return new Response(googleResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (isClientError(googleResponse.status)) {
      return new Response(googleResponse.body, {
        status: googleResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  } catch {
    // Network errors use the Workers AI fallback.
  }

  return null;
}

function isClientError(status) {
  return status >= 400 && status < 500 && status !== 429;
}

function extractSystemInstruction(requestData) {
  return requestData?.systemInstruction?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

function extractUserTask(requestData) {
  const fullUserText = requestData?.contents
    ?.filter((content) => content.role === "user")
    ?.flatMap((content) => content.parts?.map((part) => part.text ?? "") ?? [])
    ?.join("") ?? "";

  const taskMatch = fullUserText.match(/Now, translate the following request:([\s\S]+)$/);
  return taskMatch
    ? "Now, translate the following request:" + taskMatch[1]
    : fullUserText;
}

function buildCFAIMessages(requestData) {
  return [
    { role: "system", content: extractSystemInstruction(requestData) },
    { role: "user", content: extractUserTask(requestData) },
  ];
}

function extractCFAIResponseContent(response) {
  const responseValue =
    response?.choices?.[0]?.message?.content ??
    response?.response?.content ??
    response?.response;

  if (typeof responseValue !== "string") {
    throw new Error(
      `Unexpected CF AI response shape: ${JSON.stringify(response).slice(0, 1000)}`
    );
  }

  return responseValue
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function fallbackToCloudflareAI(requestData, env) {
  const cfResponse = await env.AI.run("@cf/qwen/qwen3-30b-a3b-fp8", {
    messages: buildCFAIMessages(requestData),
    max_tokens: 20000,
  });

  const rawText = extractCFAIResponseContent(cfResponse);

  return jsonResponse({
    cfResponse,
    candidates: [{
      content: { parts: [{ text: rawText }], role: "model" },
      finishReason: "STOP",
    }],
  });
}

async function readCaseBody(request) {
  const contentLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_CASE_BODY_BYTES) {
    throw new RequestError("Case payload is too large", 413);
  }

  const rawBody = await request.text();
  if (byteLength(rawBody) > MAX_CASE_BODY_BYTES) {
    throw new RequestError("Case payload is too large", 413);
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new RequestError("Request body must be valid JSON", 400);
  }
}

function validateCaseBody(body) {
  if (!isPlainObject(body)) {
    return "Request body must be a JSON object";
  }

  if (body.mode !== "to_bureaucratic" && body.mode !== "to_plain") {
    return "Unsupported translation mode";
  }

  if (typeof body.sourceText !== "string" || body.sourceText.trim().length === 0) {
    return "sourceText is required";
  }

  if (body.sourceText.length > MAX_SOURCE_TEXT_LENGTH) {
    return "sourceText is too long";
  }

  if (!isPlainObject(body.result)) {
    return "result must be a JSON object";
  }

  if (body.ui !== undefined && !isPlainObject(body.ui)) {
    return "ui must be a JSON object";
  }

  return null;
}

function getCaseId(pathname) {
  const match = pathname.match(/^\/cases\/([^/]+)$/);
  return match ? match[1] : null;
}

function createCaseId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}

function isUniqueConstraintError(error) {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function methodNotAllowed(allowedMethod) {
  return jsonResponse(
    { error: "Method not allowed" },
    405,
    { Allow: allowedMethod }
  );
}

function caseNotFound() {
  return jsonResponse(
    { error: "Case not found" },
    404,
    { "Cache-Control": "no-store" }
  );
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

class RequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
