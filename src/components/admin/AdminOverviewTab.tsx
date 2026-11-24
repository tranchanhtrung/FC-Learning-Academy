import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../types';
import { isUserDisabledRecord } from '../../lib/firebase';
import {
  Users,
  Tag,
  Megaphone,
  FileCheck2,
  Sliders,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  BookOpen,
  Layers,
  ShieldCheck,
} from 'lucide-react';

interface AdminOverviewTabProps {
  onNavigateTab: (
    tab:
      | 'overview'
      | 'users'
      | 'commerce'
      | 'marketing'
      | 'materials'
      | 'settings'
      | 'permissions'
      | 'properties'
      | 'system'
      | 'dataImport'
  ) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({ onNavigateTab }) => {
  const {
    users,
    courses,
    lessonMaterials,
    siteAdminConfig,
    getMaterialApprovalStatus,
    updateUser,
    language,
    t,
    showToast,
  } = useApp();
  const isVi = language === 'vi';
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);

  const activeUsers = useMemo(() => users.filter((u) => !isUserDisabledRecord(u)), [users]);
  const roleUpgradeRequests = useMemo(
    () => activeUsers.filter((u) => u.requestedRole && u.requestedRole !== u.role),
    [activeUsers]
  );

  const pendingMaterialsCount = useMemo(
    () => lessonMaterials.filter((m) => getMaterialApprovalStatus(m) === 'pending').length,
    [lessonMaterials, getMaterialApprovalStatus]
  );

  const activeCombosCount = useMemo(
    () => (siteAdminConfig.combos || []).filter((c) => c.isActive).length,
    [siteAdminConfig.combos]
  );

  const activeAnnouncementsCount = useMemo(
    () => (siteAdminConfig.announcements || []).filter((a) => a.isActive).length,
    [siteAdminConfig.announcements]
  );

  const activeAdsCount = useMemo(
    () => (siteAdminConfig.ads || []).filter((a) => a.isActive).length,
    [siteAdminConfig.ads]
  );

  const handleApproveRequestedRole = async (userId: string, newRole: UserRole, userName: string) => {
    setApprovingUserId(userId);
    try {
      const updated = await updateUser(userId, { role: newRole, requestedRole: newRole });
      if (updated) {
        showToast(
          isVi
            ? `Đã phê duyệt vai trò ${t.roles[newRole]} cho ${userName}.`
            : `Approved role ${t.roles[newRole]} for ${userName}.`,
          'success'
        );
      }
    } finally {
      setApprovingUserId(null);
    }
  };

  const handleDismissRequestedRole = async (userId: string, currentRole: UserRole, userName: string) => {
    setApprovingUserId(userId);
    try {
      const updated = await updateUser(userId, { requestedRole: currentRole });
      if (updated) {
        showToast(
          isVi ? `Đã giữ nguyên vai trò hiện tại của ${userName}.` : `Kept current role for ${userName}.`,
          'info'
        );
      }
    } finally {
      setApprovingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('users')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-amber-400 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {isVi ? 'Nhân sự hoạt động' : 'Active Accounts'}
          </p>
          <p className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
            {activeUsers.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {roleUpgradeRequests.length > 0
              ? isVi
                ? `${roleUpgradeRequests.length} yêu cầu nâng vai trò chờ duyệt`
                : `${roleUpgradeRequests.length} role requests pending`
              : isVi
              ? 'Toàn bộ tài khoản đã phân quyền'
              : 'All accounts assigned'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('commerce')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-amber-400 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {isVi ? 'Khóa Học & Gói Combo' : 'Courses & Combos'}
          </p>
          <p className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
            {courses.length} <span className="text-sm font-bold text-amber-600">· {activeCombosCount} Combo</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {isVi
              ? `${Object.keys(siteAdminConfig.coursePrices || {}).length} khóa đã tuỳ chỉnh giá riêng`
              : `${Object.keys(siteAdminConfig.coursePrices || {}).length} custom-priced courses`}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('materials')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-amber-400 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            {pendingMaterialsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                {pendingMaterialsCount} {isVi ? 'chờ duyệt' : 'pending'}
              </span>
            ) : (
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
            )}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {isVi ? 'Kho Học Liệu & Duyệt File' : 'Learning Materials'}
          </p>
          <p className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
            {lessonMaterials.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {siteAdminConfig.general.requireMaterialApproval
              ? isVi
                ? 'Chế độ kiểm duyệt: ĐANG BẬT'
                : 'Pre-publish moderation: ON'
              : isVi
              ? 'Chế độ kiểm duyệt: Tự động duyệt'
              : 'Moderation: Auto-approve'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('marketing')}
          className="text-left bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-amber-400 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {isVi ? 'Thông Báo & Quảng Cáo' : 'Broadcasts & Ads'}
          </p>
          <p className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
            {activeAnnouncementsCount} <span className="text-sm font-bold text-purple-600">· {activeAdsCount} Banner</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {isVi ? 'Đang hiển thị trực tiếp toàn trang' : 'Live across platform surfaces'}
          </p>
        </button>
      </div>

      {/* Role Upgrade Requests Queue */}
      {roleUpgradeRequests.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-amber-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                {isVi
                  ? `Yêu Cầu Phê Duyệt Nâng Vai Trò (${roleUpgradeRequests.length})`
                  : `Pending Role Upgrade Requests (${roleUpgradeRequests.length})`}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              RBAC Queue
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {roleUpgradeRequests.map((u) => (
              <div
                key={u.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{u.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {u.email} · {u.position}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                        {t.roles[u.role]}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                        {u.requestedRole ? t.roles[u.requestedRole] : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={approvingUserId === u.id}
                    onClick={() => handleApproveRequestedRole(u.id, u.requestedRole!, u.name)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Phê Duyệt' : 'Approve'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={approvingUserId === u.id}
                    onClick={() => handleDismissRequestedRole(u.id, u.role, u.name)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Bỏ qua' : 'Dismiss'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Control Shortcuts */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <h3 className="font-extrabold text-sm text-slate-900">
            {isVi ? 'Trung Tâm Điều Khiển Nhanh Toàn Trang Web' : 'Website Control Shortcuts'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <button
            type="button"
            onClick={() => onNavigateTab('commerce')}
            className="p-4 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 text-left space-y-1.5 cursor-pointer transition-all"
          >
            <div className="font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>{isVi ? 'Khai Báo Giá Khóa Học & Combo' : 'Course Pricing & Combos'}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isVi
                ? 'Thiết lập học phí riêng cho từng khóa, tạo gói Combo nhiều khóa, mã giảm giá và duyệt đơn QR.'
                : 'Set per-course prices, create multi-course combos, manage promo vouchers, and reconcile QR orders.'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('marketing')}
            className="p-4 rounded-xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200 hover:border-purple-300 text-left space-y-1.5 cursor-pointer transition-all"
          >
            <div className="font-extrabold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-purple-600" />
              <span>{isVi ? 'Quản Lý Thông Báo & Quảng Cáo' : 'Notifications & Promo Ads'}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isVi
                ? 'Đăng thông báo ghim đầu trang, đẩy tin vào chuông thông báo và cấu hình Banner/Popup quảng cáo.'
                : 'Publish global top-bar notices, bell notifications, dashboard banners, and promo popups.'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="p-4 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 text-left space-y-1.5 cursor-pointer transition-all"
          >
            <div className="font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>{isVi ? 'Cấu Hình Website & Tài Khoản VietQR' : 'Site Branding & VietQR Bank'}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isVi
                ? 'Cập nhật số tài khoản nhận tiền VietQR, chế độ bảo trì, kiểm duyệt tài liệu và thương hiệu.'
                : 'Configure receiving VietQR bank account, maintenance mode, moderation policy, and branding.'}
            </p>
          </button>
        </div>
      </div>

      {/* Live Status Strip */}
      <div className="p-4 rounded-2xl bg-[#0A192F] text-white flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {isVi
              ? `Ngân hàng nhận thanh toán VietQR hiện tại: BIN ${siteAdminConfig.general.vietQrBankBin} · STK ${siteAdminConfig.general.vietQrAccountNo} (${siteAdminConfig.general.vietQrAccountName})`
              : `Active VietQR Bank Account: BIN ${siteAdminConfig.general.vietQrBankBin} · Acc ${siteAdminConfig.general.vietQrAccountNo} (${siteAdminConfig.general.vietQrAccountName})`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('settings')}
          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] cursor-pointer"
        >
          {isVi ? 'Chỉnh sửa ngay' : 'Edit Now'}
        </button>
      </div>
    </div>
  );
};
