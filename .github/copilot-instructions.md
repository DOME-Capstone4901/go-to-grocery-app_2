## Purpose
Short guidance to help AI coding agents be productive in this repo (Go-To Grocery App).

## High-level architecture (what to know)
- This is an Expo React Native app using expo-router for file-based routing. Screens and routes live in the `app/` directory (e.g. `app/index.jsx`, `app/details.jsx`, `app/myPantry.jsx`).
- The app uses Expo + React Native (see `package.json` scripts: `expo start` for dev). Target platforms: iOS, Android, Web (via Expo).
- Remote data is intended to be served via Supabase. A Supabase client is created in `src/lib/supabase.ts` and expects env vars `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY`.

## Key files to inspect when making changes
- `app/` — all screens and route files. Adding a new file here generally creates a new route (expo-router behavior).
- `app/layout.jsx` — defines the tab layout (Tabs and main sections).
- `app/index.jsx` — example home/search screen demonstrating navigation patterns and props passed via `router.push(...params...)`.
- `src/lib/supabase.ts` — Supabase client setup; uses `AsyncStorage` for auth persistence and `process.env.EXPO_PUBLIC_SUPABASE_*` env variables.
- `package.json` — dev/start scripts: use `npm start` or `yarn start` to open the Expo dev server.

## Project-specific conventions & patterns
- File-based routing: follow expo-router patterns — create `app/<route>.jsx` for screens and nested folders for nested routes. `app/layout.jsx` configures top-level Tabs.
- Navigation: code uses `router.push({ pathname: '/details', params: { ... } })` (see `app/index.jsx`). When adding or updating pages, preserve and document any expected route params.
- JS/JSX with occasional TypeScript: most app screens are `.jsx` files; shared client code (Supabase client) is `.ts`. Keep simple screens in `.jsx` unless a stricter type contract is needed.
- State and storage: Supabase auth/session persistence uses `AsyncStorage` (see `src/lib/supabase.ts`). Avoid breaking this integration when changing auth or client code.

## Environment and secrets
- Required env variables for development: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`. These are referenced in `src/lib/supabase.ts` and must be provided to Expo during local runs.
- Do not hard-code secrets or keys in the codebase. Use Expo `.env` solutions or the local environment when running the dev server.

## How to make common edits (practical examples)
- Add a new screen route: create `app/newScreen.jsx`. Use `export default function NewScreen(){ ... }`. The file path becomes `/newScreen` route automatically.
- Pass parameters to `details` screen: follow `router.push({ pathname: '/details', params: { name: item.name, category: item.category } })` as in `app/index.jsx`.
- Update Supabase queries: import `supabase` from `src/lib/supabase.ts`. Keep AsyncStorage-based auth settings intact when adjusting client options.

## Developer workflows
- Run dev server: `npm start` (runs `expo start`) — uses the Expo CLI/Metro bundler. To test on device/emulator use the Expo dev tools options or `npm run android` / `npm run ios`.
- Debugging: use Expo dev tools and React Native logs. Common breakpoints are UI screens in `app/` and the Supabase client in `src/lib/supabase.ts`.

## Tests and CI
- This repo has no tests or CI config in-tree. If adding tests, prefer lightweight Jest or React Native Testing Library for screen/unit tests and document the commands in `package.json`.

## Pull request notes for AI agents
- Keep changes small and focused. When editing shared files like `src/lib/supabase.ts`, preserve AsyncStorage and environment-driven client creation.
- When adding screens, ensure navigation params are validated or documented in the file's top comments.
- Mention any environment variables needed in PR description and include a quick manual test plan (e.g., "Start Expo, open app, navigate to X, confirm Y").

## Quick examples from this repo
- Navigation example (from `app/index.jsx`):
  router.push({ pathname: '/details', params: { name: item.name, category: item.category, inCart: inCart ? 'yes' : 'no' } })
- Supabase client (from `src/lib/supabase.ts`):
  createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_KEY!, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true } })

## If unsure
- Inspect `app/` and `src/lib/supabase.ts` for examples before changing patterns.
- Ask clarifying questions about environment secrets and intended Supabase schema before implementing new remote data features.

---
If you'd like changes to the tone, length, or to include more file examples (e.g., `app/addToPantry.jsx`), tell me which areas to expand and I'll iterate.
