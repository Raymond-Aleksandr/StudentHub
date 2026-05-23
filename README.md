# StudentHub

StudentHub is a mobile-first study planner for turning course syllabi into a usable term plan. The frontend is a static React app that can be published to GitHub Pages without committing API keys, Firebase credentials, service accounts, or Worker secrets.

## What It Does

- Imports PDF syllabi through a required Cloudflare Worker parser.
- Extracts courses, deadlines, quizzes, tests, exams, and reminders.
- Organizes the planner around Today, Import, Tasks, Exams, Courses, and Calendar views.
- Stores planner data in the current browser with local profiles.
- Offers a blank local profile for trying the app without sample data.
- Lets users add and edit courses, tasks, exams, calendar items, and imported syllabus metadata.
- Provides theme tweaks for accent color, density, and dark mode.
- Keeps cross-device sync optional. Firebase is not currently wired into the app.

## Current Architecture

```text
GitHub Pages static app
  -> React + TypeScript + Vite
  -> React Router SPA routes
  -> local browser auth and localStorage planner data
  -> Cloudflare Worker for PDF syllabus parsing
  -> OpenRouter from the Worker, never from the frontend
```

The static frontend can run without secrets. PDF syllabus import only works when the Cloudflare Worker is deployed and reachable. If the Worker is down, misconfigured, blocked by CORS, or missing `OPENROUTER_API_KEY`, the app reports an import error and does not fall back to browser PDF parsing.

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Lucide React
- Cloudflare Workers
- OpenRouter file parsing from the Worker

## App Routes

Public routes:

- `/` - marketing/home page
- `/login` - local profile sign-in/create/blank-profile entry

Protected planner routes:

- `/dashboard` - Today view
- `/import` - PDF syllabus import and imported syllabus list
- `/tasks` - task queue and quick task creation
- `/calendar` - month calendar and date-specific items
- `/exams` - quizzes, tests, exams, countdowns, and exam timeline
- `/course-info` - course list, course details, and course editor

Compatibility redirects:

- `/syllabus` redirects to `/import`
- `/assignments` redirects to `/tasks`

## Local Setup

Install dependencies and start the frontend:

```bash
npm install
npm run dev
```

Run checks before publishing:

```bash
npm run lint
npm run build
npm audit --omit=dev
```

Available root scripts:

```bash
npm run dev            # Vite dev server
npm run build          # TypeScript project build + Vite production build
npm run lint           # ESLint
npm run preview        # Preview the production build
npm run worker:dev     # Run the Cloudflare Worker locally
npm run worker:deploy  # Deploy the Worker with Wrangler
npm run worker:check   # Wrangler dry-run deploy check
```

`worker:check` runs `wrangler deploy --dry-run`, which may contact Cloudflare. Use it only when that is acceptable.

## Local PDF Import Testing

Syllabus import requires the Worker. Run the frontend and Worker in separate terminals:

```bash
cp worker/.dev.vars.example worker/.dev.vars
# Edit worker/.dev.vars and set OPENROUTER_API_KEY to your own key.
npm run worker:dev
```

When the frontend runs on `http://127.0.0.1` or `http://localhost`, it uses:

```text
http://127.0.0.1:8787/parse
```

The default `worker/.dev.vars.example` allows these local frontend origins:

```text
http://127.0.0.1:5173
http://localhost:5173
```

If Vite starts on another port, update `ALLOWED_ORIGINS` in `worker/.dev.vars`.

## Cloudflare Worker Parser

The Worker lives in `worker/`. It accepts `POST /parse`, validates PDF uploads, calls OpenRouter with the PDF file, normalizes the response, and returns the planner data shape expected by the frontend.

Deploy your own Worker:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

Then point the frontend at your Worker:

```env
VITE_SYLLABUS_PARSER_URL=https://your-worker.your-subdomain.workers.dev/parse
```

If `VITE_SYLLABUS_PARSER_URL` is blank:

- Localhost uses `http://127.0.0.1:8787/parse`.
- Production uses the default Worker URL configured in `src/syllabusParser.ts`.

For forks or real deployments, use your own Worker endpoint and update `ALLOWED_ORIGINS` in `worker/wrangler.jsonc`. The deployed Worker currently allow-lists browser origins, not full paths. Origin checks help protect browser usage, but they are not a complete abuse-control system. Add rate limiting, Turnstile, auth, or similar controls before exposing a high-traffic parser.

## GitHub Pages Deployment

GitHub Pages deployment is configured in:

```text
.github/workflows/jekyll-gh-pages.yml
```

The workflow runs on pushes to `main`, installs root dependencies, builds the Vite app, uploads `dist`, and deploys with `actions/deploy-pages`.

For GitHub Pages project sites, `vite.config.ts` derives the production base path from `GITHUB_REPOSITORY` inside GitHub Actions. For local production builds targeting a project site, set:

```env
VITE_BASE_PATH=/your-repo-name/
```

SPA direct-route refreshes are handled by `public/404.html` and the redirect repair script in `index.html`.

## Data and Privacy

- The frontend contains no API secret.
- Planner data is stored in `localStorage` under the current browser profile.
- Local email/password profiles are browser-local only. They are not cloud accounts.
- Passwords are hashed with Web Crypto before being stored locally, but this is still local browser auth, not production authentication.
- The blank profile resets its planner data when opened.
- Uploaded PDFs are sent to the configured Worker for parsing.
- The Worker does not store uploaded PDFs.
- Do not commit `.env.local`, `worker/.dev.vars`, API keys, service accounts, private syllabi, or test course files.

## Firebase

Firebase is not required and is not currently configured in the runtime. The UI and README mention it only as a possible future bring-your-own sync backend.

Use Firebase or another backend later if you want:

- real authentication
- cross-device sync
- cloud-stored courses and deadlines
- reminders beyond the current browser

## Project Structure

```text
src/
  App.tsx                    # Router, protected shell, theme tweaks
  main.tsx                   # React entry point
  localAuth.ts               # Browser-local auth/profile helpers
  syllabusParser.ts          # Frontend Worker client
  components/
    BottomNav.tsx            # Mobile bottom navigation
    EventCard.tsx            # Shared task/exam item and edit modal
  data/
    PlannerContext.tsx       # Planner state, derived data, actions
    storage.ts               # localStorage subscriptions and persistence
    usePlanner.ts            # Planner context hook/export
  domain/
    calendar.ts              # Calendar grid/date helpers
    deadlines.ts             # Deadline types, countdowns, sorting
    merge.ts                 # Import normalization and merging
    types.ts                 # Domain types
  pages/
    Home.tsx                 # Public landing page
    Login.tsx                # Local profile login/create/blank profile
    TodayPage.tsx            # Dashboard
    ImportPage.tsx           # PDF import
    TasksPage.tsx            # Task queue
    CalendarPage.tsx         # Calendar
    ExamsPage.tsx            # Exams
    CoursesPage.tsx          # Courses
  planner.css                # Planner app styling
worker/
  src/index.ts               # Cloudflare Worker parser
  wrangler.jsonc             # Worker config and non-secret vars
  .dev.vars.example          # Local Worker env template
  README.md                  # Worker-specific setup notes
public/
  404.html                   # GitHub Pages SPA redirect helper
```

## Planner Flow

1. Open or create a local browser profile.
2. Import one or more syllabus PDFs from the Import page.
3. Review the import summary and imported syllabus list.
4. Edit parsed courses, tasks, exams, and calendar items where needed.
5. Use Today for the daily view, Tasks for the queue, Exams for assessments, Calendar for dates, and Courses for course-specific context.
6. Delete an imported syllabus to remove the course and events associated with that upload.

## Before Publishing to GitHub

Recommended final checks:

```bash
npm run lint
npm run build
npm audit --omit=dev
git status --short
```

Also confirm:

- `VITE_SYLLABUS_PARSER_URL` points to the Worker you want public users to hit, or you intentionally accept the default Worker in `src/syllabusParser.ts`.
- `worker/wrangler.jsonc` has the correct `ALLOWED_ORIGINS` for the deployed frontend origin.
- `OPENROUTER_API_KEY` is set as a Cloudflare Worker secret, not committed.
- `worker/.dev.vars` is not committed.
- Any private syllabi or test PDFs are outside the repo.
