# Reminders

A single-user reminders app for iOS and Android, built with React Native and Expo.
Everything lives on the device — no account, no backend, no network calls.

- A list of reminders showing time, title, repeat rule and when each next fires
- Add, edit and delete reminders: title, optional notes, date & time, repeat rule
- Repeat: never, daily, weekdays, weekly, or a custom set of days
- A switch on every row to turn a reminder off without losing it
- Local notifications that fire at the set time whether or not the app is running
- Follows the system light/dark appearance

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS). The app asks
for notification permission the first time it launches.

To try a notification quickly, add a reminder a couple of minutes out, then close
the app — it will still arrive.

> On launch Expo Go logs `expo-notifications functionality is not fully supported
> in Expo Go`. That warning is about **remote push notifications**, which this app
> does not use. Locally scheduled notifications — the only kind here — work fine in
> Expo Go. For a build with no such caveats, see [Native builds](#native-builds).

Other scripts:

```bash
npm test        # jest, run against both iOS and Android module resolution
npm run typecheck
npm run assets  # regenerates the icons in assets/
```

## How it works

```
index.ts                     entry point
App.tsx                      home screen: list, header, FAB, editor modal
src/
  types.ts                   Reminder shape and repeat options
  theme.ts                   light and dark palettes, spacing scale
  schedule.ts                pure date maths: next occurrence, labels, sorting
  storage.ts                 AsyncStorage read/write with defensive parsing
  notifications.ts           permissions, Android channel, schedule/cancel/resync
  useReminders.ts            the store: state + mutations, kept in sync with the OS
  components/                ReminderRow, ReminderEditor, DayPicker, Segmented, …
scripts/generate-assets.js   draws the app icons; no binary assets to hand-edit
```

### Storage

Reminders are a small, flat list that is always read and written whole, so
`AsyncStorage` is the better fit here — no schema, no migrations, no query layer,
one round trip on launch. `expo-sqlite` would earn its keep if reminders grew
relations, needed partial queries, or ran to thousands of rows; at this size it is
just more moving parts. `src/storage.ts` validates every field it reads back, so a
corrupt or older blob degrades to sensible defaults instead of crashing.

### Scheduling

Every mutation follows the same path: cancel whatever the reminder had scheduled,
schedule what it needs now, then persist. That keeps storage and the OS schedule
from drifting apart.

Repeat rules map onto `expo-notifications` triggers like this:

| Repeat   | Trigger                                                   |
| -------- | --------------------------------------------------------- |
| Never    | one `DATE` trigger; skipped entirely if the time has passed |
| Daily    | one `DAILY` trigger (hour + minute)                        |
| Weekly   | one `WEEKLY` trigger on the weekday of the chosen date     |
| Weekdays | five `WEEKLY` triggers, Monday–Friday                      |
| Custom   | one `WEEKLY` trigger per selected day                      |

A reminder therefore owns a *list* of notification ids, since `WEEKLY` triggers
take a single weekday each. Note that `expo-notifications` numbers weekdays 1–7
starting at Sunday, while the app stores JavaScript's 0–6 — `src/schedule.ts` owns
that conversion and `__tests__/schedule.test.ts` pins it down.

On every launch the app re-schedules everything from storage. Pending notifications
are lost on reinstall, on some Android OEM cleanups, and when Expo Go switches
projects, so a resync is the difference between reminders that keep working and
reminders that silently stop. Only notifications tagged as this app's are cancelled,
so nothing else in Expo Go is disturbed.

## Native builds

`app.json` and `eas.json` are set up for both platforms:

- **iOS** — bundle identifier, and the `expo-notifications` plugin.
- **Android** — package name, a `reminders` notification channel at max importance,
  the white-on-transparent notification icon and its tint, plus
  `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`,
  `VIBRATE` and `WAKE_LOCK`.

```bash
npx eas build --profile development --platform android   # or ios
npx eas build --profile preview --platform android       # installable APK
```

`SCHEDULE_EXACT_ALARM` is what keeps delivery punctual on Android 12+. The stronger
`USE_EXACT_ALARM` is deliberately left out, since it invites extra Play Store
review; without it, a device in aggressive battery-saving mode may still delay a
reminder by a few minutes.

## Known limits

- Repeating reminders fire at the same wall-clock time wherever you are — the OS
  evaluates the hour and minute in local time, so 7:30 stays 7:30 across a time
  zone change. A one-off reminder is pinned to an absolute instant instead, so it
  does shift.
- iOS caps an app at 64 pending local notifications, and each repeating day counts
  as one: ~64 daily reminders, or ~9 that repeat on all seven days. Past that, iOS
  keeps the soonest and drops the rest.
- Deleting the app deletes the reminders with it. There is no export or backup.
