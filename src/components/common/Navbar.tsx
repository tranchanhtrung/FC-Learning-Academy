import React, { useMemo, useState, useRef, useEffect } from 'react';
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

const FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%231E293B"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23F59E0B" font-family="sans-serif" font-weight="700" font-size="22">FC</text></svg>';

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
    serverAuthUser,
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
    systemConfig,
    refreshFromFirestore,
    showToast,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    if (!showNotifications && !showRoleMenu) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showNotifications && notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (showRoleMenu && roleRef.current && !roleRef.current.contains(target)) {
        setShowRoleMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowRoleMenu(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications, showRoleMenu]);

  const isVi = language === 'vi';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleIcons: Record<UserRole, React.ReactNode> = {
    super_admin: <Shield className="w-4 h-4 text-purple-400 shrink-0" />,
    lnd_manager: <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />,
    financial_controller: <Briefcase className="w-4 h-4 text-emerald-400 shrink-0" />,
    learner: <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />,
    general_manager: <Crown className="w-4 h-4 text-yellow-400 shrink-0" />,
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

  const isSignedIn = Boolean(serverAuthUser || firebaseUser);
  const isOfficialProduction =
    dataSourceMode === 'firestore' || !systemConfig.demoModeEnabled;
  const canSwitchRoles =
    (systemConfig.demoModeEnabled && dataSourceMode === 'demo') ||
    Boolean(firebaseProfile?.isAdmin) ||
    serverAuthUser?.role === 'super_admin' ||
    serverAuthUser?.role === 'lnd_manager';

  return (
    <header className="sticky top-0 z-40 bg-[#0A192F] text-white border-b border-slate-800 shadow-md w-full">
      {/* Full-width edge-to-edge bar stays flush with left-anchored Sidebar at all zoom levels & ultrawide screens */}
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-3 h-16">
          {/* Brand & Benchmark */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {onToggleMobileMenu && (
              <button
                data-tour="mobile-menu-btn"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer shrink-0"
                aria-label={isVi ? 'Mở menu điều hướng' : 'Open navigation menu'}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0A192F] rounded-[10px] flex items-center justify-center">
                <span className="font-serif font-bold text-base sm:text-lg text-amber-400 tracking-wider leading-none">
                  FC
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-sm sm:text-base tracking-wide text-white truncate">
                  {t.appName}
                </span>
                <span
                  className={`hidden xl:inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap shrink-0 ${
                    isOfficialProduction
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                      : 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                  }`}
                >
                  {isOfficialProduction
                    ? isVi
                      ? 'CHÍNH THỨC · LIVE'
                      : 'OFFICIAL · LIVE'
                    : isVi
                    ? 'CHẾ ĐỘ DEMO'
                    : 'DEMO SANDBOX'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xl:block truncate max-w-md">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div data-tour="navbar-auth" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Official Auth Controls: shown on md+; on smaller screens accessible via profile menu */}
            {isSignedIn ? (
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    openAuthModal('login');
                    setShowRoleMenu(false);
                    setShowNotifications(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    serverAuthUser || (firebaseUser?.emailVerified && dataSourceMode === 'firestore')
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
                      : firebaseUser?.emailVerified
                      ? 'bg-slate-800/90 border-slate-600 text-amber-300 hover:bg-slate-800'
                      : 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
                  }`}
                  title={serverAuthUser?.email || firebaseUser?.email || 'Authenticated Account'}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-[125px] truncate">
                    {serverAuthUser
                      ? isVi
                        ? 'Đã đăng nhập'
                        : 'Signed In'
                      : !firebaseUser?.emailVerified
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
                  className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  title={isVi ? 'Đăng xuất tài khoản' : 'Sign Out'}
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>{isVi ? 'Đăng xuất' : 'Sign Out'}</span>
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    openAuthModal('login');
                    setShowRoleMenu(false);
                    setShowNotifications(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-800 text-slate-100 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isVi ? 'Đăng nhập' : 'Sign In'}</span>
                </button>
                <button
                  onClick={() => {
                    openAuthModal('register');
                    setShowRoleMenu(false);
                    setShowNotifications(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span>{isVi ? 'Đăng ký' : 'Sign Up'}</span>
                </button>
              </div>
            )}

            {/* Language Switcher — compact VI/EN below xl so buttons never wrap */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs shrink-0">
              <button
                onClick={() => setLanguage('vi')}
                className={`px-2 xl:px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  language === 'vi'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                aria-label="Chuyển sang Tiếng Việt"
              >
                <span className="xl:hidden">VI</span>
                <span className="hidden xl:inline">Tiếng Việt</span>
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 xl:px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                aria-label="Switch to English"
              >
                <span className="xl:hidden">EN</span>
                <span className="hidden xl:inline">English</span>
              </button>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  setShowRoleMenu(false);
                }}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative cursor-pointer"
                aria-label={isVi ? 'Thông báo học tập' : 'Notifications'}
                aria-expanded={showNotifications}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[#0A192F]" />
                )}
              </button>

              {showNotifications && (
                <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-auto mt-1 sm:mt-2 w-[min(22rem,calc(100vw-1.5rem))] sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {isVi ? 'Thông báo học tập' : 'Learning Notifications'}
                    </span>
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                      >
                        {isVi ? 'Đã đọc tất cả' : 'Mark all read'}
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-slate-400">
                        {isVi ? 'Chưa có thông báo nào.' : 'No notifications yet.'}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs hover:bg-slate-800/50 transition-colors ${
                            !n.read ? 'bg-slate-800/20' : ''
                          }`}
                        >
                          <p className="text-slate-200 leading-snug">{n.title}</p>
                          <span className="text-[11px] text-slate-400 mt-1 block">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account & Role Switcher Dropdown */}
            <div className="relative" ref={roleRef}>
              <button
                onClick={() => {
                  setShowRoleMenu((prev) => !prev);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800/90 hover:bg-slate-800 rounded-xl border border-slate-700 transition-all cursor-pointer"
                aria-expanded={showRoleMenu}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_AVATAR;
                  }}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-400/50 shrink-0"
                />
                <div className="text-left hidden lg:block min-w-0 max-w-[155px]">
                  <div className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                    <span className="truncate">{currentUser.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                  <div className="text-[11px] text-amber-300/90 font-medium truncate">
                    {t.roles[currentUser.role]}
                  </div>
                </div>
              </button>

              {showRoleMenu && (
                <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-auto mt-1 sm:mt-2 w-[min(22rem,calc(100vw-1.5rem))] sm:w-88 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 divide-y divide-slate-800">
                  {/* Top Account Auth Section */}
                  {isSignedIn ? (
                    <div className="px-4 py-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase font-bold tracking-wider text-emerald-400">
                            {serverAuthUser
                              ? isVi
                                ? 'Phiên đăng nhập Học viện'
                                : 'Authenticated Session'
                              : isVi
                              ? 'Tài khoản Firebase'
                              : 'Authenticated Account'}
                          </p>
                          <p className="text-xs font-bold text-white truncate mt-0.5">
                            {officialAuthUser?.name || serverAuthUser?.name || firebaseUser?.displayName || firebaseUser?.email}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {serverAuthUser?.email || firebaseUser?.email}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            setShowRoleMenu(false);
                            await signOutOfficialAccount();
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-bold cursor-pointer shrink-0"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Đăng xuất' : 'Sign Out'}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {firebaseUser?.emailVerified && dataSourceMode !== 'firestore' && (
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
                            className="text-[11px] px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
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
                            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold cursor-pointer"
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
                          className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
                        >
                          {isVi ? 'Quản lý tài khoản & Bảo mật' : 'Account & Security'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2.5 space-y-2">
                      <div>
                        <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                          {isVi ? 'Chuyển sang sử dụng chính thức' : 'Switch to Official Production'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
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
                          className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isVi ? 'Đăng nhập' : 'Sign In'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowRoleMenu(false);
                            openAuthModal('register');
                          }}
                          className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isVi ? 'Đăng ký' : 'Sign Up'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Official / Experience Role Switcher */}
                  {canSwitchRoles && orderedRoleUsers.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 bg-slate-950/50 flex items-center justify-between">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                          {dataSourceMode === 'firestore'
                            ? isVi
                              ? 'Vai trò đã khai báo (Firestore)'
                              : 'Declared Roles (Firestore)'
                            : isVi
                            ? 'Trải nghiệm 5 vai trò hệ thống'
                            : 'Explore 5 System Roles'}
                        </span>
                        <span className="text-[11px] font-mono text-amber-400">
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
                                  onError={(e) => {
                                    e.currentTarget.src = FALLBACK_AVATAR;
                                  }}
                                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-600 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-100 flex items-center gap-1.5 truncate">
                                    <span className="truncate">{u.name}</span>
                                    {roleIcons[u.role]}
                                  </p>
                                  <p className="text-[11px] text-slate-400">{t.roles[u.role]}</p>
                                  <p className="text-[11px] text-amber-400/80 truncate max-w-[190px]">
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

                  <div className="px-4 py-2 bg-slate-950/40 text-[11px] text-slate-400 flex items-center gap-1.5">
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
