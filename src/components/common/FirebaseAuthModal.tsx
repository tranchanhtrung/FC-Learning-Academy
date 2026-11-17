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
  Copy,
  RefreshCw,
  KeyRound,
  UserCog,
  ExternalLink,
  Database,
  Users,
  Sparkles,
} from 'lucide-react';

interface FirebaseAuthModalProps {
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'reset';
}

const HOTEL_PROPERTIES = [
  'Grand Horizon Saigon Hotel & Residences',
  'Royal Palm Resort & Spa Danang',
  'Marina Bay Heritage Hotel Hanoi',
  'Emerald Bay Luxury Suites Nha Trang',
  'Corporate Office – Singapore / Bangkok',
  'FC Learning Academy',
];

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({
  onClose,
  initialTab = 'login',
}) => {
  const {
    language,
    t,
    firebaseUser,
    firebaseProfile,
    dataSourceMode,
    setDataSourceMode,
    refreshFromFirestore,
    productionCounts,
    signOutOfficialAccount,
    syncAllExperienceRolesToFirestore,
    showToast,
    hasPermission,
  } = useApp();
  const isVi = language === 'vi';
  const canSeeSystemDiagnostics =
    Boolean(firebaseProfile?.isAdmin) || hasPermission('view_administration');

  const [authTab, setAuthTab] = useState<'login' | 'register' | 'reset'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [position, setPosition] = useState('Senior Accountant');
  const [property, setProperty] = useState(HOTEL_PROPERTIES[0]);
  const [requestedRole, setRequestedRole] = useState<UserRole>('learner');
  const [busy, setBusy] = useState(false);
  const [seedingRoles, setSeedingRoles] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    setAuthTab(initialTab);
    setErrorMsg(null);
    setInfoMsg(null);
  }, [initialTab]);

  // Admin promotion helper & registry list
  const [grantUid, setGrantUid] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantRole, setGrantRole] = useState<'super_admin' | 'lnd_manager'>('lnd_manager');
  const [adminEntries, setAdminEntries] = useState<
    Array<{ uid: string; email: string; role: string; grantedAt: string }>
  >([]);

  // Live Read & Write verification probe state
  const [probeBusy, setProbeBusy] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    readOk: boolean;
    writeOk: boolean;
    message: string;
    checkedAt: string;
    counts: Record<string, number>;
  } | null>(null);

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
    if (firebaseUser?.emailVerified && canSeeSystemDiagnostics) {
      runReadWriteCheck();
    } else {
      setProbeResult(null);
      setAdminEntries([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid, firebaseUser?.emailVerified, firebaseProfile?.isAdmin, canSeeSystemDiagnostics]);

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
      setErrorMsg(err?.message || 'Google Sign-In failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
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
            ? 'Tài khoản đã đăng nhập nhưng email chưa xác minh. Vui lòng kiểm tra hộp thư và bấm liên kết xác minh để kích hoạt chế độ sử dụng chính thức.'
            : 'Signed in, but your email is not verified yet. Please verify via inbox link to activate Official Production mode.'
        );
      } else {
        await activateOfficialMode(user.email);
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Email sign-in failed. Verify Email/Password provider is enabled in Firebase Console.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg(isVi ? 'Vui lòng nhập họ và tên.' : 'Please enter your full name.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setErrorMsg(
        isVi
          ? 'Vui lòng nhập email hợp lệ và mật khẩu tối thiểu 6 ký tự.'
          : 'Please provide a valid email and password (min 6 characters).'
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
            ? `Đã đăng ký tài khoản ${user.email}. Liên kết xác minh đã được gửi tới hộp thư — sau khi bấm xác minh, nhấn "Kiểm tra & Kích hoạt" bên dưới để chuyển sang sử dụng chính thức!`
            : `Registered ${user.email}. Verification link dispatched — after verifying in your inbox, click "Verify & Activate" below to enter Official Mode!`
          : isVi
          ? `Đã tạo tài khoản ${user.email}. Bấm "Gửi lại email" bên dưới để xác minh.`
          : `Account created for ${user.email}. Click resend verification email below.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg(isVi ? 'Vui lòng nhập email.' : 'Enter your email address.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await sendPasswordReset(email);
      setInfoMsg(
        isVi
          ? `Đã gửi email khôi phục mật khẩu tới ${email}.`
          : `Password reset email dispatched to ${email}.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send password reset email.');
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
          ? 'Đã gửi lại liên kết xác minh email. Sau khi xác minh, hãy bấm "Kiểm tra & Kích hoạt".'
          : 'Verification email re-sent. Click "Verify & Activate" after confirming.'
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to resend verification email.');
    } finally {
      setBusy(false);
    }
  };

  const handleReloadUser = async () => {
    if (!auth.currentUser) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      if (auth.currentUser.emailVerified) {
        await activateOfficialMode(auth.currentUser.email);
        setInfoMsg(
          isVi
            ? 'Email đã xác minh thành công và đã kích hoạt Sử Dụng Chính Thức!'
            : 'Email verified and Official Production Mode activated!'
        );
        await runReadWriteCheck();
      } else {
        setInfoMsg(isVi ? 'Email vẫn chưa được xác minh.' : 'Email is still pending verification.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Reload failed.');
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
      showToast(`Granted ${grantRole} in /admins/${grantUid.trim()}`, 'success');
      setGrantUid('');
      setGrantEmail('');
      await refreshFromFirestore();
      const list = await listAdminRegistryEntries().catch(() => []);
      setAdminEntries(list);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to write /admins registry.');
    } finally {
      setBusy(false);
    }
  };

  const handleSeedExperienceRoles = async (overwrite: boolean) => {
    setSeedingRoles(true);
    setErrorMsg(null);
    try {
      const res = await syncAllExperienceRolesToFirestore(overwrite);
      setInfoMsg(
        isVi
          ? `Đã khai báo ${INITIAL_USERS.length} hồ sơ (đủ 5 vai trò hệ thống) vào Firestore /userProfiles: ${res.createdCount} mới, ${res.updatedCount} cập nhật, ${res.adminSyncedCount} Admin.`
          : `Declared ${INITIAL_USERS.length} staff profiles (all 5 system roles) in Firestore /userProfiles: ${res.createdCount} created, ${res.updatedCount} updated.`
      );
      await runReadWriteCheck();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to declare experience roles in Firestore.');
    } finally {
      setSeedingRoles(false);
    }
  };

  const copyUid = () => {
    if (!firebaseUser?.uid) return;
    navigator.clipboard.writeText(firebaseUser.uid);
    showToast(isVi ? 'Đã sao chép Firebase UID.' : 'Copied Firebase UID.', 'info');
  };

  const activeCounts = probeResult?.counts || productionCounts || {};
  const profileCount = productionCounts?.userProfiles ?? activeCounts.userProfiles ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto text-slate-900">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#0A192F] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                {isVi
                  ? 'Tài Khoản Chính Thức & Kết Nối Firestore'
                  : 'Official Account Authentication & Firestore'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Project: {firebaseConfigSummary.projectId} &bull; DB:{' '}
                {firebaseConfigSummary.databaseId.slice(0, 26)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto text-xs text-slate-900">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{infoMsg}</span>
            </div>
          )}

          {firebaseUser ? (
            <div className="space-y-4">
              {/* Signed-In Status Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">
                      {firebaseProfile?.name || firebaseUser.displayName || firebaseUser.email}
                    </div>
                    <div className="text-slate-600">{firebaseUser.email}</div>
                    {firebaseProfile?.position && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {firebaseProfile.position} &bull; {firebaseProfile.property}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {firebaseUser.emailVerified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Pending Verification
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-md bg-[#0A192F] text-amber-400 font-bold text-[11px] uppercase">
                      {t.roles[(firebaseProfile?.role || 'learner') as UserRole]}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                    <span>UID: {firebaseUser.uid}</span>
                    <button
                      onClick={copyUid}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Copy UID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={async () => {
                      await signOutOfficialAccount();
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 font-bold text-rose-700 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Đăng xuất' : 'Sign Out'}</span>
                  </button>
                </div>

                {!firebaseUser.emailVerified && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-amber-900 font-medium">
                      {isVi
                        ? 'Firestore yêu cầu xác minh email trước khi chuyển sang chế độ Sử dụng Chính thức.'
                        : 'Firestore requires email verification before switching to Official Production mode.'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResendVerification}
                        disabled={busy}
                        className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold cursor-pointer"
                      >
                        {isVi ? 'Gửi lại email' : 'Resend Link'}
                      </button>
                      <button
                        onClick={handleReloadUser}
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0A192F] text-white font-bold cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{isVi ? 'Kiểm tra & Kích hoạt' : 'Verify & Activate'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Official Activation CTA when signed in & verified but still in Sandbox */}
              {firebaseUser.emailVerified && dataSourceMode !== 'firestore' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>
                        {isVi
                          ? 'Sẵn sàng chuyển sang Sử dụng Chính thức!'
                          : 'Ready to enter Official Production Mode!'}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {isVi
                        ? 'Kích hoạt Production Firestore Live để đọc/ghi dữ liệu trực tiếp và sử dụng đúng tài khoản đã đăng nhập.'
                        : 'Activate Production Firestore Live to read/write live data using your verified account.'}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await activateOfficialMode(firebaseUser.email);
                      await runReadWriteCheck();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold cursor-pointer shadow-xs"
                  >
                    {isVi ? 'Chuyển Sang Sử Dụng Chính Thức' : 'Switch to Official Mode'}
                  </button>
                </div>
              )}

              {/* Data Source Mode Selector */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-extrabold text-slate-900">
                  {isVi ? 'Chế Độ Nguồn Dữ Liệu LMS (Data Source Mode)' : 'Active LMS Data Source Mode'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={async () => {
                      if (!firebaseUser.emailVerified) {
                        setErrorMsg(
                          isVi
                            ? 'Cần xác minh email Firebase trước khi bật Production Firestore Live.'
                            : 'Verify your Firebase email before enabling Production Firestore Live.'
                        );
                        return;
                      }
                      await activateOfficialMode(firebaseUser.email);
                      await runReadWriteCheck();
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      dataSourceMode === 'firestore'
                        ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Production Firestore Live</span>
                      {dataSourceMode === 'firestore' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isVi
                        ? 'Chế độ chính thức: Đọc & ghi trực tiếp từ project fc-learning-academy'
                        : 'Official use: Read & persist directly in fc-learning-academy Firestore'}
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setDataSourceMode('demo');
                      showToast(
                        isVi ? 'Đã chuyển sang Demo Sandbox Dataset.' : 'Switched to Demo Sandbox Dataset.',
                        'info'
                      );
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      dataSourceMode === 'demo'
                        ? 'border-[#0A192F] bg-slate-50 ring-1 ring-[#0A192F]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900">Demo Sandbox Dataset</div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isVi
                        ? 'Sử dụng bộ dữ liệu mô phỏng nội bộ để kiểm thử nhanh'
                        : 'Use local hospitality sandbox without altering production records'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Declare All Experience Roles into Official Firestore Data */}
              {firebaseProfile?.isAdmin && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-extrabold text-slate-900">
                      <Users className="w-4 h-4 text-amber-700" />
                      <span>
                        {isVi
                          ? 'Khai Báo Toàn Bộ Vai Trò Trải Nghiệm Vào Dữ Liệu Chính Thức'
                          : 'Declare Experience Roles into Official Firestore (/userProfiles)'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white border border-amber-300 font-mono text-[11px] font-bold text-amber-900">
                      {profileCount} / {INITIAL_USERS.length}+ docs
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {isVi
                      ? `Đồng bộ đầy đủ 5 vai trò hệ thống (Quản Trị Viên Cao Cấp, Quản Lý Đào Tạo L&D, Giám Đốc Tài Chính FC, Tổng Giám Đốc GM, Học Viên) gồm ${INITIAL_USERS.length} nhân sự chuẩn vào collection /userProfiles & /admins của dự án.`
                      : `Registers all 5 system roles (Super Admin, L&D Manager, Financial Controller, General Manager, Learner) across ${INITIAL_USERS.length} staff records into Firestore /userProfiles & /admins.`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={seedingRoles}
                      onClick={() => handleSeedExperienceRoles(false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0A192F] text-amber-400 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${seedingRoles ? 'animate-spin' : ''}`} />
                      <span>
                        {isVi ? 'Khai Báo Vai Trò Còn Thiếu' : 'Seed Missing Roles'}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={seedingRoles}
                      onClick={() => handleSeedExperienceRoles(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      <span>
                        {isVi
                          ? `Cập Nhật Toàn Bộ ${INITIAL_USERS.length} Hồ Sơ`
                          : `Refresh All ${INITIAL_USERS.length} Profiles`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Live Read & Write Diagnostic Card (Admins & System Managers Only) */}
              {canSeeSystemDiagnostics && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-extrabold text-slate-900">
                      <Database className="w-4 h-4 text-emerald-700" />
                      <span>
                        {isVi
                          ? 'Trạng Thái Đọc & Ghi Trực Tiếp Firestore (Live Check)'
                          : 'Live Firestore Read & Write Readiness'}
                      </span>
                    </div>
                    <button
                      onClick={runReadWriteCheck}
                      disabled={probeBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A192F] text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${probeBusy ? 'animate-spin' : ''}`} />
                      <span>{isVi ? 'Kiểm Tra Đọc & Ghi' : 'Test Read & Write'}</span>
                    </button>
                  </div>

                  {probeResult && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                            probeResult.readOk
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {probeResult.readOk ? 'Read: OK' : 'Read: Failed'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                            probeResult.writeOk
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {probeResult.writeOk ? 'Write: OK' : 'Write: Pending / Denied'}
                        </span>
                        <span className="text-slate-600 font-mono truncate">{probeResult.message}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono tabular-nums">
                        {[
                          { label: 'Domains', val: activeCounts.competencyDomains ?? 0 },
                          { label: 'Competencies', val: activeCounts.competencies ?? 0 },
                          { label: 'Courses', val: activeCounts.courses ?? 0 },
                          { label: 'Scenarios', val: activeCounts.simulationScenarios ?? 0 },
                          { label: 'Profiles', val: profileCount },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between"
                          >
                            <span className="text-slate-500">{stat.label}</span>
                            <span className="font-bold text-slate-900">{stat.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Registry Granting UI */}
              {firebaseProfile?.isAdmin && (
                <form
                  onSubmit={handleGrantAdmin}
                  className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-extrabold text-slate-900">
                      <UserCog className="w-4 h-4 text-indigo-700" />
                      <span>
                        {isVi
                          ? 'Cấp Quyền Quản Trị (/admins/{uid})'
                          : 'Admin Registry Role Assignment (/admins/{uid})'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGrantUid(firebaseUser.uid);
                        setGrantEmail(firebaseUser.email || '');
                        setGrantRole('super_admin');
                      }}
                      className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      {isVi ? 'Điền UID của tôi' : 'Use My UID'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={grantUid}
                      onChange={(e) => setGrantUid(e.target.value)}
                      placeholder="Target Firebase UID"
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <input
                      type="email"
                      value={grantEmail}
                      onChange={(e) => setGrantEmail(e.target.value)}
                      placeholder="admin@hotel.com"
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-[11px] focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <select
                      value={grantRole}
                      onChange={(e) => setGrantRole(e.target.value as 'super_admin' | 'lnd_manager')}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold text-[11px] focus:outline-none focus:border-indigo-500"
                    >
                      <option value="lnd_manager">L&D Manager</option>
                      <option value="super_admin">Super Administrator</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-600 font-mono">
                      {adminEntries.length > 0
                        ? `${adminEntries.length} admin(s) registered in /admins`
                        : isVi
                        ? 'Tài khoản gốc tranchanhtrung@gmail.com đã tự động xác thực quyền Admin'
                        : 'Bootstrapped owner tranchanhtrung@gmail.com has active Admin rules'}
                    </span>
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-4 py-1.5 rounded-lg bg-[#0A192F] text-amber-400 font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isVi ? 'Lưu Quyền Vào Firestore' : 'Write /admins Entry'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Official Usage Note */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
                {isVi
                  ? 'Đăng nhập hoặc Đăng ký tài khoản để chuyển từ chế độ Trải nghiệm Demo sang Sử dụng Chính thức với dữ liệu thực tế lưu trực tiếp trên Firestore (fc-learning-academy).'
                  : 'Sign in or register an account to switch from Demo Sandbox to Official Production Mode backed live by Firestore (fc-learning-academy).'}
              </div>

              {/* Google Sign-In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full py-3 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isVi
                    ? 'Đăng Nhập Nhanh Bằng Google (Sử Dụng Chính Thức)'
                    : 'Sign In with Google (Official Mode)'}
                </span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[11px] font-bold uppercase text-slate-400">
                  {isVi ? 'Hoặc Email & Mật Khẩu' : 'Or Email & Password'}
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              {/* Auth Tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl font-bold">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 py-1.5 rounded-lg cursor-pointer ${
                    authTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {isVi ? 'Đăng Nhập' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className={`flex-1 py-1.5 rounded-lg cursor-pointer ${
                    authTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {isVi ? 'Đăng Ký Mới' : 'Sign Up'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('reset')}
                  className={`flex-1 py-1.5 rounded-lg cursor-pointer ${
                    authTab === 'reset' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {isVi ? 'Quên Mật Khẩu' : 'Reset Password'}
                </button>
              </div>

              {authTab === 'login' && (
                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="fc.learner@hotel.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isVi ? 'Mật khẩu' : 'Password'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    {busy ? 'Signing in...' : isVi ? 'Đăng Nhập & Chuyển Chính Thức' : 'Sign In & Activate Official Mode'}
                  </button>
                </form>
              )}

              {authTab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isVi ? 'Họ và tên' : 'Full Name'}
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Nguyễn Minh Thư"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@hotel.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isVi ? 'Chức vụ chuyên môn' : 'Job Title'}
                      </label>
                      <input
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="Senior Accountant / AFC / FC"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isVi ? 'Vai trò đăng ký (RBAC)' : 'Requested Role'}
                      </label>
                      <select
                        value={requestedRole}
                        onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold"
                      >
                        <option value="learner">{t.roles.learner}</option>
                        <option value="financial_controller">{t.roles.financial_controller}</option>
                        <option value="general_manager">{t.roles.general_manager}</option>
                        <option value="lnd_manager">{t.roles.lnd_manager}</option>
                        <option value="super_admin">{t.roles.super_admin}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isVi ? 'Khách sạn / Đơn vị' : 'Hotel / Property'}
                      </label>
                      <select
                        value={property}
                        onChange={(e) => setProperty(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                      >
                        {HOTEL_PROPERTIES.map((prop) => (
                          <option key={prop} value={prop}>
                            {prop}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {isVi ? 'Mật khẩu (tối thiểu 6 ký tự)' : 'Password (min 6 chars)'}
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {isVi
                      ? 'Lưu ý bảo mật: Tài khoản mới tự đăng ký luôn khởi tạo với quyền Learner sau khi xác minh email; Super Admin sẽ xét duyệt nâng quyền vai trò đề xuất trong Quản trị Hệ thống.'
                      : 'Security policy: Self-registered accounts initialize as Learner upon email verification; requested elevated roles are approved by Super Admin.'}
                  </p>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {isVi
                        ? 'Đăng Ký Tài Khoản Chính Thức'
                        : 'Register Official Account'}
                    </span>
                  </button>
                </form>
              )}

              {authTab === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@hotel.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isVi ? 'Gửi Email Khôi Phục Mật Khẩu' : 'Send Password Reset Email'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Spark Console Checklist (Admins & System Managers Only) */}
          {canSeeSystemDiagnostics && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Firebase Console Checklist (Spark Plan — {firebaseConfigSummary.projectId})</span>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfigSummary.projectId}/authentication/providers`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline"
                >
                  <span>Open Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  Authentication &rarr; Sign-in method: Enable <strong>Google</strong> and{' '}
                  <strong>Email/Password</strong> providers.
                </li>
                <li>
                  Authentication &rarr; Settings &rarr; Authorized domains: Verify AI Studio preview
                  domain is allowlisted.
                </li>
                <li>
                  Storage &rarr; Get started: Initialize bucket{' '}
                  <code className="font-mono">{firebaseConfigSummary.storageBucket}</code> and deploy{' '}
                  <code className="font-mono">storage.rules</code>.
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
