# CivilAid

A paid learning app for **Civil Engineering · NUST · BECE 2K25**. It's built with Expo (React Native) and Supabase.

Content is organised as **Subject → Lecture → Module**. Each module has a video, notes and a quiz. Lecture 1 of every subject is free. Everything else unlocks for Rs 1000 per semester.

| Phase | What | Status |
|---|---|---|
| 1 | Project setup, database + security rules, sign up / sign in | ✅ done |
| 2 | Subjects → lectures → modules (video, notes, quiz) | ✅ done |
| 3 | Paywall, payment upload, admin approval | next |
| 4 | Progress, streaks, home dashboard | |
| 5 | Admin content management + JSON bulk import | |
| 6 | Anti-sharing protections | |
| 7 | EAS Build → APK | |

---

## One-time setup (about 20 minutes)

### 1. Install the tools

- **Node.js 20 or newer** (LTS) from <https://nodejs.org>. Check with `node -v`.
- **Expo Go** on your Android phone, from the Play Store.
- Your phone and laptop must be on the **same Wi-Fi**.

### 2. Create the Supabase project

1. Sign in at <https://supabase.com> → **New project**.
2. Name: `civilaid`. Pick a strong database password and save it somewhere safe.
3. Region: **South Asia (Mumbai)**, the closest to Pakistan. Then click **Create**.
4. Wait about 2 minutes for it to finish setting up.

### 3. Create the database tables

1. In Supabase, open **SQL Editor** → **New query**.
2. Open `supabase/migrations/20261006000001_schema.sql` from this folder. Copy all of it, paste it in, and click **Run**. It should say *Success. No rows returned*.
3. Do the same for `20261006000002_rls.sql`, then `20261006000003_storage.sql`, **in that order**.
4. Check: **Table Editor** should list 12 tables (`profiles`, `subjects`, `lectures`, …). **Storage** should list 3 buckets.

> Run each file **once only**. Running a file a second time gives "already exists" errors. Those are harmless, but don't edit and re-run old files. Later phases add new migration files instead.

### 4. Configure sign-in

Go to **Authentication → Sign In / Providers** (on older dashboards, **Providers → Email**):

- **Email**: enabled.
- **Confirm email**: **turn OFF** (recommended). Supabase's built-in email sender only allows a few emails per hour. With 100+ classmates signing up, most would never get their confirmation link. You approve every payment by hand anyway, so the email check adds little. If you later add a custom SMTP sender, you can turn it back on; the app already handles the "check your email" step.
- **Minimum password length**: 8, to match the app.

### 5. Connect the app to Supabase

1. In Supabase, go to **Project Settings → API Keys** (or **API**). Copy:
   - the **Project URL** (`https://xxxx.supabase.co`), from **Project Settings → Data API** on newer dashboards
   - the **Publishable key** (`sb_publishable_…`). If you only see the older **anon public** key, that works too.
2. In this folder, copy `.env.example` to a new file called **`.env.local`** and paste the two values in:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_xxxx
   ```

   These keys are meant to be public; the database security rules protect the data. **Never** put the `service_role` / secret key in the app.

### 6. Run the app

```bash
cd civilaid
npm install
npx expo start
```

- **Phone:** open Expo Go → **Scan QR code** → scan the code in the terminal.
- **Laptop browser** (this is how you'll use the admin panel): press **`w`** in the terminal.
- After editing `.env.local`, restart with `npx expo start --clear`.

### 7. Make yourself admin

1. In the app, **create an account** for yourself.
2. In Supabase → SQL Editor, run block 1 of `supabase/snippets/first-time-setup.sql`, with your email filled in.
3. In the app, log out and sign in again. The Profile tab now says **Admin** and shows **Open admin panel**.

Blocks 2 and 3 of that file (semester dates, JazzCash/Easypaisa number) are needed from Phase 3 onward. You can run them now or later.

---

## Getting an APK onto your phone

Every push that changes `civilaid/` builds an APK on GitHub Actions in about 15 minutes.

1. On GitHub, open the repo → **Releases**, and find the newest **CivilAid - build N**.
2. Open it on your Android phone and tap the `.apk` file. Allow "install unknown apps" for your browser when Android asks.

To start a build without pushing, go to **Actions → Build CivilAid APK → Run workflow**.

**Demo mode vs connected:** an APK built without Supabase keys ends in `-demo`. It runs on fake local data: any email and password signs in, and an email starting with `admin` shows the admin panel. To build one that talks to your real Supabase project, add two secrets under **repo Settings → Secrets and variables → Actions → New repository secret**:

- `EXPO_PUBLIC_SUPABASE_URL`: your Project URL
- `EXPO_PUBLIC_SUPABASE_KEY`: your publishable key

Then run the workflow again.

> These test APKs are signed with a shared debug key. They're fine for your own phone, but don't hand them to students; Phase 7 sets up proper signed builds.

---

## Testing Phase 1

Work through this list. Each line says what should happen.

**Sign-up and sign-in (on your phone in Expo Go)**

1. Tap **Create account** with everything empty → every field shows a red message.
2. Type letters into CMS ID → they're ignored; only digits go in.
3. Enter mismatched passwords → "Passwords don't match".
4. Fill everything in properly → you land on **Home** with "Good morning/afternoon/evening, *your name* 👋".
5. **Profile** tab → your name, email, CMS ID and section are correct. Status is **Not active**.
6. In Supabase **Table Editor → profiles**, your row is there with the same CMS ID and section.
7. Close Expo Go completely and reopen the app → you're still signed in.
8. **Log out** → you're back on the sign-in screen.
9. Sign in with a wrong password → "Wrong email or password."
10. Try to sign up again with the **same CMS ID** but a different email → "This CMS ID is already registered".

**Admin**

11. Make yourself admin (setup step 7) → Profile shows **Admin** and **Open admin panel**, which opens the admin screen.
12. Sign in as a normal student and open `http://localhost:8081/admin` in the browser → you don't get the admin screen.

**Look and feel**

13. Switch your phone to dark mode → the whole app switches to the dark theme.
14. Press `w` and try the same sign-in in a laptop browser → it works the same way.

**Database security (optional, in SQL Editor)**

15. Run the "Handy checks" at the bottom of `first-time-setup.sql` → every table shows `rowsecurity = true`.

---

## Testing Phase 2

**Quickest: demo mode** (the `-demo` APK, or `npx expo start` without `.env.local`)

1. Sign in with any email. **Subjects** lists two sample subjects with progress rings at 0%.
2. Open **Engineering Mechanics** → Lecture 1 shows **Free**; Lecture 2 shows a lock and is greyed out. Tapping it, or **Unlock for Rs 1000**, opens the "Payments are coming soon" screen (Phase 3 builds the real one).
3. Open Lecture 1 → module 1.1 → three steps across the top: **Video · Notes · Quiz**.
4. **Video:** a short sample clip plays, with fullscreen and no download or picture-in-picture. Watch it to the end and the Video step gets a ✓.
5. **Notes:** formulas render as proper maths (fractions, square roots, subscripts). There's also a table and a highlighted tip. Opening the notes ticks the step.
6. **Quiz:** answer wrong → red with a shake; answer right → green with a small bounce. Both show an explanation. The end screen shows your score. Retake → "Best so far" shows your earlier best.
7. With all three steps done, "Module complete 🎉" appears with a **Next** button. Go back: the module, lecture and subject rings update.
8. Sign out and sign in with an email starting with `admin` → every lecture is unlocked.
9. Switch your phone to dark mode and repeat a couple of screens.

> Demo progress lives in memory and resets when the app restarts.

**Against your real Supabase project**

1. Run `supabase/snippets/sample-content.sql` in the SQL Editor.
2. As a normal student: Lecture 1 opens; Lecture 2 is locked. Also try opening a Lecture 2 module through a link — its notes and quiz don't load, because the database refuses them.
3. Finish a module. In **Table Editor**, `module_progress` gets a row with `completed_at` set, `quiz_attempts` gets your score, and `activity_days` gets today's date.
4. As admin: everything is open.
5. Video: upload a small `.mp4` in **Storage → videos** into a folder named after the module id, then run the `update … video_path` line at the bottom of the snippet.

**Module completion rule:** watch the video to 90%, open the notes, and attempt the quiz at least once. A module without a video or quiz skips that step.

---

## How access works

- **Free:** the first published lecture (lowest order number) of each subject.
- **Paid:** a student is **active** while their approved payment is for the **current semester** and that semester's end date hasn't passed. Changing the end date moves everyone's expiry. Starting a new semester locks everyone until they pay again.
- **Admins** (`profiles.role = 'admin'`) can read and change everything.

The **database** enforces all of this with Row Level Security, so hiding a screen in the app is never the only protection:

| Data | Students can… |
|---|---|
| Subjects, lectures, module titles | read published ones (so locked items can still be listed) |
| Module notes, quiz questions, videos | read only if the module is free or they're active |
| Their profile | read it; change only their name and section |
| Payments | submit their own (amount, semester and status are set by the server); read their own |
| Progress, quiz attempts, streak days | read and write their own, only for modules they can open |
| Anything belonging to another student | nothing |

Storage buckets: `videos` (private, played through short-lived signed links), `payment-screenshots` (private, each student's own folder), `note-images` (public, for pictures inside notes).

---

## Project layout

```
civilaid/
├── src/
│   ├── app/                 # screens; every file is a route (Expo Router)
│   │   ├── _layout.tsx      # fonts, theme, auth, and which screens each user can reach
│   │   ├── (auth)/          # sign-in, sign-up
│   │   ├── (tabs)/          # Home, Subjects, Progress, Profile
│   │   └── admin/           # admin-only screens
│   ├── auth/AuthProvider.tsx
│   ├── components/ui/       # Button, TextField, Card, AppText, …
│   ├── components/notes/    # Markdown + formula (MathJax → SVG) renderer
│   ├── components/content/  # quiz, video player, lock/unlock UI
│   ├── lib/                 # supabase client, content queries, progress rules, demo data
│   └── theme/               # colours (light/dark), Poppins type scale
├── supabase/
│   ├── migrations/          # run in order in the SQL Editor
│   └── snippets/            # one-off SQL you edit and run by hand
└── .env.local               # your Supabase URL + key (not committed)
```

Settings you might change:

- `src/lib/config.ts`: app name, batch label, and the **sections** shown on sign-up (currently A–D).
- `src/theme/colors.ts`: brand colours (from the logo: blue `#1E5EFE`, navy `#0A1330`).

Checks to run before committing:

```bash
npm run typecheck && npm run lint && npm test
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Sign-in screen says "Demo mode" | `.env.local` is missing or misspelled (or, for the APK, the GitHub secrets aren't set). Fix it, then run `npx expo start --clear`. |
| "Couldn't load your account" after sign-in | The profile row is missing. Most likely the migrations weren't run before that account was created. Delete the user in **Authentication → Users** and sign up again. |
| "Database error saving new user" | That CMS ID is already registered to another account. |
| Phone can't connect to the dev server | Make sure phone and laptop are on the same Wi-Fi, or run `npx expo start --tunnel`. |
| Signed up but never got a confirmation email | Turn off **Confirm email** (setup step 4) and delete and recreate the user. |
