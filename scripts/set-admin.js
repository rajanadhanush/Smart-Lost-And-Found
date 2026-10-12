// Grants staff access: sets role='admin' on /users/{uid} and the custom claim admin=true.
// Usage (from the scripts/ folder after `npm install`):  GOOGLE_APPLICATION_CREDENTIALS=... node set-admin.js <uid> [--remove]
// You do NOT need this script: you can also set role = "admin" by hand in Firebase console > Firestore > users > <uid>.
// (Find the uid in Firebase console > Authentication.) The user must sign out and in again for the claim to refresh.
const admin = require('firebase-admin');
admin.initializeApp();
(async () => {
  const uid = process.argv[2], remove = process.argv.includes('--remove');
  if (!uid) { console.error('Usage: node scripts/set-admin.js <uid> [--remove]'); process.exit(1); }
  await admin.firestore().doc('users/' + uid).set({ role: remove ? 'student' : 'admin' }, { merge: true });
  await admin.auth().setCustomUserClaims(uid, remove ? { admin: false } : { admin: true });
  console.log((remove ? 'Removed staff role from ' : 'Granted staff role to ') + uid);
})().catch(e => { console.error(e.message); process.exit(1); });
