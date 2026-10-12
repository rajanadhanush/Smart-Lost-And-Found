> v23-spark: Cloud Functions and Cloud Storage were removed (both need Blaze). Where this file mentions them, `docs/CHANGES_v23_to_v23-spark.md` has the current design.

# Implementation notes for maintainers
* **Data model**: `reports` (no phone; `scope`, `title`, `time`, `building`, `floor`, `area`, `photoURL`/`photoPath`, legacy `photo`), `reportPrivate/{reportId}`, `claims` (+`events` subcollection), `claimEvidence` (private proof files), `auditLogs`. (v23-spark: no `notifications` or `rateLimits`.)
* **Scope** = `university|campus` lower-cased (or `others:<name>`), copied from the profile; rules compare it to the caller's profile.
* **Where state transitions are enforced**: `firestore.rules` (`staffClaimUpdate`, `ownerClaimUpdate`, report reserve/release rules). The same table lives in the client (`ALLOWED`) for UX; `tests/unit.test.js` checks they agree. Functions react to changes (notifications) but are not required for correctness.
* **Why not Cloud Functions for transitions?** They would force the Blaze plan for core claim handling. Rules + transactions give the same guarantees on the free plan; the trade-off is that rules cannot run loops or write data, so contact release is staff-written, and per-file validation of evidence is limited to path/size/type.
* **Private evidence**: never `getDownloadURL`. Viewed via `fetch(.../o/<path>?alt=media)` with the user's ID token; Storage rules (which read Firestore for staff status) decide.
* **Public report photos** do use download URLs (found photos are intentionally visible to all signed-in users in the feed); the object itself is protected by Storage rules.
* Matching code is duplicated between `index.html` and `functions/lib/matching.js` on purpose (single-file app); the unit test fails if they drift.
