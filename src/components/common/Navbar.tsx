import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  ChevronDown,
  UserCheck,
  Shield,
  GraduationCap,
  Briefcase,
  Crown,
  Building2,
  Check,
  Menu,
  ShieldCheck,
  LogIn,
  LogOut,
  UserPlus,
  RotateCcw,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { FirebaseAuthModal } from './FirebaseAuthModal';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

const ROLE_ORDER: UserRole[] = [
  'super_admin',
  'lnd_manager',
  'financial_controller',
  'general_manager',
  'learner',
];

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const {
    currentUser,
    setCurrentUser,
    users,
    language,
    setLanguage,
    t,
    notifications,
    markAllNotificationsRead,
    firebaseUser,
    firebaseProfile,
    officialAuthUser,
    isPreviewingRole,
    useOfficialAccountIdentity,
    signOutOfficialAccount,
    authModalTab,
    openAuthModal,
    closeAuthModal,
    dataSourceMode,
    setDataSourceMode,
    refreshFromFirestore,
    showToast,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isVi = language === 'vi';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleIcons: Record<UserRole, React.ReactNode> = {
    super_admin: <Shield className="w-4 h-4 text-purple-400" />,
    lnd_manager: <GraduationCap className="w-4 h-4 text-blue-400" />,
    financial_controller: <Briefcase className="w-4 h-4 text-emerald-400" />,
    learner: <UserCheck className="w-4 h-4 text-amber-400" />,
    general_manager: <Crown className="w-4 h-4 text-yellow-400" />,
  };

  // Guarantee all 5 system roles appear cleanly at the top, followed by remaining declared staff
  const orderedRoleUsers = useMemo(() => {
    const pickFirstByRole: User[] = [];
    const seenIds = new Set<string>();
    if (officialAuthUser) {
      seenIds.add(officialAuthUser.id);
    }
    for (const r of ROLE_ORDER) {
      const match = users.find((u) => u.role === r && !seenIds.has(u.id));
      if (match) {
        pickFirstByRole.push(match);
        seenIds.add(match.id);
      }
    }
    const rest = users.filter((u) => !seenIds.has(u.id));
    return [...pickFirstByRole, ...rest];
  }, [users, officialAuthUser]);

  const canSwitchRoles = dataSourceMode === 'demo' || Boolean(firebaseProfile?.isAdmin);

  return (
    <header className="sticky top-0 z-40 bg-[#0A192F] text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Benchmark */}
          <div className="flex items-center gap-3">
            {onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 -ml-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#0A192F] rounded-[10px] flex items-center justify-center">
                <span
                  className="font-bold text-lg text-amber-400 tracking-wider"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  FC
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wide text-white font-sans">
                  {t.appName}
                </span>
                <span
                  className={`hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    dataSourceMode === 'firestore'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                      : 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                  }`}
                >
                  {dataSourceMode === 'firestore' ? 'CHÍNH THỨC · LIVE' : 'DEMO SANDBOX'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Official Auth Controls: Sign In / Sign Up / Status / Sign Out */}
            {firebaseUser ? (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => {
                    openAuthModal('login');
                    setShowRoleMenu(false);
                    setShowNotifications(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                    firebaseUser.emailVerified && dataSourceMode === 'firestore'
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
                      : firebaseUser.emailVerified
                      ? 'bg-slate-800/90 border-slate-600 text-amber-300 hover:bg-slate-800'
                      : 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
                  }`}
                  title={firebaseUser.email || 'Firebase Account'}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">
                    {!firebaseUser.emailVerified
                      ? isVi
                        ? 'Xác minh Email'
                        : 'Verify Email'
                      : dataSourceMode === 'firestore'
                      ? isVi
                        ? 'Chính Thức'
                        : 'Official'
                      : 'Firebase'}
                  </span>
                </button>
                <button
                  onClick={() => signOutOfficialAccount()}
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 text-xs font-bold transition-colors cursor-pointer"
                  title={isVi ? 'Đăng xuất tài khoản chính thức' : 'Sign Out'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Đăng xuất' : 'Sign Out'}</span>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => {
                    openAuthModal('login');
                    setShowRoleMenu(false);
                    setShowNotifications(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-800 text-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isVi ? 'Đăng nhập' : 'Sign In'}</span>
                </button>
                <button
                  onClick={() => {
                    openAuthModal('register');
                    setShowRoleMenu(false);
                    setShowNotifications(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Đăng ký' : 'Sign Up'}</span>
                </button>
              </div>
            )}

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setLanguage('vi')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  language === 'vi'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tiếng Việt
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowRoleMenu(false);
                }}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[#0A192F]"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {isVi ? 'Thông báo học tập' : 'Learning Notifications'}
                    </span>
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      {isVi ? 'Đã đọc tất cả' : 'Mark all read'}
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs hover:bg-slate-800/50 transition-colors ${
                          !n.read ? 'bg-slate-800/20' : ''
                        }`}
                      >
                        <p className="text-slate-200 leading-snug">{n.title}</p>
                        <span className="text-[10px] text-slate-500 mt-1 block">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Account & Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowRoleMenu(!showRoleMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 bg-slate-800/90 hover:bg-slate-800 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-400/50"
                />
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                    {currentUser.name}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-[10px] text-amber-300/90 font-medium">
                    {t.roles[currentUser.role]}
                  </div>
                </div>
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 divide-y divide-slate-800">
                  {/* Top Account Auth Section */}
                  {firebaseUser ? (
                    <div className="px-4 py-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                            {isVi ? 'Tài khoản đã đăng nhập' : 'Authenticated Account'}
                          </p>
                          <p className="text-xs font-bold text-white truncate mt-0.5">
                            {officialAuthUser?.name || firebaseUser.displayName || firebaseUser.email}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{firebaseUser.email}</p>
                        </div>
                        <button
                          onClick={async () => {
                            setShowRoleMenu(false);
                            await signOutOfficialAccount();
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-bold cursor-pointer shrink-0"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>{isVi ? 'Đăng xuất' : 'Sign Out'}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {firebaseUser.emailVerified && dataSourceMode !== 'firestore' && (
                          <button
                            onClick={async () => {
                              setDataSourceMode('firestore');
                              await refreshFromFirestore('firestore');
                              setShowRoleMenu(false);
                              showToast(
                                isVi
                                  ? 'Đã chuyển sang Sử dụng Chính thức (Firestore Live).'
                                  : 'Switched to Official Production Mode.',
                                'success'
                              );
                            }}
                            className="text-[10px] px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                          >
                            {isVi ? 'Chuyển sang Chính Thức (Live)' : 'Go Official Live'}
                          </button>
                        )}
                        {isPreviewingRole && (
                          <button
                            onClick={() => {
                              useOfficialAccountIdentity();
                              setShowRoleMenu(false);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isVi ? 'Về tài khoản của tôi' : 'My Official Account'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowRoleMenu(false);
                            openAuthModal('login');
                          }}
                          className="text-[10px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
                        >
                          {isVi ? 'Cài đặt Firebase' : 'Firebase Settings'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2.5 space-y-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          {isVi ? 'Chuyển sang sử dụng chính thức' : 'Switch to Official Production'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {isVi
                            ? 'Đăng nhập hoặc đăng ký tài khoản để lưu dữ liệu chính thức'
                            : 'Sign in or sign up to persist official records'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setShowRoleMenu(false);
                            openAuthModal('login');
                          }}
                          className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isVi ? 'Đăng nhập' : 'Sign In'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowRoleMenu(false);
                            openAuthModal('register');
                          }}
                          className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Đăng ký' : 'Sign Up'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Official / Experience Role Switcher */}
                  {canSwitchRoles && (
                    <div>
                      <div className="px-4 py-1.5 bg-slate-950/50 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          {dataSourceMode === 'firestore'
                            ? isVi
                              ? 'Vai trò đã khai báo (Firestore)'
                              : 'Declared Roles (Firestore)'
                            : isVi
                            ? 'Trải nghiệm 5 vai trò hệ thống'
                            : 'Explore 5 System Roles'}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400">
                          {orderedRoleUsers.length}
                        </span>
                      </div>
                      <div className="py-1 max-h-72 overflow-y-auto">
                        {orderedRoleUsers.map((u) => {
                          const isSelected = u.id === currentUser.id;
                          return (
                            <button
                              key={u.id}
                              onClick={() => {
                                setCurrentUser(u);
                                setShowRoleMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs hover:bg-slate-800 transition-colors cursor-pointer ${
                                isSelected ? 'bg-slate-800/80 font-medium' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-600 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-100 flex items-center gap-1.5 truncate">
                                    <span className="truncate">{u.name}</span>
                                    {roleIcons[u.role]}
                                  </p>
                                  <p className="text-[10px] text-slate-400">{t.roles[u.role]}</p>
                                  <p className="text-[10px] text-amber-400/80 truncate max-w-[180px]">
                                    {u.position}
                                  </p>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="px-4 py-2 bg-slate-950/40 text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{currentUser.property}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {authModalTab && (
        <FirebaseAuthModal
          initialTab={authModalTab}
          onClose={closeAuthModal}
        />
      )}
    </header>
  );
};
