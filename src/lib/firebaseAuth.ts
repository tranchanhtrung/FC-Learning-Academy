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

export interface RegisterMetadata {
  displayName: string;
  position?: string;
  department?: string;
  property?: string;
  requestedRole?: UserRole;
}

const PENDING_REG_KEY_PREFIX = 'fc_pending_reg_';

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
  metadataOrName: string | RegisterMetadata
): Promise<{ user: FirebaseUser; verificationSent: boolean }> {
  const meta: RegisterMetadata =
    typeof metadataOrName === 'string' ? { displayName: metadataOrName } : metadataOrName;
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (meta.displayName.trim()) {
    await updateProfile(cred.user, { displayName: meta.displayName.trim() });
  }
  try {
    localStorage.setItem(
      `${PENDING_REG_KEY_PREFIX}${cred.user.uid}`,
      JSON.stringify({
        displayName: meta.displayName.trim(),
        position: meta.position?.trim() || 'Hospitality Finance Professional',
        department: meta.department?.trim() || 'Finance & Accounting',
        property: meta.property?.trim() || 'FC Learning Academy',
        requestedRole: meta.requestedRole || 'learner',
      })
    );
  } catch {
    // ignore localStorage failure
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

function readAndClearPendingReg(uid: string): Partial<RegisterMetadata> | null {
  try {
    const raw = localStorage.getItem(`${PENDING_REG_KEY_PREFIX}${uid}`);
    if (!raw) return null;
    localStorage.removeItem(`${PENDING_REG_KEY_PREFIX}${uid}`);
    return JSON.parse(raw) as Partial<RegisterMetadata>;
  } catch {
    return null;
  }
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
  let adminDocExists = false;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', fbUser.uid));
    if (adminSnap.exists()) {
      adminDocExists = true;
      const r = adminSnap.data()?.role;
      if (r === 'super_admin' || r === 'lnd_manager') {
        adminRole = r;
      }
    }
  } catch (error) {
    console.warn('Admin lookup note:', error instanceof Error ? error.message : String(error));
  }

  const isBootstrappedOwner =
    fbUser.email?.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL && fbUser.emailVerified;

  if (isBootstrappedOwner && !adminDocExists) {
    try {
      await setDoc(doc(db, 'admins', fbUser.uid), {
        uid: fbUser.uid,
        email: fbUser.email || BOOTSTRAPPED_OWNER_EMAIL,
        role: 'super_admin',
        grantedAt: new Date().toISOString(),
      });
    } catch {
      // non-blocking
    }
  }

  const profileRef = doc(db, 'userProfiles', fbUser.uid);
  const now = new Date().toISOString();
  try {
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data() as FirebaseUserProfileDoc;
      const effectiveRole: UserRole = isBootstrappedOwner
        ? 'super_admin'
        : adminRole || data.role || 'learner';
      const resolvedEmail = fbUser.email || data.email || '';
      const resolvedAvatar =
        data.avatar ||
        fbUser.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || fbUser.displayName || 'FC')}&background=0A192F&color=D4AF37`;

      // Sync email / role / avatar back to /userProfiles if newly added or promoted
      if (!data.email || data.role !== effectiveRole || !data.avatar) {
        const patch: Record<string, any> = {
          uid: fbUser.uid,
          employeeId: data.employeeId || `emp_${fbUser.uid.slice(0, 12)}`,
          name: data.name || fbUser.displayName || resolvedEmail.split('@')[0] || 'Academy Member',
          email: resolvedEmail,
          role: effectiveRole,
          avatar: resolvedAvatar,
          updatedAt: now,
        };
        await setDoc(profileRef, patch, { merge: true }).catch(() => {});
      }

      return {
        ...data,
        uid: fbUser.uid,
        email: resolvedEmail,
        avatar: resolvedAvatar,
        emailVerified: fbUser.emailVerified,
        isAdmin: Boolean(adminRole || isBootstrappedOwner),
        role: effectiveRole,
      };
    }

    const pending = readAndClearPendingReg(fbUser.uid);
    const initialRole: UserRole = isBootstrappedOwner ? 'super_admin' : adminRole || 'learner';
    const resolvedName =
      pending?.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Academy Member';
    const resolvedAvatar =
      fbUser.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=0A192F&color=D4AF37`;

    const newProfile: FirebaseUserProfileDoc = {
      uid: fbUser.uid,
      employeeId: `emp_${fbUser.uid.slice(0, 12)}`,
      email: fbUser.email || '',
      name: resolvedName,
      role: isBootstrappedOwner || adminRole ? initialRole : 'learner',
      ...(pending?.requestedRole && pending.requestedRole !== 'learner'
        ? { requestedRole: pending.requestedRole }
        : {}),
      position:
        pending?.position ||
        (isBootstrappedOwner ? 'System Owner & Super Administrator' : 'Hospitality Finance Professional'),
      department: pending?.department || 'Finance & Accounting',
      property: pending?.property || 'FC Learning Academy',
      avatar: resolvedAvatar,
      currentLevel: initialRole === 'super_admin' || initialRole === 'lnd_manager' ? 4 : 2,
      targetLevel: 4,
      joinedDate: now.split('T')[0],
      updatedAt: now,
    };

    try {
      const firestorePayload: Record<string, any> = {
        uid: newProfile.uid,
        employeeId: newProfile.employeeId,
        name: newProfile.name,
        email: newProfile.email,
        role: isBootstrappedOwner || adminRole ? initialRole : 'learner',
        position: newProfile.position,
        department: newProfile.department,
        property: newProfile.property,
        avatar: newProfile.avatar,
        currentLevel: newProfile.currentLevel,
        targetLevel: newProfile.targetLevel,
        joinedDate: newProfile.joinedDate,
        updatedAt: now,
      };
      if (newProfile.requestedRole) {
        firestorePayload.requestedRole = newProfile.requestedRole;
      }
      await setDoc(profileRef, firestorePayload);
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
