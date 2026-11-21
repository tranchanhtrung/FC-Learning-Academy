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

function formatFirebaseErrorVi(err: any, isVi: boolean): string {
  const code = String(err?.code || err?.message || '');
  if (code.includes('unauthorized-domain')) {
    return isVi
      ? `Tên miền "${window.location.hostname}" chưa được cấp phép trong Firebase Console (Authentication → Settings → Authorized domains). Hãy dùng tab "Tài Khoản Học Viện" bên cạnh để đăng nhập / đăng ký ngay trên máy cục bộ.`
      : `Domain "${window.location.hostname}" is not allowlisted in Firebase Console (Authentication → Settings → Authorized domains). Use the "Academy Account" tab to sign in or register locally right away.`;
  }
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return isVi ? 'Email hoặc mật khẩu Firebase không chính xác.' : 'Invalid Firebase email or password.';
  }
  if (code.includes('email-already-in-use')) {
    return isVi ? 'Email này đã tồn tại trên Firebase.' : 'This email is already registered in Firebase.';
  }
  if (code.includes('popup-closed-by-user')) {
    return isVi ? 'Bạn đã đóng cửa sổ đăng nhập Google.' : 'Google sign-in popup was closed.';
  }
  return err?.message || (isVi ? 'Thao tác Firebase thất bại.' : 'Firebase operation failed.');
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
    showToast,
    hasPermission,
  } = useApp();
  const isVi = language === 'vi';
  const canSeeSystemDiagnostics =
    Boolean(firebaseProfile?.isAdmin) || hasPermission('view_administration');

  // Dual-engine mode: 'academy' (Full-Stack Server Auth - default & always works) vs 'firebase' (Cloud Sync)
  const [providerMode, setProviderMode] = useState<'academy' | 'firebase'>(() =>
    firebaseUser && !serverAuthUser ? 'firebase' : 'academy'
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

  // Password reset & change password state (Academy Server Auth)
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCode, setResetCode] = useState('');
  const [devResetPreviewCode, setDevResetPreviewCode] = useState<string | null>(null);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Demo quick-fill accounts fetched from /api/auth/demo-accounts
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
    fetch('/api/auth/demo-accounts')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.enabled && Array.isArray(data.accounts)) {
          setDemoAccounts(data.accounts);
          setDemoPasswordHint(data.defaultPasswordHint || '');
        }
      })
      .catch(() => {});
  }, []);

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

  // Password strength indicator for Registration
  const passwordScore = (() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Za-z]/.test(password) && /\d/.test(password)) score++;
    if (/[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  // =========================================================================
  // ACADEMY SERVER AUTH HANDLERS (Full-Stack Scrypt + Signed Session Cookie)
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
    if (!email.trim()) {
      setErrorMsg(isVi ? 'Vui lòng nhập email tài khoản.' : 'Enter your email address.');
      return;
    }
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
      setInfoMsg(
        res.message ||
          (isVi
            ? 'Đã tạo mã khôi phục 6 chữ số (hiệu lực 15 phút).'
            : 'A 6-digit recovery code has been generated (valid for 15 minutes).')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleServerConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (!resetCode.trim() || newPasswordInput.length < 8) {
      setErrorMsg(
        isVi
          ? 'Nhập mã xác nhận 6 số và mật khẩu mới tối thiểu 8 ký tự (có chữ và số).'
          : 'Enter the 6-digit code and a new password (min 8 chars with letters and numbers).'
      );
      return;
    }
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
      setInfoMsg(
        isVi
          ? 'Đặt lại mật khẩu thành công! Mời bạn đăng nhập bằng mật khẩu mới.'
          : 'Password updated! Please sign in with your new password.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleServerChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (!currentPasswordInput || newPasswordInput.length < 8) {
      setErrorMsg(
        isVi
          ? 'Nhập mật khẩu hiện tại và mật khẩu mới tối thiểu 8 ký tự (gồm chữ và số).'
          : 'Provide your current password and a new password (min 8 chars with letters and numbers).'
      );
      return;
    }
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

  // =========================================================================
  // FIREBASE CLOUD AUTH HANDLERS (Optional Cloud Sync)
  // =========================================================================
  const activateOfficialMode = async (emailLabel?: string | null) => {
    setDataSourceMode('firestore');
    await refreshFromFirestore('firestore');
    showToast(
      isVi
        ? `Đã chuyển sang Sử Dụng Chính Thức (Firestore Live)${emailLabel ? `: ${emailLabel}` : ''}`
        : `Switched to Official Production Mode (Firestore Live)${emailLabel ? `: ${emailLabel}` : ''}`,
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
            ? 'Tài khoản đã đăng nhập nhưng email chưa xác minh. Vui lòng kiểm tra hộp thư để xác minh.'
            : 'Signed in, but your email is not verified yet.'
        );
      } else {
        await activateOfficialMode(user.email);
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
    } finally {
      setBusy(false);
    }
  };

  const handleFirebaseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || password.length < 6) {
      setErrorMsg(
        isVi
          ? 'Vui lòng nhập họ tên, email hợp lệ và mật khẩu tối thiểu 6 ký tự.'
          : 'Please enter full name, valid email, and password (min 6 chars).'
      );
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const { user, verificationSent } = await registerWithEmail(email, password, {
        displayName,
        position,
        department: 'Finance & Accounting',
        property,
        requestedRole,
      });
      setInfoMsg(
        verificationSent
          ? isVi
            ? `Đã đăng ký Firebase ${user.email}. Kiểm tra email xác minh rồi nhấn "Kiểm tra & Kích hoạt".`
            : `Registered ${user.email}. Verify your email then click "Verify & Activate".`
          : isVi
          ? `Đã tạo tài khoản Firebase ${user.email}.`
          : `Created Firebase account ${user.email}.`
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
          ? `Đã gửi email khôi phục mật khẩu Firebase tới ${email}.`
          : `Firebase password reset email sent to ${email}.`
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
      setInfoMsg(isVi ? 'Đã gửi lại liên kết xác minh email.' : 'Verification email re-sent.');
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
        setInfoMsg(isVi ? 'Email đã xác minh và kích hoạt Firestore Live!' : 'Verified and activated Firestore Live!');
        await runReadWriteCheck();
      } else {
        setInfoMsg(isVi ? 'Email vẫn chưa được xác minh.' : 'Email is still pending verification.');
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseErrorVi(err, isVi));
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
                {isVi ? 'Đăng Nhập & Quản Lý Tài Khoản' : 'Account Authentication & Security'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {providerMode === 'academy'
                  ? isVi
                    ? 'Xác thực Bảo mật Học viện (Scrypt + HttpOnly Cookie)'
                    : 'Academy Server Auth (Scrypt + HttpOnly Session)'
                  : `Firebase · ${firebaseConfigSummary.projectId}`}
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

        {/* Auth Provider Switcher */}
        <div className="px-5 pt-3.5 pb-2 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
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
              <span className="truncate">{isVi ? 'Tài Khoản Học Viện' : 'Academy Account'}</span>
            </button>
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
              <span className="truncate">{isVi ? 'Firebase Cloud Sync' : 'Firebase Cloud'}</span>
            </button>
          </div>
        </div>

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
          {/* MODE 1: FULL-STACK ACADEMY SERVER AUTH                            */}
          {/* ================================================================= */}
          {providerMode === 'academy' && (
            <>
              {serverAuthUser ? (
                <div className="space-y-4">
                  {/* Active Session Summary Card */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
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
                          <p className="text-[11px] text-slate-500 truncate">
                            {serverAuthUser.position} &bull; {serverAuthUser.property}
                          </p>
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
                  </div>

                  {/* Change Password Form */}
                  <form
                    onSubmit={handleServerChangePassword}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      <span>{isVi ? 'Đổi Mật Khẩu Bảo Mật' : 'Change Security Password'}</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isVi ? 'Mật khẩu hiện tại' : 'Current Password'}
                        </label>
                        <input
                          type="password"
                          value={currentPasswordInput}
                          onChange={(e) => setCurrentPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isVi ? 'Mật khẩu mới (≥ 8 ký tự)' : 'New Password (≥ 8 chars)'}
                        </label>
                        <input
                          type="password"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="Ví dụ: Finance@2026"
                          required
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {busy
                        ? isVi
                          ? 'Đang cập nhật...'
                          : 'Updating...'
                        : isVi
                        ? 'Cập Nhật Mật Khẩu'
                        : 'Update Password'}
                    </button>
                  </form>
                </div>
              ) : (
                <>
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
                        setResetStep('request');
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
                    <form onSubmit={handleServerLogin} className="space-y-3.5">
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
                            placeholder="name@grandhorizon.vn"
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
                            ? 'Đăng Nhập Hệ Thống'
                            : 'Sign In to Academy'}
                        </span>
                      </button>

                      {/* Quick-Fill Seeded Demo Accounts */}
                      {demoAccounts.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setShowDemoQuickFill((p) => !p)}
                            className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>
                                {isVi
                                  ? 'Điền nhanh 5 tài khoản mẫu (mật khẩu mặc định)'
                                  : 'Quick-fill 5 demo role accounts'}
                              </span>
                            </span>
                            <span className="text-[11px] text-amber-600">
                              {showDemoQuickFill ? (isVi ? 'Ẩn' : 'Hide') : isVi ? 'Mở' : 'Show'}
                            </span>
                          </button>
                          {showDemoQuickFill && (
                            <div className="mt-2 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <p className="text-[11px] text-slate-500 mb-2">
                                {isVi ? 'Mật khẩu mặc định:' : 'Default password:'}{' '}
                                <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-900 font-mono font-bold">
                                  {demoPasswordHint}
                                </code>
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {demoAccounts.map((acc) => (
                                  <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => {
                                      setEmail(acc.email);
                                      setPassword(demoPasswordHint);
                                      setErrorMsg(null);
                                    }}
                                    className="text-left p-2 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
                                  >
                                    <p className="text-xs font-bold text-slate-900 truncate">{acc.name}</p>
                                    <p className="text-[10px] font-semibold text-amber-700 truncate">
                                      {t.roles[acc.role]}
                                    </p>
                                    <p className="text-[10px] font-mono text-slate-500 truncate">{acc.email}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </form>
                  )}

                  {/* REGISTER FORM */}
                  {authTab === 'register' && (
                    <form onSubmit={handleServerRegister} className="space-y-3">
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
                            {isVi ? 'Mật khẩu * (≥ 8 ký tự, chữ & số)' : 'Password * (≥ 8 chars)'}
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
                            ? 'Vì lý do bảo mật RBAC, tài khoản tự đăng ký bắt đầu ở vai trò Học viên; Quản trị viên có thể phê duyệt nâng vai trò trong mục Quản Trị Hệ Thống.'
                            : 'For RBAC security, self-registered accounts start as Learner; admins can upgrade roles in System Administration.'}
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
                              ? 'Đang tạo tài khoản...'
                              : 'Creating account...'
                            : isVi
                            ? 'Đăng Ký & Đăng Nhập Ngay'
                            : 'Create Account & Sign In'}
                        </span>
                      </button>
                    </form>
                  )}

                  {/* RESET PASSWORD (2-STEP) */}
                  {authTab === 'reset' &&
                    (resetStep === 'request' ? (
                      <form onSubmit={handleServerRequestReset} className="space-y-3.5">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {isVi
                            ? 'Nhập địa chỉ email tài khoản để nhận mã xác thực 6 chữ số đặt lại mật khẩu (hiệu lực 15 phút).'
                            : 'Enter your account email to generate a 6-digit password recovery code (valid for 15 minutes).'}
                        </p>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@hotel.com"
                            className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer disabled:opacity-60"
                        >
                          {busy
                            ? isVi
                              ? 'Đang tạo mã...'
                              : 'Generating code...'
                            : isVi
                            ? 'Tạo Mã Khôi Phục 6 Số'
                            : 'Generate 6-Digit Recovery Code'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleServerConfirmReset} className="space-y-3">
                        {devResetPreviewCode && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            <span className="font-bold">
                              {isVi ? 'Mã khôi phục (Chế độ Local Dev): ' : 'Recovery Code (Local Dev): '}
                            </span>
                            <code className="px-2 py-0.5 rounded bg-amber-200/80 font-mono font-extrabold tracking-widest">
                              {devResetPreviewCode}
                            </code>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isVi ? 'Mã xác nhận 6 chữ số' : '6-Digit Recovery Code'}
                          </label>
                          <input
                            type="text"
                            required
                            value={resetCode}
                            onChange={(e) => setResetCode(e.target.value)}
                            placeholder="123456"
                            className="w-full px-3 py-2 text-xs font-mono tracking-widest rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isVi ? 'Mật khẩu mới (≥ 8 ký tự, chữ & số)' : 'New Password (≥ 8 chars)'}
                          </label>
                          <input
                            type="password"
                            required
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="Ví dụ: NewPass@2026"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setResetStep('request')}
                            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            {isVi ? 'Quay lại' : 'Back'}
                          </button>
                          <button
                            type="submit"
                            disabled={busy}
                            className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-60"
                          >
                            {isVi ? 'Xác Nhận Đặt Lại Mật Khẩu' : 'Confirm Password Reset'}
                          </button>
                        </div>
                      </form>
                    ))}
                </>
              )}
            </>
          )}

          {/* ================================================================= */}
          {/* MODE 2: OPTIONAL FIREBASE CLOUD SYNC                              */}
          {/* ================================================================= */}
          {providerMode === 'firebase' && (
            <div className="space-y-4">
              {!firebaseUser ? (
                <>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    {isVi
                      ? `Kết nối trực tiếp Firebase Project "${firebaseConfigSummary.projectId}" để đồng bộ dữ liệu Firestore Live. Lưu ý: Google Sign-In yêu cầu tên miền hiện tại (${window.location.hostname}) đã được thêm vào Firebase Console → Authorized domains.`
                      : `Connect directly to Firebase Project "${firebaseConfigSummary.projectId}" for live Firestore sync. Note: Google Sign-In requires "${window.location.hostname}" to be listed in Firebase Authorized domains.`}
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isVi ? 'Đăng Nhập Nhanh Bằng Google (Firebase)' : 'Sign In with Google (Firebase)'}</span>
                  </button>

                  <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setAuthTab('login')}
                      className={`py-1.5 rounded-lg cursor-pointer ${
                        authTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      {isVi ? 'Đăng Nhập' : 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthTab('register')}
                      className={`py-1.5 rounded-lg cursor-pointer ${
                        authTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      {isVi ? 'Đăng Ký' : 'Register'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthTab('reset')}
                      className={`py-1.5 rounded-lg cursor-pointer ${
                        authTab === 'reset' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      {isVi ? 'Quên MK' : 'Reset'}
                    </button>
                  </div>

                  {authTab === 'login' && (
                    <form onSubmit={handleFirebaseEmailLogin} className="space-y-3">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Firebase"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isVi ? 'Mật khẩu Firebase' : 'Firebase Password'}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isVi ? 'Đăng Nhập Firebase & Chuyển Live' : 'Sign In & Go Firestore Live'}
                      </button>
                    </form>
                  )}

                  {authTab === 'register' && (
                    <form onSubmit={handleFirebaseRegister} className="space-y-3">
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={isVi ? 'Họ và tên' : 'Full Name'}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Firebase"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isVi ? 'Mật khẩu (tối thiểu 6 ký tự)' : 'Password (min 6 chars)'}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isVi ? 'Đăng Ký Tài Khoản Firebase' : 'Register Firebase Account'}
                      </button>
                    </form>
                  )}

                  {authTab === 'reset' && (
                    <form onSubmit={handleFirebaseReset} className="space-y-3">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Firebase"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isVi ? 'Gửi Email Khôi Phục Firebase' : 'Send Firebase Reset Email'}
                      </button>
                    </form>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Firebase Console ({firebaseConfigSummary.projectId})</span>
                      <a
                        href={`https://console.firebase.google.com/project/${firebaseConfigSummary.projectId}/authentication/settings`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Open Console</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p>
                      {isVi
                        ? 'Để dùng Google Login trên localhost, thêm "localhost" vào Authentication → Settings → Authorized domains.'
                        : 'To use Google Sign-In locally, add "localhost" under Authentication → Settings → Authorized domains.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {firebaseUser.displayName || firebaseUser.email}
                        </p>
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

                    {!firebaseUser.emailVerified && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={handleReloadFirebaseUser}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                        >
                          {isVi ? 'Kiểm tra & Kích hoạt' : 'Verify & Activate'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={handleResendVerification}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
                        >
                          {isVi ? 'Gửi lại email xác minh' : 'Resend Verification'}
                        </button>
                      </div>
                    )}

                    {firebaseUser.emailVerified && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
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
                        {canSeeSystemDiagnostics && (
                          <button
                            type="button"
                            disabled={probeBusy}
                            onClick={runReadWriteCheck}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${probeBusy ? 'animate-spin' : ''}`} />
                            <span>{isVi ? 'Kiểm tra Read/Write' : 'Test Read/Write'}</span>
                          </button>
                        )}
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
        </div>
      </div>
    </div>
  );
};
