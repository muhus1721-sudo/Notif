# CivilAid — notes for AI assistants

Paid LMS for one university batch. Expo SDK 57 + Expo Router (routes in `src/app/`), TypeScript, Supabase.
Read `README.md` for the feature list, phases and access rules before changing anything.
The owner's spec is `docs/CivilAid-spec.pdf`: follow Sections 2–5 (logo, colour tokens, Sora type scale,
icon, animated splash) exactly.

## Rules for this project

- The owner is a solo developer: keep the stack simple, explain setup steps, and **ask before any
  architecture decision** that isn't already specified.
- Security lives in the database (RLS in `supabase/migrations/`). Hiding a screen is never enough —
  any new table needs RLS enabled plus policies, and paid content must go through `can_access_module()`.
- Never edit an applied migration; add a new timestamped file in `supabase/migrations/`.
- Never put the Supabase service-role key in the app. Only `EXPO_PUBLIC_SUPABASE_URL` / `_KEY`.
- The admin panel must keep working on Expo Web (`npx expo start --web`).
- Use the theme (`useTheme()`, `AppText`, `components/ui`) instead of hard-coded colours or fonts;
  every screen must work in light and dark mode.

## Expo has changed — don't trust training data

Expo ships breaking changes every SDK. Before using an Expo/EAS/React Native API, check the docs for
the `expo` major version in `package.json`: `https://docs.expo.dev/versions/v57.0.0/`, and the index
at https://docs.expo.dev/llms.txt.

```bash
npx expo install <package>  # always, instead of npm install — picks SDK-compatible versions
npm run typecheck && npm run lint && npm test   # before every commit
```

Expo Go only includes its bundled native modules; anything else needs a development build
(`eas build --profile development`). Never create or edit `android/` / `ios/` by hand.
