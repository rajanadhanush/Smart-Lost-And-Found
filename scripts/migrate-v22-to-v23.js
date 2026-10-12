// v22 -> v23 data migration. DRY RUN by default; pass --apply to write.  BACK UP FIRST (see docs/ROLLBACK.md).
// What it does (never deletes documents):
//  1. users:   adds `scope` (university|campus key) where missing.
//  2. reports: adds `scope`, `university`, `campus` from the owner's profile; REMOVES the public `phone` field (privacy fix).
//  3. claims:  adds `scope` from the found report; adds `updatedAt`; sets `heldClaimId` on the reserved found report of every open/approved claim
//              so that cancelling/rejecting can release it; maps the v22 'pending' status to 'pending_verification'.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrate-v22-to-v23.js [--apply]
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore(), APPLY = process.argv.includes('--apply');
const k = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const scopeOf = u => !u.university ? '' : u.university === 'Others' ? 'others:' + k(u.universityName) : k(u.university) + (u.campus ? '|' + k(u.campus) : '');
const stats = { users: 0, reports: 0, phones: 0, claims: 0, held: 0, skipped: [] };
async function flush(b, n) { if (n && APPLY) await b.commit(); }
(async () => {
  console.log(APPLY ? 'APPLYING changes' : 'DRY RUN (no writes). Re-run with --apply to write.');
  const users = {}; let b = db.batch(), n = 0;
  const bump = async () => { if (++n >= 400) { await flush(b, n); b = db.batch(); n = 0; } };
  for (const d of (await db.collection('users').get()).docs) {
    const u = d.data(); users[d.id] = u; const sc = scopeOf(u);
    if (!u.scope && sc) { stats.users++; b.update(d.ref, { scope: sc }); users[d.id].scope = sc; await bump(); }
    else if (!u.scope) stats.skipped.push('user ' + d.id + ' has no university');
  }
  const reports = {};
  for (const d of (await db.collection('reports').get()).docs) {
    const r = d.data(), up = {}; reports[d.id] = r;
    const o = users[r.uid] || {};
    if (!r.scope) { if (o.scope) { up.scope = o.scope; up.university = o.university === 'Others' ? (o.universityName || 'Others') : o.university; up.campus = o.campus || ''; } else stats.skipped.push('report ' + d.id + ' (owner has no scope)'); }
    if ('phone' in r) { up.phone = admin.firestore.FieldValue.delete(); stats.phones++; }
    if (Object.keys(up).length) { stats.reports++; b.update(d.ref, up); if (up.scope) reports[d.id] = { ...r, scope: up.scope }; await bump(); }
  }
  for (const d of (await db.collection('claims').get()).docs) {
    const c = d.data(), up = {}, f = reports[c.foundId];
    if (!c.scope && f && f.scope) up.scope = f.scope;
    if (!c.updatedAt) up.updatedAt = c.createdAt || admin.firestore.FieldValue.serverTimestamp();
    if (c.status === 'pending') up.status = 'pending_verification';
    if (['pending', 'pending_verification', 'under_review', 'more_info', 'approved'].includes(c.status) && f && f.status === 'held' && !f.heldClaimId) {
      if (APPLY) await db.doc('reports/' + c.foundId).update({ heldClaimId: d.id }); reports[c.foundId] = { ...f, heldClaimId: d.id }; stats.held++;
    }
    if (Object.keys(up).length) { stats.claims++; b.update(d.ref, up); await bump(); }
  }
  await flush(b, n);
  console.log(JSON.stringify(stats, null, 2));
  console.log('Note: v22 claims stored only the NAME of an attached PDF, never its contents; that cannot be recovered.');
})().catch(e => { console.error(e); process.exit(1); });
