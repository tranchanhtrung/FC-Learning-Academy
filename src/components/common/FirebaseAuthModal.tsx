import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  auth,
  firebaseConfigSummary,
  signInWithFirebaseGoogle,
  signInWithEmail,
  registerWithEmail,
  sendPasswordReset,
  resendVerificationEmail,
  signOutFirebase,
  grantAdminRegistryEntry,
} from '../../lib/firebase';
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
} from 'lucide-react';

interface FirebaseAuthModalProps {
  onClose: () => void;
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({ onClose }) => {
  const {
    language,
    firebaseUser,
    firebaseProfile,
    dataSourceMode,
    setDataSourceMode,
    refreshFromFirestore,
    showToast,
  } = useApp();
  const isVi = language === 'vi';

  const [authTab, setAuthTab] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Admin promotion helper
  const [grantUid, setGrantUid] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantRole, setGrantRole] = useState<'super_admin' | 'lnd_manager'>('lnd_manager');

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const user = await signInWithFirebaseGoogle();
      showToast(
        isVi ? `Đã đăng nhập Google: ${user.email}` : `Signed in with Google: ${user.email}`,
        'success'
      );
      await refreshFromFirestore();
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
            ? 'Tài khoản đã đăng nhập nhưng email chưa xác minh. Vui lòng kiểm tra hộp thư và bấm liên kết xác minh để ghi/đọc dữ liệu Firestore.'
            : 'Signed in, but your email is not verified yet. Please verify via inbox link before accessing protected Firestore collections.'
        );
      } else {
        showToast(
          isVi ? `Đăng nhập thành công: ${user.email}` : `Signed in: ${user.email}`,
          'success'
        );
        await refreshFromFirestore();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Email sign-in failed. Verify Email/Password provider is enabled in Firebase Console.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const { user, verificationSent } = await registerWithEmail(email, password, displayName);
      setInfoMsg(
        verificationSent
          ? isVi
            ? `Đã tạo tài khoản ${user.email} (vai trò mặc định: Learner). Email xác minh đã được gửi!`
            : `Account created for ${user.email} (default role: Learner). Verification email sent!`
          : isVi
          ? `Đã tạo tài khoản ${user.email}. Bấm "Gửi lại email xác minh" bên dưới.`
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
          ? 'Đã gửi lại liên kết xác minh email. Sau khi xác minh, hãy bấm "Kiểm tra lại".'
          : 'Verification email re-sent. Click "Check Verification" after confirming.'
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
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      await refreshFromFirestore();
      if (auth.currentUser.emailVerified) {
        setInfoMsg(isVi ? 'Email đã được xác minh thành công!' : 'Email verified successfully!');
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
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to write /admins registry.');
    } finally {
      setBusy(false);
    }
  };

  const copyUid = () => {
    if (!firebaseUser?.uid) return;
    navigator.clipboard.writeText(firebaseUser.uid);
    showToast(isVi ? 'Đã sao chép Firebase UID.' : 'Copied Firebase UID.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#0A192F] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                {isVi ? 'Kết Nối Firebase Authentication & Firestore' : 'Firebase Authentication & Firestore Connection'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Project: {firebaseConfigSummary.projectId} &bull; Spark Plan
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

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto text-xs">
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
                      {firebaseUser.displayName || firebaseUser.email}
                    </div>
                    <div className="text-slate-600">{firebaseUser.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
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
                      {firebaseProfile?.role || 'learner'}
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
                      await signOutFirebase();
                      setDataSourceMode('demo');
                      showToast(isVi ? 'Đã đăng xuất Firebase.' : 'Signed out of Firebase.', 'info');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 font-bold text-slate-800 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Đăng xuất' : 'Sign Out'}</span>
                  </button>
                </div>

                {!firebaseUser.emailVerified && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-amber-900 font-medium">
                      {isVi
                        ? 'Firestore Security Rules yêu cầu email đã xác minh trước khi đọc/ghi dữ liệu.'
                        : 'Firestore security rules require a verified email before live reads/writes.'}
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
                        <span>{isVi ? 'Kiểm tra lại' : 'Refresh'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Source Mode Selector */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-extrabold text-slate-900">
                  {isVi ? 'Chế Độ Nguồn Dữ Liệu LMS (Data Source Mode)' : 'Active LMS Data Source Mode'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={async () => {
                      setDataSourceMode('firestore');
                      await refreshFromFirestore();
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      dataSourceMode === 'firestore'
                        ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-slate-900">Production Firestore Live</div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isVi
                        ? 'Đọc & ghi trực tiếp từ project fc-learning-academy'
                        : 'Read & persist directly in fc-learning-academy Firestore'}
                    </p>
                  </button>
                  <button
                    onClick={() => setDataSourceMode('demo')}
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

              {/* Admin Registry Granting UI (Visible for Bootstrapped Owner or Super Admins) */}
              {firebaseProfile?.isAdmin && (
                <form
                  onSubmit={handleGrantAdmin}
                  className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3"
                >
                  <div className="flex items-center gap-2 font-extrabold text-slate-900">
                    <UserCog className="w-4 h-4 text-indigo-700" />
                    <span>
                      {isVi
                        ? 'Cấp Quyền Quản Trị (/admins/{uid})'
                        : 'Admin Registry Role Assignment (/admins/{uid})'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={grantUid}
                      onChange={(e) => setGrantUid(e.target.value)}
                      placeholder="Target Firebase UID"
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-[11px]"
                      required
                    />
                    <input
                      type="email"
                      value={grantEmail}
                      onChange={(e) => setGrantEmail(e.target.value)}
                      placeholder="admin@hotel.com"
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-[11px]"
                      required
                    />
                    <select
                      value={grantRole}
                      onChange={(e) => setGrantRole(e.target.value as 'super_admin' | 'lnd_manager')}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-[11px]"
                    >
                      <option value="lnd_manager">L&D Manager</option>
                      <option value="super_admin">Super Administrator</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
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
              {/* Google Sign-In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full py-3 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-amber-400 font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isVi
                    ? 'Đăng Nhập Nhanh Bằng Google (Firebase Auth)'
                    : 'Sign In with Google (Firebase Auth)'}
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
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 py-1.5 rounded-lg cursor-pointer ${
                    authTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {isVi ? 'Đăng Nhập' : 'Sign In'}
                </button>
                <button
                  onClick={() => setAuthTab('register')}
                  className={`flex-1 py-1.5 rounded-lg cursor-pointer ${
                    authTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {isVi ? 'Đăng Ký Mới' : 'Create Account'}
                </button>
                <button
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
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300"
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
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    {busy ? 'Signing in...' : isVi ? 'Đăng Nhập Email' : 'Sign In with Email'}
                  </button>
                </form>
              )}

              {authTab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isVi ? 'Họ và tên' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nguyen Minh Thu"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isVi ? 'Mật khẩu (tối thiểu 6 ký tự)' : 'Password (min 6 characters)'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isVi ? 'Tạo Tài Khoản (Vai Trò Mặc Định: Learner)' : 'Register Account (Default: Learner)'}</span>
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
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

          {/* Spark Console Checklist */}
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
              <li>Authentication &rarr; Sign-in method: Enable <strong>Google</strong> and <strong>Email/Password</strong> providers.</li>
              <li>Authentication &rarr; Settings &rarr; Authorized domains: Verify AI Studio preview domain is allowlisted.</li>
              <li>Storage &rarr; Get started: Initialize bucket <code className="font-mono">{firebaseConfigSummary.storageBucket}</code> and deploy <code className="font-mono">storage.rules</code>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
