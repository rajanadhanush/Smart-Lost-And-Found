# Backup and rollback

## Before upgrading
1. **Firestore export** (needs Blaze + a bucket): `gcloud firestore export gs://<your-bucket>/backup-v22-$(date +%F)`
   Free alternative: Firebase console > Firestore > per-collection export is not available, so run
   `node -e` with the admin SDK to dump `users`, `reports`, `claims` to JSON, or take a scheduled backup on Blaze.
2. **Copy the current rules**: console > Firestore > Rules and Storage > Rules > copy text into `backup-rules-v22/`.
3. **Keep the v22 ZIP.** Hosting also keeps previous releases (console > Hosting > Release history > Rollback).

## Rolling back
1. Hosting: console > Hosting > Release history > the v22 release > Rollback. Or redeploy the v22 ZIP: `firebase deploy --only hosting`.
2. Rules: paste the saved v22 rules back (or deploy a saved file). **Do this together with step 1**: v22 cannot work with v23's rules
   (v22 writes `phone` on reports, stores photos in documents, and updates claims directly; v22 also has no `updatedAt` on report status writes, which v23-spark rules require).
3. (v23-spark has no functions to remove.)
4. Data: the migration only **adds** fields (`scope`, `university`, `campus`, `updatedAt`, `heldClaimId`) and **removes** `phone` from reports.
   v22 ignores the added fields. The removed phone numbers are the only change you cannot undo without the export; v22 reads finder contact
   from the user profile when a claim is approved, so contact sharing keeps working. Restore from your export if you need them back.
   New v23 data (`notifications`, `auditLogs`, `reportPrivate`, `claims/*/events`, `rateLimits`) is ignored by v22 and can be left in place.
