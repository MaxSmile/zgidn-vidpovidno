# Cloudflare Worker

This directory is the Wrangler project root for the public AI proxy, Workers
AI fallback, D1 response cache, and shared `?case=<id>` snapshots.

## Bindings

The deployed Worker currently uses:

- `AI`: Workers AI binding.
- `D1DB`: D1 database named `d1db`.
- `GEMINI_API_KEY`: encrypted Worker secret.

Binding names in `wrangler.jsonc` and `worker.js` must match the dashboard
exactly.

## One-time setup

Install dependencies:

```bash
cd worker
npm install
```

Authenticate Wrangler:

```bash
npx wrangler login
npx wrangler whoami
```

The existing `d1db` database UUID is already configured in `wrangler.jsonc`.
To verify that the current token can access D1:

```bash
npx wrangler d1 list
```

The API token needs these account permissions:

- Workers Scripts: Edit
- D1: Edit

Confirm that the production Gemini secret exists:

```bash
npx wrangler secret list
```

If it is absent, create it interactively:

```bash
npx wrangler secret put GEMINI_API_KEY
```

The secret value must not be added to `wrangler.jsonc`, `.env`, Git, shell
history, or documentation.

## Database migrations

Apply migrations to the local D1 emulator:

```bash
npm run db:migrate:local
```

Apply migrations to the Cloudflare D1 database:

```bash
npm run db:migrate:remote
```

Always run the remote migration before deploying Worker code that depends on
the new schema.

## Local development

Copy the example secrets file:

```bash
cp .dev.vars.example .dev.vars
```

Then run:

```bash
npm run dev
```

Workers AI uses the remote binding. D1 uses local persisted development data
unless configured otherwise.

## Validation and deployment

Generate binding types after every config change:

```bash
npm run types
```

Check committed binding types without rewriting them:

```bash
npm run types:check
```

Validate the bundle without publishing:

```bash
npm run deploy:dry
```

Deploy:

```bash
npm run deploy
```

After deployment, verify:

```bash
curl -i https://zgidno-vidpovidno.vasilkoff-dev.workers.dev/
```

A `GET` request should return `405`; generation uses `POST`.

## Shared case API

Create a permanent public snapshot:

```http
POST /cases
Content-Type: application/json

{
  "mode": "to_plain",
  "sourceText": "Бюрократичний текст",
  "result": {},
  "ui": {}
}
```

The response is `201 Created`:

```json
{
  "id": "78f69ded0ac44e2f8a30",
  "url": "https://zgidno-vidpovidno.web.app/?case=78f69ded0ac44e2f8a30"
}
```

Retrieve the exact snapshot:

```http
GET /cases/78f69ded0ac44e2f8a30
```

Cases are immutable and permanent. Unknown, malformed, or non-public case IDs
all return the same `404` response.

## Remaining implementation

The shared case storage API is implemented. Remaining D1 work:

- `POST /generate` cache lookup and write;
- request validation, case rate limiting, and restricted CORS;
- automated Worker tests for generation fallback, cache hits, and case lookup.
