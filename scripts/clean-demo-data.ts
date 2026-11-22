/**
 * Production Cleanup Utility — Strips all 10 demo seed users and their synthetic
 * enrollments, assessments, OJT submissions, IDPs, and certificates from local storage
 * while preserving real registered accounts and all USALI master curriculum data.
 *
 * Usage:
 *   npm run prod:clean-demo -- --confirm
 */
import fs from 'fs';
import path from 'path';
import { writeJsonAtomic } from '../server/persistence.ts';

const DEMO_USER_IDS = new Set([
  'user_admin',
  'user_lnd',
  'user_fc1',
  'user_fc2',
  'user_gm',
  'user_learner1',
  'user_learner2',
  'user_learner3',
  'user_learner4',
  'user_learner5',
  'user_learner6',
]);

const DEMO_EMAIL_DOMAIN = '@fclearning.com';

async function main() {
  const confirmed = process.argv.includes('--confirm');
  const dataDir = path.join(process.cwd(), '.data');
  const dbPath = path.join(dataDir, 'academy-db.json');
  const authPath = path.join(dataDir, 'auth-accounts.json');

  console.log('=== FC Learning Academy — Production Demo Data Cleanup ===');
  if (!confirmed) {
    console.log('DRY RUN MODE (no files modified). Pass "--confirm" to execute cleanup:');
    console.log('  npm run prod:clean-demo -- --confirm\n');
  }

  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const beforeUsers = Array.isArray(db.users) ? db.users.length : 0;
    const isDemoUser = (u: any) =>
      DEMO_USER_IDS.has(String(u?.id || '')) ||
      String(u?.email || '').toLowerCase().endsWith(DEMO_EMAIL_DOMAIN);

    const demoIdsFound = new Set(
      (db.users || []).filter(isDemoUser).map((u: any) => String(u.id))
    );
    DEMO_USER_IDS.forEach((id) => demoIdsFound.add(id));

    const cleanUsers = (db.users || []).filter((u: any) => !isDemoUser(u));
    const cleanEnrollments = (db.enrollments || []).filter((e: any) => !demoIdsFound.has(e.userId));
    const cleanQuizzes = (db.quizAttempts || []).filter((q: any) => !demoIdsFound.has(q.userId));
    const cleanSubs = (db.submissions || []).filter((s: any) => !demoIdsFound.has(s.userId));
    const cleanAsmts = (db.assessments || []).filter((a: any) => !demoIdsFound.has(a.learnerId));
    const cleanIdps = (db.idps || []).filter((i: any) => !demoIdsFound.has(i.learnerId));
    const cleanCerts = (db.certificates || []).filter((c: any) => !demoIdsFound.has(c.userId));
    const cleanTalentAsmts = (db.competencyAssessments || []).filter((a: any) => !demoIdsFound.has(a.employeeId));
    const cleanTalentIdps = (db.talentIdps || []).filter((i: any) => !demoIdsFound.has(i.employeeId));
    const cleanTalentActs = (db.developmentActivities || []).filter((a: any) => !demoIdsFound.has(a.employeeId));
    const cleanReasmts = (db.competencyReassessments || []).filter((r: any) => !demoIdsFound.has(r.employeeId));
    const cleanReadiness = (db.careerReadinessReviews || []).filter((r: any) => !demoIdsFound.has(r.employeeId));

    console.log(`academy-db.json:`);
    console.log(`  Users: ${beforeUsers} -> ${cleanUsers.length} (removing ${beforeUsers - cleanUsers.length} demo accounts)`);
    console.log(`  Enrollments: ${(db.enrollments || []).length} -> ${cleanEnrollments.length}`);
    console.log(`  Assessments: ${(db.assessments || []).length} -> ${cleanAsmts.length}`);
    console.log(`  OJT Submissions: ${(db.submissions || []).length} -> ${cleanSubs.length}`);
    console.log(`  Certificates: ${(db.certificates || []).length} -> ${cleanCerts.length}`);

    if (confirmed) {
      writeJsonAtomic(dbPath, {
        ...db,
        users: cleanUsers,
        enrollments: cleanEnrollments,
        quizAttempts: cleanQuizzes,
        submissions: cleanSubs,
        assessments: cleanAsmts,
        idps: cleanIdps,
        certificates: cleanCerts,
        competencyAssessments: cleanTalentAsmts,
        talentIdps: cleanTalentIdps,
        developmentActivities: cleanTalentActs,
        competencyReassessments: cleanReasmts,
        careerReadinessReviews: cleanReadiness,
        auditLogs: [],
      });
      console.log('  -> Cleaned academy-db.json successfully.');
    }
  } else {
    console.log('No local .data/academy-db.json found.');
  }

  if (fs.existsSync(authPath)) {
    const authStore = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const accounts = authStore.accounts || {};
    const kept: Record<string, any> = {};
    let removed = 0;
    for (const [email, rec] of Object.entries<any>(accounts)) {
      if (DEMO_USER_IDS.has(String(rec?.userId || '')) || email.endsWith(DEMO_EMAIL_DOMAIN)) {
        removed++;
      } else {
        kept[email] = rec;
      }
    }
    console.log(`auth-accounts.json: removing ${removed} demo credentials, keeping ${Object.keys(kept).length} real accounts.`);
    if (confirmed) {
      writeJsonAtomic(authPath, { ...authStore, accounts: kept });
      console.log('  -> Cleaned auth-accounts.json successfully.');
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
