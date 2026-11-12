import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  Globe,
  ChevronDown,
  UserCheck,
  Shield,
  GraduationCap,
  Briefcase,
  Crown,
  Building2,
  Check,
} from 'lucide-react';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    users,
    language,
    setLanguage,
    t,
    notifications,
    markAllNotificationsRead,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleIcons: Record<UserRole, React.ReactNode> = {
    super_admin: <Shield className="w-4 h-4 text-purple-400" />,
    lnd_manager: <GraduationCap className="w-4 h-4 text-blue-400" />,
    financial_controller: <Briefcase className="w-4 h-4 text-emerald-400" />,
    learner: <UserCheck className="w-4 h-4 text-amber-400" />,
    general_manager: <Crown className="w-4 h-4 text-yellow-400" />,
  };

  const roleColors: Record<UserRole, string> = {
    super_admin: 'bg-purple-900/60 text-purple-200 border-purple-500/30',
    lnd_manager: 'bg-blue-900/60 text-blue-200 border-blue-500/30',
    financial_controller: 'bg-emerald-900/60 text-emerald-200 border-emerald-500/30',
    learner: 'bg-amber-900/60 text-amber-200 border-amber-500/30',
    general_manager: 'bg-yellow-900/60 text-yellow-200 border-yellow-500/30',
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0A192F] text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Benchmark */}
          <div className="flex items-center gap-3">
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
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
                  LMS ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
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

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {language === 'vi' ? 'Thông báo học tập' : 'Learning Notifications'}
                    </span>
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      {language === 'vi' ? 'Đã đọc tất cả' : 'Mark all read'}
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

            {/* Persona Switcher Dropdown */}
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

              {/* Role Switcher Menu */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 divide-y divide-slate-800">
                  <div className="px-4 py-2">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {language === 'vi' ? 'Chuyển đổi vai trò trải nghiệm' : 'Switch Demo Role Persona'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {language === 'vi'
                        ? 'Trải nghiệm 5 vai trò hệ thống đầy đủ phân quyền'
                        : 'Explore all 5 role-based dashboards and permissions'}
                    </p>
                  </div>

                  <div className="py-1 max-h-80 overflow-y-auto">
                    {users.slice(0, 5).map((u) => {
                      const isSelected = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            setCurrentUser(u);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-slate-800 transition-colors cursor-pointer ${
                            isSelected ? 'bg-slate-800/80 font-medium' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-600"
                            />
                            <div>
                              <p className="font-bold text-slate-100 flex items-center gap-1.5">
                                {u.name}
                                {roleIcons[u.role]}
                              </p>
                              <p className="text-[10px] text-slate-400">{t.roles[u.role]}</p>
                              <p className="text-[10px] text-amber-400/80 truncate max-w-[180px]">
                                {u.position}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>

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
    </header>
  );
};
