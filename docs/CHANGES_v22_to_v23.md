> v23-spark: the Cloud Functions / Storage / Gemini-proxy parts of this list were replaced; see `docs/CHANGES_v23_to_v23-spark.md`.

# v22 -> v23: audit findings and what changed

## Audit findings in v22 (what was actually found in the ZIP)
| # | Finding | Severity | v23 |
|---|---|---|---|
| 1 | **No `firestore.rules` in the ZIP**; admin = `role`/`isAdmin` field on the user document, so unless console rules said otherwise any user could make themselves admin | Critical | `firestore.rules`: role/isAdmin immutable from clients; staff verified server-side |
| 2 | Every report stored the reporter's **phone number**, readable by all signed-in users | High | Removed from reports; contact is released on the claim only after staff approval; migration deletes old values |
| 3 | `storage.rules` only covered avatars | High | Rules for report photos and private evidence |
| 4 | UI advertised **PDF** evidence, but only the *file name* was saved (images were inlined as base64 in the claim document) | High | Real upload to Storage, type sniffed from file bytes, 8 MB cap, progress, cleanup on failure |
| 5 | **Gemini called from the browser** (key would be public); a score of 90+ **auto-approved claims** from the claimant's own browser | High | Key removed; server-side proxy with auth + rate limit; auto-approval removed entirely |
| 6 | Claim = client-side batch that set the item to "held" without checking its state: two users could race | High | Firestore transaction in the client **and** rules that reject reserving a non-open item |
| 7 | All reports of all universities loaded for everyone (no university filter, no query limits) | Medium | Scoped, limited queries (+ "Load more"); composite indexes |
| 8 | Report photos stored as base64 inside documents | Medium | Storage upload with compression; inline fallback kept only if Storage upload fails and the user chooses it |
| 9 | Staff deletes cascaded client-side with no record | Medium | Audit log entry for every delete / claim decision |
| 10 | Brand mandatory, no time/building/floor fields, no review step, double-click could double-post | UX | Fixed |
| 11 | Clickable cards not keyboard accessible, modals without dialog roles/focus handling | A11y | Fixed |
| 12 | Reject/cancel could leave an item reserved if the second write failed | Medium | Same transaction + rules require the release |

## New / changed features
* **Home dashboard**: greeting, big *I Lost Something* / *I Found Something*, search + filters (type, category, dates), recent reports, possible matches, active reports and claims, empty states, bell with unread count.
* **Reporting**: title, category (+custom), optional brand/colour, date + approximate time, campus location + building/floor/area, photo with preview/replace/remove/progress, private identifying detail (separate document, owner+staff only), warning when public text looks like a serial/ID/phone/e-mail, review-before-submit, duplicate-submit protection, success dialog.
* **Matching**: same engine idea, now with description similarity, optional brand (unbranded items are not penalised), time of day, building; plain-language reasons; compare view; manual browse fallback. Estimates only. Image similarity is **not** implemented.
* **Claims**: statuses Submitted -> Under review -> More proof requested -> Approved -> Returned (+ Rejected, Cancelled); visual timeline from immutable event records; claimant can cancel and answer requests for proof; staff review/approve/reject/confirm handover with notes. Legacy v22 values (`pending_verification`, `approved`, `rejected`, `returned`) stay valid.
* **Notifications** (in-app): match, claim submitted, under review, more proof, approved, rejected, returned, report status. Created only by Cloud Functions; owners can only mark read. Push/e-mail are **not** implemented.
* **Staff**: Overview metrics from real data, search + status/date/location filters, evidence viewer (token-authenticated fetch, no public link), hidden-detail viewer, audit tab, CSV export (no phone numbers, formula-injection safe).
* **Pinky**: built-in FAQ + "where is my claim" (own data only) work offline; AI answers are labelled *AI suggestion - not verified*; loading/error states; quick-reply chips.
* **Branding**: local logo files first (`public/logos/`), existing providers as fallback, monogram last. Nothing invented.
* **Responsive/accessibility**: dialogs with `role`, focus trap, Esc; keyboard-operable cards; focus rings; keyboard-safe scrolling for fields; offline banner; reduced-motion respected (unchanged v22 rule); bottom padding for the Pinky button.

## Compatibility
Old documents remain readable. Statuses are unchanged. Reports without `scope` are invisible to the scoped feed until the migration runs (owners still see their own).
Legacy claim attachments (`fileImg` base64) still display to staff. v22 PDF attachments cannot be recovered because the contents were never uploaded.

## Deliberately not changed
Design/theme/animations, university list and themes, location lists, colours list (Red/Blue/Green/Yellow/Transparent), Karma stats, manual (extended, not rewritten), account creation/login flow, version tag.
