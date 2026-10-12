# Test report (v23-spark)

Environment: sandbox with Node 22 and headless Chromium, **no network** (no firebase-tools, no live Firebase project, no Gemini key).
Raw output: `tests/last-unit-run.txt`, `tests/last-ui-run.txt`.

## Run and passed
* **`node tests/unit.test.js` 13/13**: matching engine; no `functions/` or `storage.rules`; no Storage/Functions references in the client; `firebase.json` lists neither;
  README has no functions/storage deploy step; Gemini key ships empty; no private keys; AI prompt contains only public fields; client status machine matches rules;
  rules sanity (no notifications collection, evidence create-only with its claim, photo caps, `updatedAt` on every report status write); brace balance; script parses.
* **`node tests/ui.test.js` 33/33**: the real `index.html` in Chromium against an in-memory fake Firebase that **has no `storage()` or `functions()`** (any call would crash).
  Covers: reports with inline photos, large photo shrunk, unreadable/uncompressible photo refused; claim with PDF saved in `claimEvidence` atomically; PDF > 480 KB refused; photo proof shrunk;
  disguised file refused; concurrent claim leaves nothing behind; computed notifications (own only, mark one, mark all saved on profile, finder and staff notifications, no notification documents written);
  Pinky with AI off (no network), with a key (model fallback, header-only key, no private data in prompts), 429 and throttle; AI check on/off/failing; staff opens proof, tampered proof refused;
  staff workflow, CSV, search, keyboard, responsive overflow at 360/768/1280 px.

## NOT run: you must verify
| Not tested | Why | How |
|---|---|---|
| **Firestore security rules** (the new `claimEvidence`, `updatedAt`, photo caps) | Emulator needs firebase-tools + Java; the rules were only checked for syntax balance and against the client | `npm i && npm run test:rules` (`tests/rules.test.js`, updated, never executed). Treat any failure as a rules bug. Also watch for "rules evaluation exceeded 20 document accesses" on claim submit |
| Real Firestore size limits | Fake DB has none | Submit a claim with a 450 KB PDF and a large photo on the real project |
| Real sign-up, e-mail verification, login | Fake auth | Manual checklist in README |
| Real Gemini calls, key restriction, CORS from your domain | No key, no network | README step 7, then ask Pinky a non-FAQ question |
| Firestore quota behaviour | Needs live traffic | Firebase console > Usage |
| Indexes, migration and admin scripts | Need live project | Run migration as dry run first |
| Android APK / WebView | No device | Test in your APK |
