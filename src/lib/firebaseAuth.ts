import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import type { FirebaseUserProfileDoc, UserRole } from '../types';

export const BOOTSTRAPPED_OWNER_EMAIL = 'tranchanhtrung@gmail.com';

export async function signInWithFirebaseGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: FirebaseUser; verificationSent: boolean }> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  let verificationSent = false;
  try {
    await sendEmailVerification(cred.user);
    verificationSent = true;
  } catch {
    verificationSent = false;
  }
  return { user: cred.user, verificationSent };
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No signed-in user to verify.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeFirebaseAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Resolves the signed-in Firebase user's trusted role from /admins/{uid} and /userProfiles/{uid}.
 * Never self-assigns elevated roles; new accounts strictly default to 'learner' unless listed in /admins or bootstrapped owner.
 */
export async function resolveAuthenticatedUserProfile(
  fbUser: FirebaseUser
): Promise<FirebaseUserProfileDoc | null> {
  if (!fbUser || !fbUser.emailVerified) {
    return null;
  }

  let adminRole: UserRole | null = null;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', fbUser.uid));
    if (adminSnap.exists()) {
      const r = adminSnap.data()?.role;
      if (r === 'super_admin' || r === 'lnd_manager') {
        adminRole = r;
      }
    }
  } catch (error) {
    // Non-admins may not have list/read on admins other than self, handle cleanly
    console.warn('Admin lookup note:', error instanceof Error ? error.message : String(error));
  }

  const isBootstrappedOwner =
    fbUser.email?.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL && fbUser.emailVerified;

  const profileRef = doc(db, 'userProfiles', fbUser.uid);
  try {
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data() as FirebaseUserProfileDoc;
      return {
        ...data,
        uid: fbUser.uid,
        email: fbUser.email || data.email || '',
        emailVerified: fbUser.emailVerified,
        isAdmin: Boolean(adminRole || isBootstrappedOwner),
        role: isBootstrappedOwner ? 'super_admin' : adminRole || data.role || 'learner',
      };
    }

    // Create default 'learner' profile on first verified login (users cannot self-assign elevated roles)
    const now = new Date().toISOString();
    const initialRole: UserRole = isBootstrappedOwner ? 'super_admin' : adminRole || 'learner';
    const newProfile: FirebaseUserProfileDoc = {
      uid: fbUser.uid,
      employeeId: `emp_${fbUser.uid.slice(0, 12)}`,
      email: fbUser.email || '',
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Academy Member',
      role: isBootstrappedOwner || adminRole ? initialRole : 'learner',
      position: isBootstrappedOwner ? 'System Owner & Super Administrator' : 'Hospitality Finance Professional',
      department: 'Finance & Accounting',
      property: 'FC Learning Academy',
      updatedAt: now,
    };

    try {
      await setDoc(profileRef, {
        uid: newProfile.uid,
        employeeId: newProfile.employeeId,
        name: newProfile.name,
        role: 'learner', // Rules enforce learner on self-create; owner/admin can promote below
        position: newProfile.position,
        department: newProfile.department,
        property: newProfile.property,
        updatedAt: now,
      });
    } catch (writeErr) {
      handleFirestoreError(writeErr, OperationType.CREATE, `userProfiles/${fbUser.uid}`);
    }

    return {
      ...newProfile,
      role: initialRole,
      isAdmin: Boolean(adminRole || isBootstrappedOwner),
      emailVerified: fbUser.emailVerified,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `userProfiles/${fbUser.uid}`);
  }
}

/**
 * Grants Super Admin or L&D Manager privileges inside /admins/{uid} (only callable by bootstrapped owner or existing admin).
 */
export async function grantAdminRegistryEntry(params: {
  targetUid: string;
  targetEmail: string;
  role: 'super_admin' | 'lnd_manager';
}): Promise<void> {
  const now = new Date().toISOString();
  const path = `admins/${params.targetUid}`;
  try {
    await setDoc(doc(db, 'admins', params.targetUid), {
      uid: params.targetUid.trim(),
      email: params.targetEmail.trim(),
      role: params.role,
      grantedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
