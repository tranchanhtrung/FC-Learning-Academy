import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { INITIAL_USERS } from '../../data/initialData';
import {
  auth,
  firebaseConfigSummary,
  signInWithFirebaseGoogle,
  signInWithEmail,
  registerWithEmail,
  sendPasswordReset,
  resendVerificationEmail,
  grantAdminRegistryEntry,
  testFirestoreReadWrite,
  listAdminRegistryEntries,
} from '../../lib/firebase';
import type { UserRole } from '../../types';
import {
  X,
  ShieldCheck,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  UserCog,
  ExternalLink,
  Database,
  Users,
  Eye,
  EyeOff,
  Server,
  Cloud,
  Sparkles,
  MailCheck,
} from 'lucide-react';

interface FirebaseAuthModalProps {
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'reset';
}

interface DemoAccountInfo {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  position: string;
}

const HOTEL_PROPERTIES = [
  'Grand Horizon Saigon Hotel & Residences',
  'Royal Palm Resort & Spa Danang',
  'Marina Bay Heritage Hotel Hanoi',
  'Emerald Bay Luxury Suites Nha Trang',
  'Corporate Office – Singapore / Bangkok',
  'FC Learning Academy',
];

const GoogleLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3.01h3.87c2.26-2.08 3.56-5.15 3.56-8.66z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3.01c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.28A7.22 7.22 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4-3.1z"
    />
    <path
      fill="#EA4335"
      d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4 3.1c.95-2.84 3.6-4.95 6.72-4.95z"
    />
  </svg>
);

function formatFirebaseErrorVi(err: any, isVi: boolean): string {
  const code = String(err?.code || err?.message || '');
  if (code.includes('unauthorized-domain')) {
    return isVi
      ? `Tên miền "${window.location.hostname}" chưa được cấp phép trong Firebase Console (Authentication → Settings → Authorized domains). Hãy thêm "${window.location.hostname}" vào danh sách tên miền cho phép trên Firebase Console.`
      : `Domain "${window.location.hostname}" is not allowlisted in Firebase Console (Authentication → Settings → Authorized domains).`;
  }
  if (code.includes('popup-blocked')) {
    return isVi
      ? 'Trình duyệt đang chặn cửa sổ bật lên (Pop-up) của Google. Vui lòng cho phép pop-up cho trang này rồi thử lại.'
      : 'Browser blocked the Google sign-in pop-up. Please allow pop-ups and retry.';
  }
  if (code.includes('popup-closed-by-user')) {
    return isVi ? 'Bạn đã đóng cửa sổ đăng nhập Google.' : 'Google sign-in popup was closed.';
  }
  if (code.includes('invalid-credential') || code.includes('wrong-password')) {
    return isVi
      ? 'Email hoặc mật khẩu không chính xác. Nếu bạn từng tạo tài khoản bằng Google, hãy bấm nút "Tiếp tục nhanh với Google" ở phía trên.'
      : 'Incorrect email or password. If you signed up with Google, please use "Continue with Google" above.';
  }
  if (code.includes('user-not-found')) {
    return isVi
      ? 'Không tìm thấy tài khoản với email này. Hãy chuyển sang tab "Đăng Ký Mới" hoặc đăng nhập nhanh bằng Google.'
      : 'No account found for this email. Switch to "Register" or sign in with Google.';
  }
  if (code.includes('email-already-in-use')) {
    return isVi
      ? 'Email này đã được đăng ký trước đó. Vui lòng chuyển sang tab "Đăng Nhập" hoặc dùng "Quên Mật Khẩu".'
      : 'This email is already registered. Please sign in or reset your password.';
  }
  if (code.includes('weak-password')) {
    return isVi
      ? 'Mật khẩu quá yếu. Vui lòng nhập tối thiểu 6 ký tự (khuyến nghị từ 8 ký tự gồm chữ và số).'
      : 'Password is too weak. Please enter at least 6 characters.';
  }
  if (code.includes('too-many-requests')) {
    return isVi
      ? 'Bạn đã thao tác quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.'
      : 'Too many attempts. Please wait a few minutes and try again.';
  }
  return err?.message || (isVi ? 'Thao tác xác thực thất bại.' : 'Authentication failed.');
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({
  onClose,
  initialTab = 'login',
}) => {
  const {
    language,
    t,
    serverAuthUser,
    loginWithServerAccount,
    registerWithServerAccount,
    changeServerPassword,
    requestServerPasswordReset,
    confirmServerPasswordReset,
    firebaseUser,
    firebaseProfile,
    dataSourceMode,
    setDataSourceMode,
    refreshFromFirestore,
    signOutOfficialAccount,
    syncAllExperienceRolesToFirestore,
    purgeDemoUsersInFirestore,
    systemConfig,
    showToast,
    hasPermission,
  } = useApp();
  const isVi = language === 'vi';
  const canSeeSystemDiagnostics =
    Boolean(firebaseProfile?.isAdmin) || hasPermission('view_administration');

  // Show local Express auth tab ONLY when backed by persistent Postgres or local Demo mode (never trap Vercel /tmp users!)
  const allowInternalServerAuth =
    systemConfig.databaseDriver === 'postgresql' ||
    systemConfig.demoModeEnabled ||
    Boolean(serverAuthUser && !firebaseUser);

  // Firebase Cloud Auth (Google + Email/Password) is ALWAYS the primary persistent engine on Vercel!
  const [providerMode, setProviderMode] = useState<'firebase' | 'academy'>(() =>
    serverAuthUser && !firebaseUser && allowInternalServerAuth ? 'academy' : 'firebase'
  );
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'reset'>(initialTab);

  // Common form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [position, setPosition] = useState('Senior Accountant');
  const [property, setProperty] = useState(HOTEL_PROPERTIES[0]);
  const [requestedRole, setRequestedRole] = useState<UserRole>('learner');

  // Password reset & change password state (Optional Server Auth)
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCode, setResetCode] = useState('');
  const [devResetPreviewCode, setDevResetPreviewCode] = useState<string | null>(null);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Demo quick-fill accounts (only when server DEMO_MODE is active)
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountInfo[]>([]);
  const [demoPasswordHint, setDemoPasswordHint] = useState<string>('');
  const [showDemoQuickFill, setShowDemoQuickFill] = useState(false);

  const [busy, setBusy] = useState(false);
  const [seedingRoles, setSeedingRoles] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Firebase Admin promotion & probe state
  const [grantUid, setGrantUid] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantRole, setGrantRole] = useState<'super_admin' | 'lnd_manager'>('lnd_manager');
  const [adminEntries, setAdminEntries] = useState<
    Array<{ uid: string; email: string; role: string; grantedAt: string }>
  >([]);
  const [probeBusy, setProbeBusy] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    readOk: boolean;
    writeOk: boolean;
    message: string;
    checkedAt: string;
    counts: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    setAuthTab(initialTab);
    setErrorMsg(null);
    setInfoMsg(null);
    setResetStep('request');
    setDevResetPreviewCode(null);
  }, [initialTab]);

  // Close modal on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Fetch demo quick-fill accounts (non-production)
  useEffect(() => {
    if (!allowInternalServerAuth) return;
    fetch('/api/auth/demo-accounts')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.enabled && Array.isArray(data.accounts)) {
          setDemoAccounts(data.accounts);
          setDemoPasswordHint(data.defaultPasswordHint || '');
        }
      })
      .catch(() => {});
  }, [allowInternalServerAuth]);

  const runReadWriteCheck = async () => {
    setProbeBusy(true);
    try {
      const res = await testFirestoreReadWrite(Boolean(firebaseProfile?.isAdmin));
      setProbeResult(res);
      if (firebaseProfile?.isAdmin) {
        const list = await listAdminRegistryEntries().catch(() => []);
        setAdminEntries(list);
      }
    } finally {
      setProbeBusy(false);
    }
  };

  useEffect(() => {
    if (providerMode === 'firebase' && firebaseUser?.emailVerified && canSeeSystemDiagnostics) {
      runReadWriteCheck();
    } else {
      setProbeResult(null);
      setAdminEntries([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerMode, firebaseUser?.uid, firebaseUser?.emailVerified, firebaseProfile?.isAdmin, canSeeSystemDiagnostics]);

  const passwordScore = (() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Za-z]/.test(password) && /\d/.test(password)) score++;
    if (/[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  // =========================================================================
  // PRIMARY CLOUD AUTH HANDLERS (Google OAuth + Permanent Firebase Email Auth)
  // =========================================================================
  const activateOfficialMode = async (emailLabel?: string | null) => {
    setDataSourceMode('firestore');
    await refreshFromFirestore('firestore');
    showToast(
      isVi
        ? `Đăng nhập thành công${emailLabel ? `: ${emailLabel}` : ''} (Dữ liệu Cloud vĩnh viễn)`
        : `Signed in${emailLabel ? `: ${emailLabel}` : ''} (Cloud Firestore Live)`,
      'success'
    );
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const user = await signInWithFirebaseGoogle();
      if (user.emailVerified) {
        await activateOfficialMode(user.email);
        onClose();
      } else {
        showToast(
          isVi ? `Đã đăng nhập Google: ${user.email}` : `Signed in with Google: ${user.email}`,
          'info'
        );
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setBusy(false);
    }
  };

  const handleFirebaseEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const user = await signInWithEmail(email, password);
      if (!user.emailVerified) {
        setInfoMsg(
          isVi
            ? 'Tài khoản của bạn đã đăng nhập nhưng email chưa được xác minh. Vui lòng mở hộp thư (kiểm tra cả mục Spam) nhấn liên kết xác minh, sau đó bấm "Tôi đã xác minh — Kích hoạt ngay".'
            : 'Signed in, but your email is not verified yet. Check your inbox and click "I Verified — Activate Now".'
        );
      } else {
        await activateOfficialMode(user.email);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setBusy(false);
    }
  };

  const handleFirebaseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (displayName.trim().length < 2) {
      setErrorMsg(isVi ? 'Vui lòng nhập họ và tên hợp lệ (tối thiểu 2 ký tự).' : 'Enter your full name (min 2 chars).');
      return;
    }
    if (password.length < 6) {
      setErrorMsg(isVi ? 'Mật khẩu phải có tối thiểu 6 ký tự (khuyến nghị ≥ 8 ký tự).' : 'Password must be at least 6 characters.');
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      setErrorMsg(isVi ? 'Mật khẩu xác nhận không khớp.' : 'Password confirmation does not match.');
      return;
    }
    setBusy(true);
    try {
      const { user, verificationSent } = await registerWithEmail(email, password, {
        displayName,
        position: position.trim() || 'Hospitality Finance Professional',
        department: 'Finance & Accounting',
        property,
        requestedRole,
      });
      setInfoMsg(
        verificationSent
          ? isVi
            ? `Tài khoản ${user.email} đã được lưu vĩnh viễn trên hệ thống Cloud! Vui lòng mở hộp thư (kiểm tra cả thư rác/Spam) bấm liên kết xác minh rồi nhấn nút "Tôi đã xác minh — Kích hoạt ngay".`
            : `Account ${user.email} permanently created on Cloud! Check your inbox for the verification link then click "I Verified — Activate Now".`
          : isVi
          ? `Đã tạo tài khoản ${user.email}. Vui lòng nhấn "Gửi lại email xác minh".`
          : `Created account ${user.email}. Please click "Resend Verification".`
      );
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setBusy(false);
    }
  };

  const handleFirebaseReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await sendPasswordReset(email);
      setInfoMsg(
        isVi
          ? `Đã gửi liên kết đặt lại mật khẩu tới ${email}. Vui lòng kiểm tra hộp thư (kể cả mục Spam).`
          : `Password reset email sent to ${email}. Please check your inbox (and Spam folder).`
      );
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setBusy(false);
    }
  };

  const handleResendVerification = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await resendVerificationEmail();
      setInfoMsg(
        isVi
          ? 'Đã gửi lại email xác minh. Vui lòng kiểm tra Hộp thư đến hoặc mục Spam/Quảng cáo.'
          : 'Verification email re-sent. Please check your inbox or Spam folder.'
      );
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setBusy(false);
    }
  };

  const handleReloadFirebaseUser = async () => {
    if (!auth.currentUser) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      if (auth.currentUser.emailVerified) {
        await activateOfficialMode(auth.currentUser.email);
        onClose();
      } else {
        setInfoMsg(
          isVi
            ? 'Email vẫn chưa được xác minh. Hãy mở link xác minh trong hộp thư trước rồi bấm nút này lại.'
            : 'Email is still pending verification. Click the link in your email first.'
        );
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setBusy(false);
    }
  };

  // =========================================================================
  // OPTIONAL INTERNAL SERVER AUTH HANDLERS (Local Dev / PostgreSQL Mode Only)
  // =========================================================================
  const handleServerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await loginWithServerAccount(email.trim(), password);
      if (!res.ok) {
        setErrorMsg(res.error || (isVi ? 'Đăng nhập thất bại.' : 'Sign in failed.'));
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleServerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (displayName.trim().length < 2) {
      setErrorMsg(isVi ? 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự).' : 'Enter your full name (min 2 chars).');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setErrorMsg(
        isVi
          ? 'Mật khẩu phải từ 8 ký tự trở lên và gồm cả chữ cái lẫn chữ số.'
          : 'Password must be at least 8 characters and include both letters and numbers.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(isVi ? 'Mật khẩu xác nhận không khớp.' : 'Password confirmation does not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await registerWithServerAccount({
        name: displayName.trim(),
        email: email.trim(),
        password,
        position: position.trim(),
        department: 'Finance & Accounting',
        property,
        requestedRole,
      });
      if (!res.ok) {
        setErrorMsg(res.error || (isVi ? 'Đăng ký thất bại.' : 'Registration failed.'));
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleServerRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await requestServerPasswordReset(email.trim());
      if (!res.ok) {
        setErrorMsg(res.error || 'Không thể gửi yêu cầu khôi phục.');
        return;
      }
      setResetStep('confirm');
      setDevResetPreviewCode(res.devPreviewCode || null);
      setInfoMsg(res.message || 'Đã tạo mã khôi phục 6 chữ số.');
    } finally {
      setBusy(false);
    }
  };

  const handleServerConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setBusy(true);
    try {
      const res = await confirmServerPasswordReset(email.trim(), resetCode.trim(), newPasswordInput);
      if (!res.ok) {
        setErrorMsg(res.error || 'Đặt lại mật khẩu thất bại.');
        return;
      }
      setAuthTab('login');
      setResetStep('request');
      setResetCode('');
      setNewPasswordInput('');
      setDevResetPreviewCode(null);
      setInfoMsg(isVi ? 'Đặt lại mật khẩu thành công!' : 'Password updated!');
    } finally {
      setBusy(false);
    }
  };

  const handleServerChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setBusy(true);
    try {
      const res = await changeServerPassword(currentPasswordInput, newPasswordInput);
      if (!res.ok) {
        setErrorMsg(res.error || 'Đổi mật khẩu thất bại.');
        return;
      }
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setInfoMsg(isVi ? 'Đã cập nhật mật khẩu thành công!' : 'Password changed successfully!');
    } finally {
      setBusy(false);
    }
  };

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUid.trim() || !grantEmail.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await grantAdminRegistryEntry({
        targetUid: grantUid.trim(),
        targetEmail: grantEmail.trim(),
        role: grantRole,
      });
      showToast(isVi ? `Đã cấp quyền ${grantRole} cho ${grantEmail}` : `Granted ${grantRole} to ${grantEmail}`, 'success');
      setGrantUid('');
      setGrantEmail('');
      await runReadWriteCheck();
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setBusy(false);
    }
  };

  const handleSeedExperienceRoles = async (overwrite: boolean) => {
    setSeedingRoles(true);
    setErrorMsg(null);
    try {
      await syncAllExperienceRolesToFirestore(overwrite);
      await runReadWriteCheck();
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setSeedingRoles(false);
    }
  };

  const handlePurgeDemoRoles = async () => {
    setSeedingRoles(true);
    setErrorMsg(null);
    try {
      const res = await purgeDemoUsersInFirestore();
      setInfoMsg(
        isVi
          ? `Đã dọn sạch ${res.deletedProfiles} hồ sơ mẫu và ${res.deletedAdmins} bản ghi admin mẫu trên Firestore.`
          : `Purged ${res.deletedProfiles} demo profiles and ${res.deletedAdmins} demo admin records from Firestore.`
      );
      await runReadWriteCheck();
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setSeedingRoles(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto text-slate-800">
        {/* Header */}
        <div className="bg-[#0A192F] text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold tracking-wide truncate">
                {isVi ? 'Đăng Nhập & Đăng Ký Tài Khoản' : 'Account Sign In & Registration'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {providerMode === 'firebase'
                  ? isVi
                    ? `Google Cloud Auth · Lưu trữ vĩnh viễn (${firebaseConfigSummary.projectId})`
                    : `Google Cloud Auth · Permanent Cloud Storage (${firebaseConfigSummary.projectId})`
                  : isVi
                  ? 'Tài khoản Máy chủ Nội bộ (Local / PostgreSQL)'
                  : 'Internal Server Account (Local / PostgreSQL)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
            aria-label={isVi ? 'Đóng' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Provider Switcher (Only shown in Local Dev / Postgres mode; hidden on pure Vercel+Firebase so users NEVER save to ephemeral /tmp!) */}
        {allowInternalServerAuth && (
          <div className="px-5 pt-3.5 pb-2 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setProviderMode('firebase');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                  providerMode === 'firebase'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{isVi ? 'Google & Cloud Auth' : 'Google & Cloud Auth'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProviderMode('academy');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                  providerMode === 'academy'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{isVi ? 'Máy Chủ Nội Bộ (Dev)' : 'Local Server (Dev)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* PRIMARY ENGINE: PERMANENT FIREBASE CLOUD AUTH + GOOGLE 1-CLICK    */}
          {/* ================================================================= */}
          {providerMode === 'firebase' && (
            <div className="space-y-4">
              {!firebaseUser ? (
                <>
                  {/* Prominent 1-Click Google Sign-In / Sign-Up Button right at top */}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleGoogleSignIn}
                    className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-amber-400 text-slate-900 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <GoogleLogoIcon className="w-4 h-4 shrink-0" />
                    <span>
                      {authTab === 'register'
                        ? isVi
                          ? 'Đăng Ký / Đăng Nhập Nhanh Bằng Google (1 Chạm)'
                          : 'Sign Up / Sign In Quickly with Google'
                        : isVi
                        ? 'Tiếp Tục Nhanh Với Google (Khuyên Dùng)'
                        : 'Continue Quickly with Google (Recommended)'}
                    </span>
                  </button>

                  {/* Clean Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                      {isVi ? 'hoặc dùng Email & Mật khẩu' : 'or continue with Email & Password'}
                    </span>
                    <div className="border-t border-slate-200 w-full" />
                  </div>

                  {/* Sub-tabs: Login / Register / Reset */}
                  <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setErrorMsg(null);
                        setInfoMsg(null);
                      }}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${
                        authTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isVi ? 'Đăng Nhập' : 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setErrorMsg(null);
                        setInfoMsg(null);
                      }}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${
                        authTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isVi ? 'Đăng Ký Mới' : 'Register'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('reset');
                        setErrorMsg(null);
                        setInfoMsg(null);
                      }}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${
                        authTab === 'reset' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isVi ? 'Quên Mật Khẩu' : 'Reset Password'}
                    </button>
                  </div>

                  {/* LOGIN FORM */}
                  {authTab === 'login' && (
                    <form onSubmit={handleFirebaseEmailLogin} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@hotel.com"
                            className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isVi ? 'Mật khẩu' : 'Password'}
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>
                          {busy
                            ? isVi
                              ? 'Đang xác thực...'
                              : 'Signing in...'
                            : isVi
                            ? 'Đăng Nhập Tài Khoản'
                            : 'Sign In'}
                        </span>
                      </button>
                    </form>
                  )}

                  {/* REGISTER FORM (Permanent Cloud Account with Full Profile Metadata) */}
                  {authTab === 'register' && (
                    <form onSubmit={handleFirebaseRegister} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isVi ? 'Họ và tên *' : 'Full Name *'}
                          </label>
                          <input
                            type="text"
                            required
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={isVi ? 'Nguyễn Văn A' : 'Alex Nguyen'}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@hotel.com"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isVi ? 'Mật khẩu * (≥ 6 ký tự)' : 'Password * (≥ 6 chars)'}
                          </label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Ví dụ: Finance2026"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          {password.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5">
                              {[1, 2, 3].map((lvl) => (
                                <span
                                  key={lvl}
                                  className={`h-1 flex-1 rounded-full ${
                                    passwordScore >= lvl
                                      ? passwordScore === 3
                                        ? 'bg-emerald-500'
                                        : passwordScore === 2
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                      : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                              <span className="text-[10px] font-bold text-slate-500 ml-1">
                                {passwordScore === 3
                                  ? isVi
                                    ? 'Mạnh'
                                    : 'Strong'
                                  : passwordScore === 2
                                  ? isVi
                                    ? 'Đạt chuẩn'
                                    : 'Good'
                                  : isVi
                                  ? 'Yếu'
                                  : 'Weak'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isVi ? 'Xác nhận mật khẩu *' : 'Confirm Password *'}
                          </label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isVi ? 'Chức danh' : 'Job Position'}
                          </label>
                          <input
                            type="text"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isVi ? 'Khách sạn / Đơn vị' : 'Hotel Property'}
                          </label>
                          <select
                            value={property}
                            onChange={(e) => setProperty(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            {HOTEL_PROPERTIES.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isVi ? 'Vai trò đề xuất (Mặc định kích hoạt Học viên)' : 'Requested Role'}
                        </label>
                        <select
                          value={requestedRole}
                          onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="learner">{t.roles.learner}</option>
                          <option value="financial_controller">{t.roles.financial_controller}</option>
                          <option value="general_manager">{t.roles.general_manager}</option>
                          <option value="lnd_manager">{t.roles.lnd_manager}</option>
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {isVi
                            ? 'Tài khoản được lưu vĩnh viễn trên Google Cloud Firebase (không bị mất khi máy chủ khởi động lại). Admin có thể duyệt nâng vai trò ngay trong mục Quản Trị.'
                            : 'Accounts are permanently stored in Google Cloud Firebase. Admins can approve elevated roles in Administration.'}
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>
                          {busy
                            ? isVi
                              ? 'Đang tạo tài khoản Cloud...'
                              : 'Creating Cloud account...'
                            : isVi
                            ? 'Đăng Ký Tài Khoản Vĩnh Viễn'
                            : 'Create Permanent Account'}
                        </span>
                      </button>
                    </form>
                  )}

                  {/* RESET PASSWORD FORM */}
                  {authTab === 'reset' && (
                    <form onSubmit={handleFirebaseReset} className="space-y-3">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {isVi
                          ? 'Nhập địa chỉ email tài khoản để nhận liên kết đặt lại mật khẩu chính thức từ Google Firebase.'
                          : 'Enter your email address to receive an official password reset link.'}
                      </p>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@hotel.com"
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        {busy
                          ? isVi
                            ? 'Đang gửi email...'
                            : 'Sending email...'
                          : isVi
                          ? 'Gửi Liên Kết Đặt Lại Mật Khẩu'
                          : 'Send Password Reset Email'}
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {/* Pending Email Verification Friendly Screen */}
                  {!firebaseUser.emailVerified && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 text-xs">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <MailCheck className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-amber-950">
                            {isVi ? 'Bước cuối: Xác Minh Email Của Bạn' : 'Final Step: Verify Your Email'}
                          </h4>
                          <p className="text-amber-900 leading-relaxed">
                            {isVi
                              ? `Chúng tôi đã gửi liên kết xác minh tới ${firebaseUser.email}. Hãy mở hộp thư (kiểm tra cả mục Spam), nhấn vào đường dẫn xác minh rồi bấm nút xanh bên dưới.`
                              : `We sent a verification link to ${firebaseUser.email}. Click the link in your inbox (or Spam folder), then click the green button below.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={handleReloadFirebaseUser}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
                        >
                          {busy
                            ? isVi
                              ? 'Đang kiểm tra...'
                              : 'Checking...'
                            : isVi
                            ? 'Tôi Đã Xác Minh — Kích Hoạt Ngay'
                            : 'I Verified — Activate Now'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={handleResendVerification}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isVi ? 'Gửi lại email xác minh' : 'Resend Email'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Signed-in Account Card */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {firebaseProfile?.name || firebaseUser.displayName || firebaseUser.email}
                          </p>
                          {firebaseUser.emailVerified && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {isVi ? 'Đã xác minh' : 'Verified'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{firebaseUser.email}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">UID: {firebaseUser.uid}</p>
                      </div>
                      <button
                        type="button"
                        onClick={signOutOfficialAccount}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Đăng xuất' : 'Sign Out'}</span>
                      </button>
                    </div>

                    {firebaseUser.emailVerified && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                        {systemConfig.demoModeEnabled && (
                          <button
                            type="button"
                            onClick={async () => {
                              const nextMode = dataSourceMode === 'firestore' ? 'demo' : 'firestore';
                              setDataSourceMode(nextMode);
                              if (nextMode === 'firestore') await refreshFromFirestore('firestore');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0A192F] hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Database className="w-3.5 h-3.5" />
                            <span>
                              {dataSourceMode === 'firestore'
                                ? isVi
                                  ? 'Chuyển về Demo Sandbox'
                                  : 'Switch to Demo Sandbox'
                                : isVi
                                ? 'Kích hoạt Firestore Live'
                                : 'Activate Firestore Live'}
                            </span>
                          </button>
                        )}
                        {canSeeSystemDiagnostics && (
                          <button
                            type="button"
                            disabled={probeBusy}
                            onClick={runReadWriteCheck}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${probeBusy ? 'animate-spin' : ''}`} />
                            <span>{isVi ? 'Kiểm tra kết nối Cloud' : 'Test Cloud Connection'}</span>
                          </button>
                        )}
                        <a
                          href={`https://console.firebase.google.com/project/${firebaseConfigSummary.projectId}/authentication/users`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          <span>Firebase Console</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {probeResult && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <p className="font-bold text-slate-800">
                        Firestore Probe: Read {probeResult.readOk ? 'OK' : 'ERR'} · Write{' '}
                        {probeResult.writeOk ? 'OK' : 'ERR'}
                      </p>
                      <p className="text-[11px] text-slate-600">{probeResult.message}</p>
                    </div>
                  )}

                  {firebaseProfile?.isAdmin && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-rose-600" />
                          <span>
                            {isVi
                              ? 'Dọn sạch toàn bộ tài khoản mẫu (@fclearning.com) trên Firestore'
                              : 'Purge Demo Accounts (@fclearning.com) from Firestore'}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={seedingRoles}
                          onClick={handlePurgeDemoRoles}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer disabled:opacity-50"
                        >
                          {seedingRoles ? '...' : isVi ? 'Xóa sạch hồ sơ mẫu' : 'Purge Demo Users'}
                        </button>
                      </div>

                      {systemConfig.demoModeEnabled && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-amber-600" />
                            <span>{isVi ? `Đồng bộ ${INITIAL_USERS.length} hồ sơ mẫu lên Firestore` : 'Seed Experience Roles'}</span>
                          </span>
                          <button
                            type="button"
                            disabled={seedingRoles}
                            onClick={() => handleSeedExperienceRoles(false)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer disabled:opacity-50"
                          >
                            {seedingRoles ? '...' : isVi ? 'Đồng bộ ngay' : 'Sync Roles'}
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleGrantAdmin} className="pt-3 border-t border-slate-200 space-y-2">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <UserCog className="w-4 h-4 text-blue-600" />
                          <span>{isVi ? 'Cấp quyền Admin Firestore' : 'Grant Firestore Admin'}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={grantUid}
                            onChange={(e) => setGrantUid(e.target.value)}
                            placeholder="Firebase UID"
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                          <input
                            type="email"
                            value={grantEmail}
                            onChange={(e) => setGrantEmail(e.target.value)}
                            placeholder="Email"
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                          <select
                            value={grantRole}
                            onChange={(e) => setGrantRole(e.target.value as 'super_admin' | 'lnd_manager')}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="lnd_manager">L&D Manager</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={busy}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                        >
                          {isVi ? 'Cấp quyền' : 'Grant Role'}
                        </button>
                        {adminEntries.length > 0 && (
                          <div className="text-[11px] text-slate-500 pt-1">
                            Admins: {adminEntries.map((a) => `${a.email} (${a.role})`).join(', ')}
                          </div>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SECONDARY MODE: LOCAL / POSTGRES INTERNAL SERVER AUTH             */}
          {/* ================================================================= */}
          {providerMode === 'academy' && allowInternalServerAuth && (
            <>
              {serverAuthUser ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={serverAuthUser.avatar}
                        alt={serverAuthUser.name}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {serverAuthUser.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                            {t.roles[serverAuthUser.role]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{serverAuthUser.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOutOfficialAccount();
                        setInfoMsg(isVi ? 'Đã đăng xuất.' : 'Signed out.');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Đăng xuất' : 'Sign Out'}</span>
                    </button>
                  </div>

                  <form
                    onSubmit={handleServerChangePassword}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      <span>{isVi ? 'Đổi Mật Khẩu Bảo Mật' : 'Change Security Password'}</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="password"
                        value={currentPasswordInput}
                        onChange={(e) => setCurrentPasswordInput(e.target.value)}
                        placeholder={isVi ? 'Mật khẩu hiện tại' : 'Current Password'}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                      <input
                        type="password"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder={isVi ? 'Mật khẩu mới (≥ 8 ký tự)' : 'New Password (≥ 8 chars)'}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isVi ? 'Cập Nhật Mật Khẩu' : 'Update Password'}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    {(['login', 'register', 'reset'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setAuthTab(tab);
                          setErrorMsg(null);
                          setInfoMsg(null);
                        }}
                        className={`py-2 rounded-lg transition-all cursor-pointer ${
                          authTab === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        {tab === 'login'
                          ? isVi
                            ? 'Đăng Nhập'
                            : 'Sign In'
                          : tab === 'register'
                          ? isVi
                            ? 'Đăng Ký'
                            : 'Register'
                          : isVi
                          ? 'Quên MK'
                          : 'Reset'}
                      </button>
                    ))}
                  </div>

                  {authTab === 'login' && (
                    <form onSubmit={handleServerLogin} className="space-y-3">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300"
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isVi ? 'Mật khẩu' : 'Password'}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                      >
                        {isVi ? 'Đăng Nhập Máy Chủ Nội Bộ' : 'Sign In (Server)'}
                      </button>

                      {demoAccounts.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setShowDemoQuickFill((p) => !p)}
                            className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>{isVi ? 'Điền nhanh tài khoản mẫu (Local Dev)' : 'Quick-fill demo accounts'}</span>
                            </span>
                            <span className="text-[11px] text-amber-600">
                              {showDemoQuickFill ? (isVi ? 'Ẩn' : 'Hide') : isVi ? 'Mở' : 'Show'}
                            </span>
                          </button>
                          {showDemoQuickFill && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              {demoAccounts.map((acc) => (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() => {
                                    setEmail(acc.email);
                                    setPassword(demoPasswordHint);
                                  }}
                                  className="text-left p-2 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 cursor-pointer"
                                >
                                  <p className="text-xs font-bold text-slate-900 truncate">{acc.name}</p>
                                  <p className="text-[10px] font-mono text-slate-500 truncate">{acc.email}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </form>
                  )}

                  {authTab === 'register' && (
                    <form onSubmit={handleServerRegister} className="space-y-3">
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={isVi ? 'Họ và tên *' : 'Full Name *'}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email *"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={isVi ? 'Mật khẩu (≥8 ký tự)' : 'Password'}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                        />
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={isVi ? 'Xác nhận mật khẩu' : 'Confirm'}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                      >
                        {isVi ? 'Đăng Ký Nội Bộ' : 'Register Locally'}
                      </button>
                    </form>
                  )}

                  {authTab === 'reset' &&
                    (resetStep === 'request' ? (
                      <form onSubmit={handleServerRequestReset} className="space-y-3">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                          className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                        >
                          {isVi ? 'Tạo Mã Khôi Phục 6 Số' : 'Generate 6-Digit Code'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleServerConfirmReset} className="space-y-3">
                        {devResetPreviewCode && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                            Code: <code className="font-mono font-extrabold">{devResetPreviewCode}</code>
                          </div>
                        )}
                        <input
                          type="text"
                          required
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          placeholder="123456"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                        />
                        <input
                          type="password"
                          required
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder={isVi ? 'Mật khẩu mới' : 'New Password'}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs cursor-pointer"
                        >
                          {isVi ? 'Xác Nhận Đặt Lại' : 'Confirm Reset'}
                        </button>
                      </form>
                    ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
