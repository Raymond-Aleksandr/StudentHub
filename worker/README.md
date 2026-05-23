# StudentHub Optional Parser Worker

This folder contains an optional Cloudflare Worker parser. The current root StudentHub app does not call this Worker by default; the active parser path is the local user-selected AI provider configured on the Import page.

Keep this Worker if you want a hosted proxy-parser mode later, or if you want to test a server-side OpenRouter parser without putting provider calls in the browser/native app.

## What It Does

- Accepts `POST /parse` PDF uploads.
- Validates the browser `Origin` against `ALLOWED_ORIGINS`.
- Calls OpenRouter with the configured model and PDF parser engine.
- Returns the JSON shape expected by StudentHub's import pipeline.
- Does not store uploaded PDFs.

Browser origin checks reduce accidental public use, but they are not full abuse protection. A public parser should also consider rate limits, account-level controls, and Turnstile or another abuse gate.

## Local Development

From the repo root:

```bash
cp worker/.dev.vars.example worker/.dev.vars
npm run worker:dev
```

Add your own `OPENROUTER_API_KEY` to `worker/.dev.vars`. That file is ignored by git.

`npm run worker:dev` binds Wrangler to `0.0.0.0` through the root script so a phone on the same network can reach the local Worker when the firewall allows it.

## Deploy

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

The configured model defaults to `google/gemini-3.5-flash` through OpenRouter. The PDF parser engine defaults to `cloudflare-ai`. Change these in `wrangler.jsonc` if needed:

```jsonc
{
  "vars": {
    "OPENROUTER_MODEL": "google/gemini-3.5-flash",
    "OPENROUTER_PDF_ENGINE": "cloudflare-ai"
  }
}
```

## Allowed Origins

Production `ALLOWED_ORIGINS` should contain origins only, with no path:

```jsonc
{
  "vars": {
    "ALLOWED_ORIGINS": "https://raymond-aleksandr.github.io,https://planner.example.com"
  }
}
```

Local private-network origins can be enabled through `.dev.vars.example` for development. Keep deployed Worker origins tight.

## Checks

```bash
npm run worker:check
cd worker && npm test
```

`worker:check` is a Wrangler dry-run deploy. It may require Cloudflare/Wrangler access.

## Response Shape

```json
{
  "course": {
    "title": "",
    "code": "",
    "day": "",
    "startTime": "",
    "endTime": "",
    "time": "",
    "location": "",
    "profName": "",
    "profEmail": "",
    "taName": "",
    "taEmail": ""
  },
  "events": [
    {
      "title": "",
      "courseCode": "",
      "date": "2026-09-15",
      "time": "",
      "durationMinutes": null,
      "weight": 10,
      "location": "",
      "format": "",
      "priority": "low",
      "type": "assignment",
      "deadlineType": "assignment"
    }
  ],
  "rawText": "",
  "source": "worker"
}
```
