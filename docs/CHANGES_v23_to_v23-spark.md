# v23 -> v23-spark: what changed so the app runs on the free Spark plan

## Why
Cloud Functions need Blaze, and since 3 Feb 2026 so does Cloud Storage for Firebase (official notice:
https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024). So both were removed.

## Removed
`functions/` (7 functions), `storage.rules`, `cors.json`, the Storage and Functions SDK script tags, `storageBucket` in the web config,
the `notifications` and `rateLimits` collections, the daily orphan-evidence cleanup, all Storage/Functions deploy steps.

## Replacements
| Feature | v23 (Blaze) | v23-spark |
|---|---|---|
| Notifications | written by 4 Firestore-trigger functions | `computeNotifs()` in `index.html`, derived from reports/claims already loaded. Unread = newer than `users/{uid}.notifSeenAt` and not marked on this device. Last 30 days, max 50 |
| Pinky AI / AI match check | callable functions + secret | `gemini()` in the browser; empty key = AI off. Same prompts, same public-fields-only input, advisory only. Model list updated (2.5 models shut down 16 Oct 2026) |
| Report photos | Storage + download URL | shrunk to <= 60,000 chars, stored in `reports/{id}.photo` (rules cap 70,000, must be a `data:image/...` URL) |
| Profile photos | Storage, inline fallback | always inline on the user document (<= 150,000 chars, unchanged rule) |
| Claim proof | Storage `evidence/...` | `claimEvidence/{claimId}_main` or `{claimId}_x<13-digit ms>`, created in the same transaction/batch as the claim; <= 700,000 chars; PDFs <= 480 KB; readable by claimant + staff only; immutable; staff can delete |
| Orphan cleanup | scheduled function | unnecessary (atomic write) |
| Rate limiting | Firestore counters in a function | browser throttle only |

## Rules changes (`firestore.rules`)
* New `claimEvidence` collection (see above). Claim create/owner-update now reference `evidenceId` / `extraEvidenceId` (checked with `existsAfter`) instead of Storage paths.
* Reports: `photoURL` / `photoPath` no longer allowed on create; `photo` capped at 70,000 and must be an image data URL; found reports still require a photo.
* Report status writes (reserve, release, staff status) must also set `updatedAt == request.time`, giving finders an accurate notification time.
* `users`: owner may write `notifSeenAt` (number only).
* `notifications` collection removed (falls into the default deny).

## Not available on Spark (by design)
Push notifications while the app is closed, e-mail, server-side rate limiting, secret API keys, PDFs over 480 KB, automatic cleanup jobs, Firestore backups/exports to a bucket.
