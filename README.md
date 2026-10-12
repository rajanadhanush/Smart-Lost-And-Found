# Smart Lost & Found v23-spark (100% free Firebase Spark plan)

Single-page app (`public/index.html`) on **Firebase Hosting** with **Authentication (Email/Password)** and **Cloud Firestore**.
No Cloud Functions. No Cloud Storage. No credit or debit card needed. Your v22 design, rainbow theme, university selector,
top-right logo and Pinky are preserved.

## Why Storage is gone too (read this once)
You asked to keep Cloud Storage because it is free on Spark. **It no longer is.** Google changed this: since **3 February 2026**,
Cloud Storage for Firebase needs the Blaze plan for every project, even when usage stays inside the free quota
(official notice: <https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024>). On Spark, Storage calls fail with
errors 402/403. A project cannot use Storage without a billing account, so this version stores photos and proof files in **Firestore** instead.

## What changed from v23 (the Blaze version)
| Was (needed Blaze) | Now (Spark) |
|---|---|
| Cloud Functions wrote notifications | **Computed in the browser** from live data (matches, claim updates, requests for proof, returns). They show while the app is open. No push, no e-mail. "Mark all as read" syncs through your profile; marking one is remembered on that device only |
| Cloud Functions proxied Gemini (secret key) | **Gemini is called from the browser.** Optional, off by default (key field is empty). A key in a web page is public: see step 7 |
| Rate limits stored by a function | Browser-side throttle (15 Pinky / 10 AI-check requests per minute). It stops accidents, not attackers. Google's own quota is the real limit |
| Report photos and profile photos in Storage | Shrunk in the browser (about 45 KB) and saved **inside the report / profile document** |
| Claim proof in Storage (images/PDF up to 8 MB) | A **private document** `claimEvidence/{id}`, written in the same transaction as the claim. Photos are shrunk; **PDFs must be 480 KB or smaller** |
| Daily cleanup of orphaned uploads | **Not needed**: proof is saved atomically with its claim, so nothing is left behind |
| `storage.rules`, CORS file, Storage service-account role | **Removed** |

Unchanged: Email/Password sign-up with e-mail verification, university scoping, matching engine, claim workflow and timeline, staff
dashboard, audit log, CSV export, Pinky FAQ mode, Firestore security rules (extended, see `docs/CHANGES_v23_to_v23-spark.md`).
Claims are **never** approved by AI.

## Spark limits to keep in mind (check current numbers at <https://firebase.google.com/pricing>)
Firestore on Spark: about 1 GiB stored, 50,000 reads/day, 20,000 writes/day, 10 GiB/month outbound data. Hosting: about 10 GB stored, 360 MB/day transfer.
* One report photo is at most about 45 KB, so the feed (40 reports) is at most about 1.8 MB per load. A busy campus can use up the
  monthly outbound allowance; if the app stops loading data, check **Firebase console > Usage**. Quotas reset daily/monthly. Nothing is billed on Spark; the app just pauses.
* Staff delete returned items to free space (that also deletes their proof files).

## Setup checklist (free plan only)
Do these in order. Nothing here asks for a card.

1. **Back up first.** See `docs/ROLLBACK.md` (copy your current Firestore rules from the console).
2. **Install tools and sign in**
   ```
   npm i -g firebase-tools
   firebase login
   firebase use smart-lost-and-found-424c5      # already set in .firebaserc
   ```
3. **Check the console (Firebase console > Build)**
   * *Authentication* > Sign-in method: **Email/Password** is enabled. Also add your site address under Settings > Authorized domains (it is there by default for `*.web.app` / `*.firebaseapp.com`).
   * *Firestore Database* exists (production mode). **Do not click "Get started" under Storage**: it will ask you to upgrade. You do not need it.
   * Plan shows **Spark** (bottom-left of the console). Leave it.
4. **Deploy rules + indexes** (no functions, no storage; they are not in `firebase.json` any more)
   ```
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   Indexes take a few minutes. Until they are ready the app may say "The database needs an index".
   If your rules were ever in "test mode" (`allow read, write: if true`), v22 was open to everyone; these rules close that.
5. **Deploy the app**
   ```
   firebase deploy --only hosting
   ```
   (`firebase deploy` with no flags is also safe now, because there is nothing paid left to deploy.)
6. **Make staff accounts (no scripts needed).** Sign up as a normal user, then Firebase console > Firestore > `users` > *your uid* >
   set the field `role` to the text `admin`. Reload the app. Find the uid in console > Authentication.
   (Optional script instead: `cd scripts && npm i && GOOGLE_APPLICATION_CREDENTIALS=/path/key.json node set-admin.js <uid>`. A service-account key is free.)
7. **Optional: turn on Gemini AI (Pinky answers + "Ask AI to double-check").** Skip this and everything else works; Pinky uses its built-in help.
   1. Open <https://aistudio.google.com/apikey> and create a key. **Do not attach a billing account**: the free tier cannot charge you.
   2. In Google Cloud console > APIs & Services > Credentials > your key > *Application restrictions: Websites*, add
      `https://smart-lost-and-found-424c5.web.app/*` and `https://smart-lost-and-found-424c5.firebaseapp.com/*` (plus `http://localhost:*/*` only while testing). Restrict the API to *Generative Language API*.
   3. Paste the key into `public/index.html` at `const GEMINI_API_KEY='';` and run `firebase deploy --only hosting`.
   4. Be aware: the key is visible to anyone who views the page source, so the referrer restriction and the free quota are your only protection (worst case: AI stops until the quota resets). Google may use free-tier inputs to improve its models: the app sends only the *public* fields of reports and the chat text, never phone numbers, proof, hidden details or files.
   5. The model list (`GEMINI_MODELS`) starts with the `gemini-flash-latest` alias because the Gemini 2.5 models are scheduled to shut down on 16 October 2026. If AI says it is unavailable, open AI Studio and put a current free Flash model name first.
   6. If your Android APK loads the hosted web address it works as above. If it loads local files, referrer restrictions will block the key: leave AI off there.
8. **Optional: migrate v22 data** (only if you have v22 reports/claims; needs a free service-account key)
   ```
   cd scripts && npm install && cd ..
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json   # keep OUT of this folder
   node scripts/migrate-v22-to-v23.js            # dry run
   node scripts/migrate-v22-to-v23.js --apply
   ```
   v22 photos that were uploaded to Storage cannot be shown (the bucket is locked on Spark); the reports remain, with a category icon.
9. **Rebuild the APK in Android Studio** as before (same single file plus `logos/`).

## Manual test checklist (about 15 minutes, two browsers or one normal + one private window)
1. Sign up user A (real mailbox), click the verification link, sign in. Expect the home screen with your university logo.
2. User A: *I Lost Something* with no photo, hidden detail filled. Expect "Report posted"; it appears in Feed.
3. Sign up and verify user B (same university). *I Found Something* **without** a photo: expect "photo ... required". Add a big phone photo: expect it to post.
4. User A: bell icon shows "Possible match" within seconds (matches tab too). Open *Compare*.
5. User A: *This is mine*, type proof, attach a **photo** and then try a **PDF larger than 480 KB** (expect a clear refusal) and a small PDF (accepted). Expect the claim timeline.
6. User B: bell shows "A claim was submitted for your report".
7. Staff account: Staff tab shows the claim. Open evidence (photo/PDF), *Start review*, *Request more proof*. User A: bell says "Staff need more proof"; reply with a photo.
8. Staff: *Approve match*, then *Confirm handover*. User A: "Claim approved" then "Item returned"; both reports close; finder contact appears only after approval.
9. Staff: delete a returned report; Firestore > `claimEvidence` loses that claim's files.
10. Pinky: ask "how do claims work" (works with AI off). If you did step 7, ask something else and expect a labelled "AI suggestion".
11. Firebase console > Usage: confirm reads/writes are far below the daily limits and the plan still says Spark.

## Automated tests
```
node tests/unit.test.js                                          # logic + static checks (no Storage/Functions left, key empty, rules sanity)
NODE_PATH=$(npm root -g) node tests/ui.test.js                   # real index.html in Chromium + in-memory fake Firebase (needs playwright)
npm i && npm run test:rules                                      # Firebase Emulator rules tests (needs Java; you must run these)
```
`docs/TEST_REPORT.md` says exactly what was and was not run.

## Files
`public/` app · `firestore.rules` `firestore.indexes.json` `firebase.json` · `scripts/` (optional admin tools) · `tests/` · `docs/` · `.env.example`
Removed from v23: `functions/`, `storage.rules`, `cors.json`.

## Universities and logos
Put official logos in `public/logos/<domain>.png` (see `public/logos/README.txt`). University scoping is a privacy convenience, **not** a hard security boundary: a user chooses
their own university at sign-up. For a hard boundary, restrict sign-up to institutional e-mail domains.
