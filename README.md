# StudentHub

StudentHub is a mobile-first study planner that turns course syllabi into a usable term plan. The public frontend is safe to publish because it does not require committed API keys, Firebase credentials, or service account files.

## What It Does

- Imports PDF syllabi and extracts courses, deadlines, exams, and reminders
- Organizes the app around bottom navigation: Today, Import, Tasks, Exams, Courses
- Keeps Tasks focused on the task queue, with Calendar split into a separate month view
- Shows an import summary after each syllabus upload so parsed courses, tasks, and exams are easy to review
- Lets users edit parsed task and exam cards when the parser gets a title, date, time, course code, or type wrong
- Stores demo data locally in the browser by default
- Requires a Cloudflare Worker parser for syllabus extraction
- Leaves room for Firebase Auth and Firestore when cross-device sync is needed

## Current Architecture

```text
GitHub Pages static app
  -> React + TypeScript + Vite
  -> local browser auth/storage for the public demo
  -> Cloudflare Worker for PDF syllabus parsing
  -> optional Firebase later for real accounts and sync
```

The static Pages build works without committed secrets. Syllabus import depends on the Worker; if the Worker is not deployed, misconfigured, or unreachable, the app shows an error and does not run a browser parser. Worker and Firebase credentials should live in provider-side secret managers, not in this repository.

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Lucide React
- Cloudflare Workers template

## Local Setup

```bash
npm install
npm run dev
```

Syllabus import requires a Worker. For local PDF import testing, run the frontend and Worker in separate terminals:

```bash
cp worker/.dev.vars.example worker/.dev.vars
# Edit worker/.dev.vars and set OPENROUTER_API_KEY to your own key.
npm run worker:dev
```

When the app runs on `http://127.0.0.1:5173` or `http://localhost:5173`, it defaults to the local Worker endpoint:

```text
http://127.0.0.1:8787/parse
```

Run checks before publishing:

```bash
npm run lint
npm run build
```

## Cloudflare Worker Parser

The app includes a Worker template in `worker/`. The Worker is required for syllabus parsing because the OpenRouter API key must stay outside the frontend. There is no browser fallback parser.

Deploy your own Worker:

```bash
cd worker
npm install
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

Then point the frontend at your parser:

```env
VITE_SYLLABUS_PARSER_URL=https://your-worker.your-subdomain.workers.dev/parse
```

Fork users should also update allowed origins in `worker/wrangler.jsonc` so only their Pages site can call their Worker.

If `VITE_SYLLABUS_PARSER_URL` is blank on localhost, the app uses `http://127.0.0.1:8787/parse`. If it is blank in production, the app uses the demo Worker endpoint in `src/syllabusParser.ts`. For a fork or production deployment, use your own Worker endpoint.

## Firebase

Firebase is not required for the public static demo. Add it when you want:

- real authentication
- cloud-synced courses and deadlines
- cross-device reminders

Do not commit Firebase service accounts, private keys, `.env.local`, `.dev.vars`, or API tokens. Use hosting environment variables and provider secret stores.

## GitHub Pages

This repository deploys through `.github/workflows/jekyll-gh-pages.yml`.

For a GitHub Pages project site, set the base path when building locally:

```env
VITE_BASE_PATH=/your-repo-name/
```

The GitHub Actions workflow derives the base path automatically from the repository name during deployment.

## Project Structure

```text
src/
  components/
    BottomNav.tsx
  pages/
    Home.tsx
    Login.tsx
    PlannerApp.tsx
  localAuth.ts
  storage.ts
  syllabusParser.ts
  deadlines.ts
  App.tsx
worker/
  src/
  wrangler.jsonc
```

## Privacy Notes

- The public frontend contains no API secret.
- Local demo accounts are stored only in the current browser.
- Test syllabi and private course files should stay outside the repository.
- If a key was ever pasted into chat, rotate it even if it was never committed.

## Planner Flow

1. Upload one or more syllabus PDFs in Import.
2. Review the import summary for generated courses, tasks, exams, and reminders.
3. Use Tasks for the queue and open Calendar when you need the month view.
4. Edit parsed task or exam cards when a syllabus import needs correction.
5. Delete an uploaded syllabus to remove its imported course items from the planner.
