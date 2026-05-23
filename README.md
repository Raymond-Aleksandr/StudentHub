# StudentHub

StudentHub is a local-first study planner for turning course syllabi into a usable term plan. It imports PDF syllabi, extracts courses and graded assessments with the user's selected AI provider, and keeps the planner data on the current browser or device profile.

This repository contains both the Vite web app and the Capacitor iOS/Android app shell.

## Current Product

- Web landing page plus local profile sign-in and registration. This is not a hosted account system.
- Native iOS/Android opens directly into a device-local planner profile without the web landing or login page.
- PDF syllabus import through a user-configured AI provider.
- Provider presets for OpenAI, Google Gemini, OpenRouter, and DeepSeek through OpenRouter.
- Editable courses, tasks, quizzes, tests, exams, weights, earned scores, locations, dates, times, durations, reminder settings, and course colors.
- Today, Import, Tasks, Exams, Calendar, and Courses planner views.
- Course grade estimates when assessments have both syllabus weights and earned scores.
- Native iOS/Android support through Capacitor, including local notifications, app badge clearing, app icons, launch screen assets, and native storage for parser settings.
- GitHub Pages deployment for the static web app.

StudentHub does not include a production backend database. Planner data, local profiles, and AI-provider settings stay in local browser storage or native app storage.

## Repository Map

```text
src/
  App.tsx                    # React Router shell, protected routes, theme tweaks, notification panel
  components/                # Bottom nav, event card/edit modal helpers
  data/                      # Planner context plus localStorage persistence
  domain/                    # Date, grade, course, merge, and notification rules
  native/                    # Capacitor runtime checks, local AI settings, notifications, badge bridge
  pages/                     # Login, Today, Import, Tasks, Calendar, Exams, Courses
  syllabusParser.ts          # Current PDF parser entrypoint
ios/                         # Capacitor iOS project
android/                     # Capacitor Android project
worker/                      # Optional Cloudflare Worker parser, not the default app path
public/404.html              # GitHub Pages SPA route redirect
```

## App Flow

On the web, `/` is the landing page. Signed-out web users can use `/login` for a local browser profile or blank profile. Signed-in web users can open `/dashboard`.

In the native iOS/Android app, `/` and `/login` redirect to `/dashboard`. The native app automatically creates or reuses a device-local profile, so there is no login step on phone builds.

Routes:

- `/` - web landing page; native redirects to Today
- `/login` - web local profile sign-in/create screen; native redirects to Today
- `/dashboard` - Today planner
- `/import` - PDF upload, parser status, parser settings, imported syllabi
- `/tasks` - assignment and task queue
- `/calendar` - month calendar and selected-day list
- `/exams` - quiz, test, and exam view
- `/course-info` - course grid and course detail view
- `/syllabus` - redirects to `/import`
- `/assignments` - redirects to `/tasks`

The desktop sidebar and mobile bottom nav use React Router navigation. Tapping the already-active tab performs a soft in-app reset: it scrolls to the top and remounts that section without reloading the browser page.

## Parser Model

The active parser path is local user-provider parsing:

```text
PDF file -> src/syllabusParser.ts -> src/native/localAiParser.ts -> selected AI provider
```

Users configure the provider on the Import page. The key is stored locally:

- Web: browser `localStorage`
- Native app: Capacitor Preferences

Saving parser settings runs a lightweight provider/model check. A green/verified state means the configured key and selected model responded to that check; it does not mean any syllabus has already been parsed.

Uploaded PDFs are sent to the selected provider during parsing. API keys, private syllabi, `.env.local`, `worker/.dev.vars`, and provider secrets must not be committed.

Browser builds call providers directly from the browser. Some providers may block browser requests with CORS policy. The native app path is the more reliable local-key path because it does not run inside a normal browser page.

## Notifications

Native notifications are scheduled from future, incomplete tasks and exams when reminders are enabled.

- New imported and manually created items default to reminders on.
- Exams default to 7 days before.
- Tasks default to 2 days before.
- Each item stores `reminderEnabled` and `reminderDaysBefore`.
- The Tweaks panel can adjust upcoming reminder settings.
- The iOS badge bridge clears the badge when the app opens or becomes active.

Web browsers do not currently receive the same notification and badge behavior as the native app.

## Local Web Development

Install and run:

```bash
npm install
npm run dev
```

`npm run dev` starts Vite with `--host 0.0.0.0`, so the terminal will show a LAN URL that can be opened from a phone on the same network.

## Native App Development

Build the web app and sync Capacitor:

```bash
npm run cap:sync
```

Open native projects:

```bash
npm run cap:open:ios
npm run cap:open:android
```

iOS requires Xcode. Android requires a Java runtime plus Android Studio/SDK tooling.

For command-line iOS simulator verification:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -sdk iphonesimulator \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO build
```

For Android verification after Java and the Android SDK are installed:

```bash
cd android
./gradlew assembleDebug
```

## GitHub Pages Deployment

Deployment is configured in `.github/workflows/jekyll-gh-pages.yml`.

On pushes to `main`, GitHub Actions:

1. Checks out the repo.
2. Installs root npm dependencies.
3. Runs `npm run build`.
4. Uploads `dist`.
5. Deploys to GitHub Pages.

`vite.config.ts` derives the production base path from `GITHUB_REPOSITORY` inside GitHub Actions. For a local production build that targets a project site, set:

```env
VITE_BASE_PATH=/your-repo-name/
```

Direct route refreshes on GitHub Pages are handled by `public/404.html` and the repair script in `index.html`.

## Optional Worker Package

The `worker/` directory contains a Cloudflare Worker parser that can accept PDF uploads, validate browser origins, call OpenRouter, and return StudentHub's parser JSON shape.

The root app does not use this Worker by default. It is preserved as optional infrastructure for a future proxy-parser mode or deployment experiments.

Useful commands:

```bash
npm run worker:dev
npm run worker:check
npm run worker:deploy
```

Worker secrets belong in Cloudflare or `worker/.dev.vars`, never in source control.

## Scripts

```bash
npm run dev              # Vite dev server on 0.0.0.0
npm run build            # TypeScript project build plus Vite production build
npm run lint             # ESLint
npm run preview          # Preview the production build
npm run cap:sync         # Build web bundle and sync iOS/Android projects
npm run cap:open:ios     # Open the iOS project
npm run cap:open:android # Open the Android project
npm run cap:add:ios      # Add an iOS Capacitor project
npm run cap:add:android  # Add an Android Capacitor project
npm run worker:dev       # Run the optional Worker locally
npm run worker:check     # Wrangler dry-run deploy check
npm run worker:deploy    # Deploy the optional Worker
```

There is no root `npm test` script at the moment. TypeScript checking runs through `npm run build`. The Worker package has its own test script:

```bash
cd worker
npm test
```

## Pre-Publish Check

Run these before publishing or committing release-shaped changes:

```bash
npm run lint
npm run build
npm audit --omit=dev
git diff --check
npm run worker:check
cd worker && npm test
npm run cap:sync
```

When native files change, also verify the native build paths:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -list -project ios/App/App.xcodeproj
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
cd android && ./gradlew assembleDebug
```

The Android command requires a Java runtime. If Java is missing, Gradle will fail before it can check the project.

## Data and Privacy

- Web local profiles are stored on the current browser profile only.
- Native apps use a device-local profile and skip the web login page.
- Profile passwords are hashed with Web Crypto before local storage, but this is not production cloud authentication.
- Planner data is stored under `studenthub.<uid>.*` local keys.
- Parser settings are stored locally in browser `localStorage` or Capacitor Preferences.
- PDFs are sent to the selected AI provider only when the user imports them.
- Do not commit API keys, private syllabi, `.env.local`, `worker/.dev.vars`, generated build output, or real student data.

To clear local web data manually, remove the `studenthub.*` keys from the browser's local storage.
