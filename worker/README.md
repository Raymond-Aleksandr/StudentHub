# StudentHub Syllabus Parser Worker

This Cloudflare Worker accepts PDF syllabus uploads from the configured GitHub Pages origin and returns the JSON shape that the StudentHub frontend expects.

It is safe to commit this folder because it contains no secrets. Each deployer must provide their own API key through Cloudflare secrets.

## Security Model

- `POST /parse` is allowed only when the browser `Origin` exactly matches `ALLOWED_ORIGINS`.
- The default allowed origin is `https://raymond-aleksandr.github.io`.
- Secrets are read from Cloudflare Worker secrets, not source code.
- Uploaded PDFs are not stored by this Worker.

Browser origin checks are meant to protect the public frontend path. They are not a substitute for account-level abuse controls, rate limiting, or Turnstile on a high-traffic production deployment.

## Deploy Your Own

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

After deployment, set the frontend environment variable:

```env
VITE_SYLLABUS_PARSER_URL=https://your-worker.your-subdomain.workers.dev/parse
```

This repo's frontend currently defaults to:

```text
https://studenthub-syllabus-parser.h-5c7.workers.dev/parse
```

The default model is `google/gemini-2.5-flash` through OpenRouter. PDF parsing uses OpenRouter's `file-parser` plugin with the `cloudflare-ai` engine by default. You can change these with `OPENROUTER_MODEL` and `OPENROUTER_PDF_ENGINE` in `wrangler.jsonc`.

For local Worker development, copy `.dev.vars.example` to `.dev.vars` and add your own local key:

```bash
cp worker/.dev.vars.example worker/.dev.vars
npm run worker:dev
```

The frontend defaults to `http://127.0.0.1:8787/parse` when it is running on localhost. The local `.dev.vars.example` allows both `http://127.0.0.1:5173` and `http://localhost:5173`; the deployed Worker config should stay restricted to your Pages origin.

## Configure Allowed Origins

For a fork or a custom Pages domain, update `ALLOWED_ORIGINS` in `wrangler.jsonc`.

Use comma-separated origins only, with no path:

```jsonc
{
  "vars": {
    "ALLOWED_ORIGINS": "https://your-name.github.io,https://planner.example.com"
  }
}
```

## Response Shape

The Worker returns:

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
      "priority": "low",
      "type": "assignment",
      "deadlineType": "assignment"
    }
  ],
  "rawText": "",
  "source": "worker"
}
```
